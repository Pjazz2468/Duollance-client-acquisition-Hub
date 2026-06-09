import { Router, type IRouter } from "express";
import { db, leadsTable } from "@workspace/db";
import { z } from "zod";

const router: IRouter = Router();

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const X_BEARER_TOKEN = process.env.X_BEARER_TOKEN;

// ─── KEYWORDS (from duollance-lead-finder zip) ───────────────────────────────

const HIRE_INTENT = [
  "looking for a freelancer", "need a freelance", "hiring freelance", "looking to hire",
  "need help with", "seeking a designer", "need a developer", "need a copywriter",
  "looking for a virtual assistant", "need social media help", "need a content writer",
  "anyone know a good freelancer", "recommend a freelancer", "freelance help needed",
  "ISO freelancer", "ISO designer", "ISO developer",
];

const SKILL_TERMS = [
  "graphic design", "web development", "content writing", "copywriting",
  "social media management", "video editing", "SEO", "brand identity",
  "logo design", "mobile app", "wordpress", "shopify", "email marketing",
  "virtual assistant", "data entry",
];

const BOOST_TERMS = [
  "urgent", "asap", "immediately", "budget", "paid", "paying",
  "africa", "nigerian", "remote", "anywhere", "worldwide",
];

const EXCLUDE_TERMS = [
  "looking for work", "available for hire", "i am a freelancer", "hire me",
  "portfolio", "my rates", "i offer",
];

const REDDIT_SUBREDDITS = [
  "forhire", "hiring", "smallbusiness", "entrepreneur", "startups",
  "sidehustle", "WorkOnline",
];

const LINKEDIN_KEYWORDS = [
  "freelance designer", "freelance developer", "freelance writer",
  "contract designer", "contract developer",
];

const HN_SEARCH_QUERIES = [
  { query: "upwork freelancer expensive problem", weight: 3 },
  { query: "freelancer ghosted unreliable contractor", weight: 3 },
  { query: "hire developer difficult vetting", weight: 2 },
  { query: "fiverr toptal freelance quality issue", weight: 2 },
  { query: "freelance contractor scaling startup", weight: 2 },
  { query: "outsource developer agency finding talent", weight: 2 },
  { query: "hire engineer faster cheaper remote", weight: 1 },
  { query: "freelance platform alternative", weight: 1 },
];

const X_SEARCH_QUERY =
  "(looking for freelancer OR hiring freelancer OR need freelance OR ISO freelancer OR need a designer OR need a developer OR need a copywriter) -is:retweet lang:en";

// ─── LOCAL PRE-SCORER ─────────────────────────────────────────────────────────

function scorePost(text: string): { score: number; reason: string } {
  if (!text) return { score: 0, reason: "no text" };
  const lower = text.toLowerCase();

  for (const term of EXCLUDE_TERMS) {
    if (lower.includes(term)) return { score: 0, reason: `excluded: "${term}"` };
  }

  let score = 30;
  const signals: string[] = [];

  for (const term of HIRE_INTENT) {
    if (lower.includes(term)) { score += 25; signals.push(`intent: "${term}"`); break; }
  }
  for (const term of SKILL_TERMS) {
    if (lower.includes(term)) { score += 15; signals.push(`skill: "${term}"`); break; }
  }

  let boosts = 0;
  for (const term of BOOST_TERMS) {
    if (lower.includes(term) && boosts < 2) { score += 5; boosts++; signals.push(`boost: "${term}"`); }
  }

  return { score: Math.min(score, 100), reason: signals.length ? signals.join(", ") : "general match" };
}

// ─── LEAD INTERFACE ───────────────────────────────────────────────────────────

interface DiscoveredLead {
  hnId: string;
  title: string;
  body: string;
  author: string;
  url: string;
  source: string;
  platform: "hn" | "reddit" | "twitter" | "linkedin";
  type: "story" | "ask_hn" | "comment" | "show_hn" | "post" | "tweet";
  createdAt: number;
  points: number;
  localScore: number;
  fitScore: number | null;
  painPoint: string | null;
  companyHint: string | null;
  reasoning: string | null;
  qualificationStatus: "hot" | "warm" | "cold" | "pending";
}

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

// ─── HN ALGOLIA ───────────────────────────────────────────────────────────────

interface HNHit {
  objectID: string; title?: string; story_title?: string; comment_text?: string;
  story_text?: string; author: string; url?: string; story_url?: string;
  created_at_i: number; points?: number; _tags?: string[];
}

async function fetchAllHNLeads(): Promise<DiscoveredLead[]> {
  const allHits: HNHit[] = [];
  const seenIds = new Set<string>();
  const cutoff = Math.floor(Date.now() / 1000) - 60 * 60 * 24 * 60;

  await Promise.all(
    HN_SEARCH_QUERIES.map(async ({ query, weight }) => {
      try {
        const url = `https://hn.algolia.com/api/v1/search_by_date?query=${encodeURIComponent(query)}&tags=(story,ask_hn,comment)&numericFilters=created_at_i>${cutoff}&hitsPerPage=${weight * 5}`;
        const res = await fetch(url, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(8000) });
        if (!res.ok) return;
        const data = (await res.json()) as { hits: HNHit[] };
        for (const hit of data.hits ?? []) {
          if (!seenIds.has(hit.objectID)) { seenIds.add(hit.objectID); allHits.push(hit); }
        }
      } catch { /* skip */ }
    })
  );

  allHits.sort((a, b) => b.created_at_i - a.created_at_i);

  return allHits.slice(0, 15).map((h) => {
    const tags = h._tags ?? [];
    const type = tags.includes("ask_hn") ? "ask_hn" : tags.includes("show_hn") ? "show_hn" : tags.includes("comment") ? "comment" : "story";
    const source = type === "ask_hn" ? "Ask HN" : type === "show_hn" ? "Show HN" : type === "comment" ? "HN Comment" : "Hacker News";
    const title = h.title ?? h.story_title ?? `HN post by ${h.author}`;
    const body = (h.story_text ?? h.comment_text ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 600);
    const url = h.url ?? h.story_url ?? `https://news.ycombinator.com/item?id=${h.objectID}`;
    const { score } = scorePost(`${title} ${body}`);

    return {
      hnId: h.objectID, title, body, author: h.author, url, source, platform: "hn" as const,
      type: type as DiscoveredLead["type"], createdAt: h.created_at_i, points: h.points ?? 0,
      localScore: score, fitScore: null, painPoint: null, companyHint: null, reasoning: null,
      qualificationStatus: "pending" as const,
    };
  });
}

// ─── REDDIT (direct public JSON API with rotation — Apify Reddit is now paid) ─

const REDDIT_USER_AGENTS = [
  "Mozilla/5.0 (compatible; DuollanceBot/1.0; +https://duollance.com/bot)",
  "Duollance Lead Finder v1.0 (by /u/duollance_bot)",
  "Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0",
];

async function fetchRedditLeads(): Promise<DiscoveredLead[]> {
  const searchQuery = [...HIRE_INTENT.slice(0, 5), "freelancer", "hire"].map((t) => `"${t}"`).join(" OR ");
  const results: DiscoveredLead[] = [];

  for (let i = 0; i < REDDIT_SUBREDDITS.length; i++) {
    const sub = REDDIT_SUBREDDITS[i];
    const ua = REDDIT_USER_AGENTS[i % REDDIT_USER_AGENTS.length];
    try {
      const url = `https://www.reddit.com/r/${sub}/search.json?q=${encodeURIComponent(searchQuery)}&restrict_sr=true&sort=new&limit=15&t=week`;
      const res = await fetch(url, {
        headers: { "User-Agent": ua, Accept: "application/json" },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) { await sleep(1500); continue; }
      const data = (await res.json()) as { data: { children: Array<{ data: Record<string, unknown> }> } };
      const posts = data?.data?.children ?? [];

      for (const child of posts) {
        const p = child.data;
        const title = String(p.title ?? "");
        const body = String(p.selftext ?? "").slice(0, 400);
        const { score } = scorePost(`${title} ${body}`);
        if (score < 35) continue;
        const id = String(p.id ?? Math.random());
        results.push({
          hnId: `reddit_${id}`,
          title: title.slice(0, 140),
          body,
          author: String(p.author ?? "redditor"),
          url: `https://reddit.com${String(p.permalink ?? "")}`,
          source: `r/${String(p.subreddit ?? sub)}`,
          platform: "reddit",
          type: "post",
          createdAt: Math.floor(Number(p.created_utc ?? Date.now() / 1000)),
          points: Number(p.ups ?? 0),
          localScore: score,
          fitScore: null, painPoint: null, companyHint: null, reasoning: null,
          qualificationStatus: "pending",
        });
      }
      await sleep(1200);
    } catch { /* skip subreddit */ }
  }

  return results;
}

// ─── TWITTER / X (twitterapi.io — official v2 tokens are depleted) ──────────

const TWITTERAPI_KEY = process.env.TWITTERAPI_KEY;

interface TwitterApiIoTweet {
  id: string; url: string; twitterUrl?: string; text: string; createdAt: string; likeCount?: number; retweetCount?: number;
  author?: { userName?: string; name?: string; description?: string; followers?: number };
}

async function fetchTwitterLeads(): Promise<DiscoveredLead[]> {
  if (!TWITTERAPI_KEY) {
    console.warn("[X/Twitter] TWITTERAPI_KEY not set — skipping");
    return [];
  }

  try {
    const res = await fetch(
      `https://api.twitterapi.io/twitter/tweet/advanced_search?query=${encodeURIComponent(X_SEARCH_QUERY)}&queryType=Latest&count=50`,
      { headers: { "X-API-Key": TWITTERAPI_KEY }, signal: AbortSignal.timeout(12000) }
    );
    if (!res.ok) {
      console.warn("[X/Twitter] twitterapi.io error:", res.status);
      return [];
    }
    const data = (await res.json()) as { tweets?: TwitterApiIoTweet[] };
    const tweets = data.tweets ?? [];

    const results: DiscoveredLead[] = [];
    for (const tweet of tweets) {
      const { score } = scorePost(tweet.text);
      if (score < 35) continue;
      const username = tweet.author?.userName ?? "user";
      const createdAt = tweet.createdAt ? Math.floor(new Date(tweet.createdAt).getTime() / 1000) : Math.floor(Date.now() / 1000);
      results.push({
        hnId: `tweet_${tweet.id}`,
        title: tweet.text.slice(0, 120) + (tweet.text.length > 120 ? "…" : ""),
        body: tweet.text,
        author: tweet.author?.name ?? username,
        url: tweet.twitterUrl ?? tweet.url ?? `https://twitter.com/${username}/status/${tweet.id}`,
        source: "X / Twitter",
        platform: "twitter",
        type: "tweet",
        createdAt,
        points: tweet.likeCount ?? 0,
        localScore: score,
        fitScore: null, painPoint: null, companyHint: null, reasoning: null,
        qualificationStatus: "pending",
      });
    }
    return results;
  } catch (err) {
    console.error("[X/Twitter] Error:", err instanceof Error ? err.message : err);
    return [];
  }
}

// ─── LINKEDIN (public jobs-guest API, no auth) ────────────────────────────────

async function fetchLinkedInLeads(): Promise<DiscoveredLead[]> {
  const results: DiscoveredLead[] = [];

  for (const keyword of LINKEDIN_KEYWORDS) {
    try {
      const url = `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=${encodeURIComponent(keyword)}&f_JT=C&f_WT=2&start=0`;
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; DuollanceLeadFinder/1.0)",
          Accept: "text/html,application/xhtml+xml",
        },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) { await sleep(2000); continue; }
      const html = await res.text();

      // Extract job data from LinkedIn HTML cards
      const titleMatches = [...html.matchAll(/class="base-search-card__title"[^>]*>([^<]+)</g)];
      const companyMatches = [...html.matchAll(/class="base-search-card__subtitle"[^>]*>[\s\S]*?<a[^>]*>([^<]+)</g)];
      const linkMatches = [...html.matchAll(/href="(https:\/\/www\.linkedin\.com\/jobs\/view\/[^"]+)"/g)];
      const timeMatches = [...html.matchAll(/datetime="([^"]+)"/g)];

      for (let i = 0; i < Math.min(titleMatches.length, linkMatches.length); i++) {
        const title = titleMatches[i]?.[1]?.trim() ?? "";
        const company = companyMatches[i]?.[1]?.trim() ?? "";
        const jobUrl = linkMatches[i]?.[1]?.split("?")?.[0] ?? "";
        const postedAt = timeMatches[i]?.[1] ?? new Date().toISOString();

        if (!jobUrl || title.length < 3) continue;
        const { score } = scorePost(`${title} ${keyword}`);

        // Use a proper unique ID: hash of the job URL path (avoids collision on short base64 prefix)
        const jobPath = jobUrl.replace("https://www.linkedin.com/jobs/view/", "").replace(/[^a-zA-Z0-9]/g, "_");
        results.push({
          hnId: `linkedin_${jobPath.slice(0, 40)}`,
          title: title.slice(0, 120),
          body: company ? `Contract role at ${company}` : "Contract / freelance role",
          author: company || "Company",
          url: jobUrl,
          source: "LinkedIn Jobs",
          platform: "linkedin",
          type: "post",
          createdAt: Math.floor(new Date(postedAt).getTime() / 1000),
          points: 0,
          localScore: Math.max(score, 40), // already pre-filtered as contract roles
          fitScore: null, painPoint: null, companyHint: company || null, reasoning: null,
          qualificationStatus: "pending",
        });
      }

      await sleep(2000);
    } catch { /* skip keyword */ }
  }

  // Deduplicate by URL
  const seen = new Set<string>();
  return results.filter((l) => { if (seen.has(l.url)) return false; seen.add(l.url); return true; });
}

// ─── AI QUALIFICATION (Groq) ──────────────────────────────────────────────────

async function qualifyWithAI(posts: DiscoveredLead[]): Promise<DiscoveredLead[]> {
  const chunk = posts.slice(0, 15);
  if (!GROQ_API_KEY || chunk.length === 0) return chunk;

  const payload = chunk
    .map((p, i) => `[${i}] SOURCE: ${p.source}\nTITLE: ${p.title}\nBODY: ${p.body || "(no body)"}`)
    .join("\n\n---\n\n");

  const system = `You are a lead qualification analyst for Duollance, an AI-powered freelance talent matching platform.
Duollance helps businesses find pre-vetted freelancers — solving: ghosting, unreliable quality, slow hiring, expensive platforms (Upwork/Toptal/Fiverr), difficulty vetting talent.

Analyze each post (from HN, Reddit, X/Twitter, or LinkedIn Jobs) and score it as a potential business client lead.

High fit (75-100): A business/founder actively needs to hire freelancers and has a real pain point.
Medium fit (40-74): General hiring interest, mild frustration, or indirect signal.
Low fit (1-39): Developer seeking work, off-topic, or irrelevant.

Reply ONLY with valid JSON array:
[{"index":0,"fitScore":88,"painPoint":"reliability","companyHint":"early-stage SaaS","reasoning":"Founder burned by 3 Upwork contractors."},...]

painPoint: cost | reliability | speed | vetting | other | null`;

  try {
    const res = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${GROQ_API_KEY}` },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "system", content: system }, { role: "user", content: `Qualify these ${chunk.length} posts:\n\n${payload}` }],
        temperature: 0.15, max_tokens: 2000,
      }),
    });
    if (!res.ok) throw new Error("Groq failed");
    const data = (await res.json()) as { choices: Array<{ message: { content: string } }> };
    const raw = data.choices[0].message.content.trim();
    const match = raw.match(/\[[\s\S]*\]/);
    const scores: Array<{ index: number; fitScore: number; painPoint: string | null; companyHint: string | null; reasoning: string }> = match ? JSON.parse(match[0]) : [];

    return chunk.map((post, i) => {
      const s = scores.find((x) => x.index === i);
      const fitScore = s?.fitScore ?? null;
      const status: DiscoveredLead["qualificationStatus"] =
        fitScore === null ? "pending" : fitScore >= 75 ? "hot" : fitScore >= 40 ? "warm" : "cold";
      return { ...post, fitScore, painPoint: s?.painPoint ?? null, companyHint: s?.companyHint ?? null, reasoning: s?.reasoning ?? null, qualificationStatus: status };
    });
  } catch {
    return chunk;
  }
}

// ─── ROUTES ───────────────────────────────────────────────────────────────────

router.get("/discovery/feed", async (_req, res): Promise<void> => {
  const [hnLeads, redditLeads, twitterLeads, linkedInLeads] = await Promise.all([
    fetchAllHNLeads(),
    fetchRedditLeads(),
    fetchTwitterLeads(),
    fetchLinkedInLeads(),
  ]);

  // Merge and deduplicate
  const seenIds = new Set<string>();
  const all: DiscoveredLead[] = [];
  for (const lead of [...hnLeads, ...redditLeads, ...twitterLeads, ...linkedInLeads]) {
    if (!seenIds.has(lead.hnId)) { seenIds.add(lead.hnId); all.push(lead); }
  }

  // Sort by local pre-score, take top 15 for AI qualification
  all.sort((a, b) => b.localScore - a.localScore);
  const forAI = all.slice(0, 15);
  const rest = all.slice(15);

  const qualified = await qualifyWithAI(forAI);
  const unqualified = rest.map((p) => ({ ...p, qualificationStatus: "pending" as const }));

  const final = [...qualified, ...unqualified].sort((a, b) => {
    const sa = a.fitScore ?? a.localScore * 0.5;
    const sb = b.fitScore ?? b.localScore * 0.5;
    if (sb !== sa) return sb - sa;
    return b.createdAt - a.createdAt;
  });

  res.json({
    posts: final,
    total: final.length,
    fetchedAt: new Date().toISOString(),
    sources: {
      hn: hnLeads.length,
      reddit: redditLeads.length,
      twitter: twitterLeads.length,
      linkedin: linkedInLeads.length,
    },
  });
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
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const d = parsed.data;
  const companyName = d.companyHint ? d.companyHint.charAt(0).toUpperCase() + d.companyHint.slice(1) : `${d.source} Lead — ${d.author}`;
  const srcLower = d.source.toLowerCase();
  let sourceField = "indiehackers";
  if (srcLower.includes("reddit")) sourceField = "reddit";
  else if (srcLower.includes("twitter") || srcLower.includes("x /")) sourceField = "twitter";
  else if (srcLower.includes("linkedin")) sourceField = "linkedin";

  const [lead] = await db.insert(leadsTable).values({
    companyName,
    contactName: d.author,
    contactTitle: `${d.source} User`,
    source: sourceField,
    sourceUrl: d.url,
    sourceContext: d.body.slice(0, 600) || d.title,
    painPoint: (d.painPoint as "cost" | "reliability" | "speed" | "vetting" | "other" | null) ?? "other",
    fitScore: d.fitScore ?? 50,
    stage: "discovered",
    approved: false,
    notes: d.reasoning ? `AI reasoning: ${d.reasoning}` : `Imported from ${d.source}: ${d.title.slice(0, 100)}`,
  }).returning();

  res.status(201).json({ lead });
});

export default router;
