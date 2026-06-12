import { Router, type IRouter } from "express";
import { db, leadsTable } from "@workspace/db";

const router: IRouter = Router();
const EXPLORIUM_API_KEY = process.env.EXPLORIUM_API_KEY;
const EXPLORIUM_BASE = "https://api.explorium.ai/v1";

const headers = () => ({
  "API_KEY": EXPLORIUM_API_KEY!,
  "Content-Type": "application/json",
});

const INDUSTRY_MAP: Record<string, string> = {
  "software development": "software development",
  "information technology and services": "information technology and services",
  "internet": "internet",
  "marketing and advertising": "marketing and advertising",
  "design": "design",
  "staffing and recruiting": "staffing and recruiting",
  "e-learning": "e-learning",
  "financial services": "financial services",
};

router.post("/vibe/search", async (req, res): Promise<void> => {
  if (!EXPLORIUM_API_KEY) { res.status(500).json({ error: "EXPLORIUM_API_KEY not set" }); return; }
  const { industry = "software development", company_size = "11-50", country_code = "us", page = 1, page_size = 10 } = req.body;
  const linkedinCategory = INDUSTRY_MAP[industry] || "software development";
  try {
    const response = await fetch(`${EXPLORIUM_BASE}/businesses`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        mode: "full", size: page_size, page_size, page,
        filters: {
          country_code: { values: [country_code] },
          company_size: { values: [company_size] },
          linkedin_category: { type: "includes", values: [linkedinCategory] },
        },
      }),
    });
    if (!response.ok) { const err = await response.text(); res.status(response.status).json({ error: err }); return; }
    const data = await response.json() as any;
    res.json(data);
  } catch (err: any) {
    console.error("Vibe search error:", err?.message);
    res.status(500).json({ error: err?.message });
  }
});

router.post("/vibe/prospects", async (req, res): Promise<void> => {
  if (!EXPLORIUM_API_KEY) { res.status(500).json({ error: "EXPLORIUM_API_KEY not set" }); return; }
  const { business_ids } = req.body;
  if (!business_ids?.length) { res.status(400).json({ error: "business_ids required" }); return; }
  try {
    const response = await fetch(`${EXPLORIUM_BASE}/prospects`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        mode: "full", size: 5, page_size: 5, page: 1,
        filters: {
          business_id: { values: business_ids },
          job_level: { values: ["director", "manager", "CXO", "owner", "vp"] },
        },
      }),
    });
    if (!response.ok) { const err = await response.text(); res.status(response.status).json({ error: err }); return; }
    const data = await response.json() as any;
    res.json(data);
  } catch (err: any) {
    console.error("Vibe prospects error:", err?.message);
    res.status(500).json({ error: err?.message });
  }
});

router.post("/vibe/enrich", async (req, res): Promise<void> => {
  if (!EXPLORIUM_API_KEY) { res.status(500).json({ error: "EXPLORIUM_API_KEY not set" }); return; }
  const { prospect_id } = req.body;
  if (!prospect_id) { res.status(400).json({ error: "prospect_id required" }); return; }
  try {
    const response = await fetch(`${EXPLORIUM_BASE}/prospects/contacts_information/enrich`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ prospect_id }),
    });
    if (!response.ok) { const err = await response.text(); res.status(response.status).json({ error: err }); return; }
    const data = await response.json() as any;
    res.json(data);
  } catch (err: any) {
    console.error("Vibe enrich error:", err?.message);
    res.status(500).json({ error: err?.message });
  }
});

router.post("/vibe/import", async (req, res): Promise<void> => {
  const { companyName, contactName, contactTitle, contactEmail, contactLinkedIn, companySize, industry, sourceUrl, fitScore } = req.body;
  try {
    const [lead] = await db.insert(leadsTable).values({
      companyName, contactName: contactName || "Unknown", contactTitle, contactEmail,
      contactLinkedIn, companySize, industry, source: "linkedin", sourceUrl,
      sourceContext: `Vibe Prospecting: ${industry} company with ${companySize} employees`,
      painPoint: "other", fitScore: fitScore || 70, stage: "discovered", approved: false,
      notes: `Imported via Vibe Prospecting. Company: ${companyName}`,
    }).returning();
    res.status(201).json({ lead });
  } catch (err: any) {
    console.error("Vibe import error:", err?.message, err?.cause);
    res.status(500).json({ error: err?.message });
  }
});

export default router;
