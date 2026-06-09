---
name: Duollance Client Acquisition Tool
description: Full-stack internal HR lead-discovery and AI outreach tool for Duollance
---

# Duollance Client Acquisition Tool

## Stack
- Frontend: React+Vite at artifacts/duollance-acquisition, port 20323, previewPath `/`
- Backend: Express 5 at artifacts/api-server, port 8080
- DB: PostgreSQL via Drizzle ORM (lib/db), tables: leadsTable, outreachTable
- Auth: Clerk (Google + email), keys provisioned via setupClerkWhitelabelAuth()
- AI: Groq API (llama-3.3-70b) for pitch generation and lead scoring

## Discovery sources (as of 2026-06)

### Reddit — blocked; direct API works conditionally
Reddit's JSON API is blocked by Replit's outbound IPs. The direct API (`reddit.com/r/*/search.json`) is tried with User-Agent rotation but returns 0 from Replit. No reliable workaround without a proxy. Apify's `trudax~reddit-scraper-lite` actor is now **paid** (x402 error) — do not use.

### HN — Algolia search API, no auth needed
`https://hn.algolia.com/api/v1/search_by_date?query=...` — completely open. 8 weighted keyword searches in parallel with 60-day cutoff. Yields good startup hiring signals.

### Twitter — use twitterapi.io (NOT official API v2)
Official Twitter API v2 Bearer Token is **depleted** (credits exhausted). Use `TWITTERAPI_KEY` with `https://api.twitterapi.io/twitter/tweet/advanced_search?query=...&queryType=Latest&count=50`. Header is `X-API-Key`. Response: `{ tweets: [...] }`. Tweet fields: `id, url, twitterUrl, text, createdAt, likeCount, retweetCount, author: { userName, name, description, followers }`.

**Why:** Twitter free tier credits ran out; twitterapi.io is the backup service.

### LinkedIn — public jobs-guest API, no auth
`https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=...&f_JT=C&f_WT=2&start=0` — returns HTML. Parse with regex for title, company, link, datetime. Returns ~41 contract/remote job postings per batch.

**ID collision bug fixed:** LinkedIn job URLs have a long common prefix. Using `Buffer.from(url).toString("base64").slice(0,12)` caused most IDs to collide. Fix: strip the common LinkedIn URL prefix and use `.slice(0, 40)` of the remaining unique path.

## react-icons/si quirk
`SiLinkedin` does NOT exist in this version of react-icons. Use `Linkedin` from lucide-react instead. `SiReddit`, `SiX` all work fine.

**Why:** The react-icons/si package in the installed version removed/renamed the LinkedIn icon.

## zod in api-server
Zod is not a default dependency of `@workspace/api-server`. If a new route needs `z.object()`, run `pnpm --filter @workspace/api-server add zod` first.

## Env keys (stored in artifacts/api-server/.env)
- `APIFY_KEY` — Apify token (Reddit actor now paid, LinkedIn actor available)
- `TWITTERAPI_KEY` — twitterapi.io key (USE THIS for Twitter)
- `X_BEARER_TOKEN` — Official Twitter API v2 (DEPLETED — do not use)
- `GROQ_API_KEY` — via Replit secrets (not .env)
- `GEMINI_API_KEY`, `NVIDIA_API_KEY` — via Replit secrets

## Key files
- Discovery backend: `artifacts/api-server/src/routes/discovery.ts`
- Discovery frontend: `artifacts/duollance-acquisition/src/pages/Discovery.tsx`
- API routes: artifacts/api-server/src/routes/{leads,outreach,ai,dashboard}.ts
- Frontend pages: artifacts/duollance-acquisition/src/pages/
