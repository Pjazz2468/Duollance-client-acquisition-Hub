import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, leadsTable } from "@workspace/db";
import { GeneratePitchBody, ScoreLeadBody } from "@workspace/api-zod";

const router: IRouter = Router();

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

async function callGroq(messages: Array<{ role: string; content: string }>): Promise<string> {
  if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY not set");

  const res = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages,
      temperature: 0.7,
      max_tokens: 600,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq API error: ${err}`);
  }

  const data = (await res.json()) as { choices: Array<{ message: { content: string } }> };
  return data.choices[0].message.content.trim();
}

router.post("/ai/generate-pitch", async (req, res): Promise<void> => {
  const parsed = GeneratePitchBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [lead] = await db.select().from(leadsTable).where(eq(leadsTable.id, parsed.data.leadId));
  if (!lead) {
    res.status(404).json({ error: "Lead not found" });
    return;
  }

  const channel = parsed.data.channel || "linkedin";
  const channelLabel = channel === "email" ? "email" : "LinkedIn DM";

  const systemPrompt = `You are a world-class outreach copywriter for Duollance — an AI-powered freelance talent matching platform that pre-vets top-tier talent so businesses skip the back-and-forth. Your job is to write hyper-personalized, concise cold outreach messages that get replies.

Duollance's value prop: "Share your project brief, and our AI shortlists the best-fit, pre-vetted talent for you — no wading through proposals."

Write a ${channelLabel} message that:
- Opens by referencing their EXACT pain point or situation
- Is 3-5 sentences max (short and punchy)
- Ends with a single clear, low-friction CTA
- Has NO subject line
- Sounds like a real human wrote it — not a robot
- Uses placeholders like [Name] and [Their company name] where appropriate`;

  const userPrompt = `Lead details:
Company: ${lead.companyName}
Contact: ${lead.contactName} (${lead.contactTitle || "unknown title"})
Pain point: ${lead.painPoint}
Source signal: "${lead.sourceContext || "they need freelance talent help"}"
Industry: ${lead.industry || "tech"}

Write the ${channelLabel} outreach message now.`;

  const pitch = await callGroq([
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ]);

  res.json({ pitch });
});

router.post("/ai/score-lead", async (req, res): Promise<void> => {
  const parsed = ScoreLeadBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const systemPrompt = `You are a lead scoring analyst for Duollance, an AI-powered freelance talent matching platform. Score leads 1-100 based on how well Duollance can solve their problem.

High scores (80-100): Company actively struggling with freelancer hiring — ghosting, unreliable talent, too slow, or too expensive.
Medium scores (50-79): General interest in freelance talent but no urgent pain.
Low scores (1-49): Not a fit (enterprise with in-house teams, too small, irrelevant industry).

Respond ONLY in this exact JSON format:
{
  "score": <integer 1-100>,
  "reasoning": "<2 sentences max>",
  "painPointCategory": "<cost|reliability|speed|vetting|other>"
}`;

  const userPrompt = `Company: ${parsed.data.companyName}
Signal/Context: "${parsed.data.sourceContext}"
Stated pain point: ${parsed.data.painPoint}
Industry: ${parsed.data.industry || "unknown"}`;

  const raw = await callGroq([
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ]);

  let result: { score: number; reasoning: string; painPointCategory: string };
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    result = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
  } catch {
    result = { score: 50, reasoning: raw, painPointCategory: parsed.data.painPoint };
  }

  res.json(result);
});

export default router;
