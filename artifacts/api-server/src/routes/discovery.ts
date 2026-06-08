import { Router, type IRouter } from "express";
import { db, leadsTable } from "@workspace/db";
import { z } from "zod";

const router: IRouter = Router();

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

// HN Algolia API — open, no auth needed, excellent signal quality
const HN_SEARCH_URL = "https://hn.algolia.com/api/v1/search";
const HN_SEARCH_RECENT = "https://hn.algolia.com/api/v1/search_by_date";

const SEARCH_QUERIES = [
  { query: "upwork freelancer expensive problem", weight: 3 },
  { query: "freelancer ghosted unreliable contractor", weight: 3 },
  { query: "hire developer difficult vetting", weight: 2 },
  { query: "fiverr toptal freelance quality issue", weight: 2 },
  { query: "freelance contractor scaling startup", weight: 2 },
  { query: "outsource developer agency finding talent", weight: 2 },
  { query: "hire engineer faster cheaper remote", weight: 1 },
  { query: "freelance platform alternative", weight: 1 },
];

interface HNHit {
  objectID: string;
  title?: string;
  story_title?: string;
  comment_text?: string;
  story_text?: string;
  author: string;
  url?: string;
  story_url?: string;
  created_at_i: number;
  points?: number;
  num_comments?: number;
  _tags?: string[];
}

interface DiscoveredLead {
  hnId: string;
  title: string;
  body: string;
  author: string;
  url: string;
  source: string;
  type: "story" | "ask_hn" | "comment" | "show_hn";
  createdAt: number;
  points: number;
  fitScore: number | null;
  painPoint: string | null;
  companyHint: string | null;
  reasoning: string | null;
  qualificationStatus: "hot" | "warm" | "cold" | "pending";
}

async function fetchHNResults(
  query: string,
  recent = false,
  numResults = 10
): Promise<HNHit[]> {
  try {
    const baseUrl = recent ? HN_SEARCH_RECENT : HN_SEARCH_URL;
    const cutoffTime = Math.floor(Date.now() / 1000) - 60 * 60 * 24 * 60; // 60 days
    const url = `${baseUrl}?query=${encodeURIComponent(query)}&tags=(story,ask_hn,comment)&numericFilters=created_at_i>${cutoffTime}&hitsPerPage=${numResults}`;

    const res = await fetch(url, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { hits: HNHit[] };
    return data.hits ?? [];
  } catch {
    return [];
  }
}

function getPostTitle(hit: HNHit): string {
  return hit.title ?? hit.story_title ?? `HN post by ${hit.author}`;
}

function getPostBody(hit: HNHit): string {
  const text = hit.story_text ?? hit.comment_text ?? "";
  // Strip HTML tags
  return text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 600);
}

function getPostUrl(hit: HNHit): string {
  if (hit.url) return hit.url;
  if (hit.story_url) return hit.story_url;
  return `https://news.ycombinator.com/item?id=${hit.objectID}`;
}

function getPostType(hit: HNHit): DiscoveredLead["type"] {
  const tags = hit._tags ?? [];
  if (tags.includes("ask_hn")) return "ask_hn";
  if (tags.includes("show_hn")) return "show_hn";
  if (tags.includes("comment")) return "comment";
  return "story";
}

function getSourceLabel(hit: HNHit): string {
  const type = getPostType(hit);
  if (type === "ask_hn") return "Ask HN";
  if (type === "show_hn") return "Show HN";
  if (type === "comment") return "HN Comment";
  return "Hacker News";
}

async function qualifyPostsWithAI(posts: HNHit[]): Promise<DiscoveredLead[]> {
  const chunk = posts.slice(0, 10);

  if (!GROQ_API_KEY || chunk.length === 0) {
    return chunk.map((h) => ({
      hnId: h.objectID,
      title: getPostTitle(h),
      body: getPostBody(h),
      author: h.author,
      url: getPostUrl(h),
      source: getSourceLabel(h),
      type: getPostType(h),
      createdAt: h.created_at_i,
      points: h.points ?? 0,
      fitScore: null,
      painPoint: null,
      companyHint: null,
      reasoning: null,
      qualificationStatus: "pending",
    }));
  }

  const postsPayload = chunk
    .map(
      (h, i) =>
        `[${i}] TITLE: ${getPostTitle(h)}\nBODY: ${getPostBody(h) || "(no body)"}`
    )
    .join("\n\n---\n\n");

  const systemPrompt = `You are a lead qualification analyst for Duollance, an AI-powered freelance talent matching platform. 
Duollance helps businesses find pre-vetted freelancers — solving pain points like: ghosting, unreliable quality, slow hiring, expensive platforms (Upwork/Toptal/Fiverr), difficulty vetting talent.

Analyze each Hacker News post and score it as a potential business client lead.

High fit (score 75-100): Post shows a company/founder with genuine pain around freelancer hiring — unreliable devs, bad platform experiences, scaling needs, vetting difficulties.
Medium fit (score 40-74): General hiring interest or mild freelance frustration without urgency.
Low fit (score 1-39): Individual developer seeking work, off-topic, purely technical, or completely irrelevant to hiring.

Reply ONLY with a valid JSON array, one entry per post index. Example:
[
  {"index": 0, "fitScore": 88, "painPoint": "reliability", "companyHint": "early-stage SaaS startup", "reasoning": "Founder describes getting burned by 3 Upwork contractors in a row — textbook Duollance problem."},
  {"index": 1, "fitScore": 15, "painPoint": null, "companyHint": null, "reasoning": "This is a developer asking for portfolio advice, not a business hiring."}
]

painPoint must be one of: cost, reliability, speed, vetting, other, or null if not applicable.`;

  try {
    const res = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Qualify these ${chunk.length} HN posts:\n\n${postsPayload}`,
          },
        ],
        temperature: 0.15,
        max_tokens: 1500,
      }),
    });

    if (!res.ok) throw new Error("Groq API failed");
    const data = (await res.json()) as { choices: Array<{ message: { content: string } }> };
    const raw = data.choices[0].message.content.trim();

    let scores: Array<{
      index: number;
      fitScore: number;
      painPoint: string | null;
      companyHint: string | null;
      reasoning: string;
    }> = [];

    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (jsonMatch) scores = JSON.parse(jsonMatch[0]);

    return chunk.map((h, i) => {
      const score = scores.find((s) => s.index === i);
      const fitScore = score?.fitScore ?? null;
      const status: DiscoveredLead["qualificationStatus"] =
        fitScore === null
          ? "pending"
          : fitScore >= 75
          ? "hot"
          : fitScore >= 40
          ? "warm"
          : "cold";

      return {
        hnId: h.objectID,
        title: getPostTitle(h),
        body: getPostBody(h),
        author: h.author,
        url: getPostUrl(h),
        source: getSourceLabel(h),
        type: getPostType(h),
        createdAt: h.created_at_i,
        points: h.points ?? 0,
        fitScore,
        painPoint: score?.painPoint ?? null,
        companyHint: score?.companyHint ?? null,
        reasoning: score?.reasoning ?? null,
        qualificationStatus: status,
      };
    });
  } catch {
    return chunk.map((h) => ({
      hnId: h.objectID,
      title: getPostTitle(h),
      body: getPostBody(h),
      author: h.author,
      url: getPostUrl(h),
      source: getSourceLabel(h),
      type: getPostType(h),
      createdAt: h.created_at_i,
      points: h.points ?? 0,
      fitScore: null,
      painPoint: null,
      companyHint: null,
      reasoning: null,
      qualificationStatus: "pending" as const,
    }));
  }
}

router.get("/discovery/feed", async (_req, res): Promise<void> => {
  const allHits: HNHit[] = [];
  const seenIds = new Set<string>();

  await Promise.all(
    SEARCH_QUERIES.map(async ({ query, weight }) => {
      const hits = await fetchHNResults(query, true, weight * 5);
      for (const hit of hits) {
        if (!seenIds.has(hit.objectID)) {
          seenIds.add(hit.objectID);
          allHits.push(hit);
        }
      }
    })
  );

  // Sort by recency first
  allHits.sort((a, b) => b.created_at_i - a.created_at_i);

  // Take top 20 for AI qualification
  const topHits = allHits.slice(0, 20);
  const qualified = await qualifyPostsWithAI(topHits);

  // Sort by fit score descending, then by recency
  const sorted = qualified.sort((a, b) => {
    const sa = a.fitScore ?? 0;
    const sb = b.fitScore ?? 0;
    if (sb !== sa) return sb - sa;
    return b.createdAt - a.createdAt;
  });

  res.json({ posts: sorted, total: sorted.length, fetchedAt: new Date().toISOString() });
});

const ImportLeadBody = z.object({
  hnId: z.string(),
  title: z.string(),
  body: z.string(),
  author: z.string(),
  url: z.string(),
  source: z.string(),
  fitScore: z.number().nullable().optional(),
  painPoint: z.string().nullable().optional(),
  companyHint: z.string().nullable().optional(),
  reasoning: z.string().nullable().optional(),
});

router.post("/discovery/import", async (req, res): Promise<void> => {
  const parsed = ImportLeadBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const d = parsed.data;

  const companyName = d.companyHint
    ? d.companyHint.charAt(0).toUpperCase() + d.companyHint.slice(1)
    : `HN Lead — ${d.author}`;

  const [lead] = await db
    .insert(leadsTable)
    .values({
      companyName,
      contactName: d.author,
      contactTitle: "HN User",
      source: "indiehackers",
      sourceUrl: d.url,
      sourceContext: d.body.slice(0, 600) || d.title,
      painPoint:
        (d.painPoint as "cost" | "reliability" | "speed" | "vetting" | "other" | null) ?? "other",
      fitScore: d.fitScore ?? 50,
      stage: "discovered",
      approved: false,
      notes: d.reasoning
        ? `AI reasoning: ${d.reasoning}`
        : `Imported from Hacker News: ${d.title.slice(0, 100)}`,
    })
    .returning();

  res.status(201).json({ lead });
});

export default router;
