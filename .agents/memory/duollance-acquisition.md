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

## Reddit blocks Replit server IPs
Reddit's JSON API (`reddit.com/r/*/new.json`) returns HTML (not JSON) from Replit's server environment — all User-Agent tricks fail. Use **HN Algolia Search API** instead (`https://hn.algolia.com/api/v1/search_by_date?query=...`) — completely open, no auth, excellent signal quality for startup/hiring signals. The Discovery feed uses 8 keyword searches across HN.

**Why:** Replit's outbound IPs are flagged by Reddit's bot detection as of 2026-06.

## zod in api-server
Zod is not a default dependency of `@workspace/api-server`. If a new route needs `z.object()`, run `pnpm --filter @workspace/api-server add zod` first — otherwise the esbuild bundle fails.

## react-icons/si quirk
`SiLinkedin` does NOT exist in this version of react-icons. Use `Linkedin` from lucide-react instead. `SiReddit`, `SiX`, `SiProducthunt`, `SiIndiehackers` all work fine.

**Why:** The react-icons/si package in the installed version removed/renamed the LinkedIn icon. Lucide has a native Linkedin icon that works reliably.

## Key files
- API routes: artifacts/api-server/src/routes/{leads,outreach,ai,dashboard}.ts
- Frontend pages: artifacts/duollance-acquisition/src/pages/
- API hooks: lib/api-client-react/src/generated/api.ts
- Brand assets: artifacts/duollance-acquisition/public/logo-{white,blue,icon}.png
