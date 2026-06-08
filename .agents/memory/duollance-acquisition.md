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

## react-icons/si quirk
`SiLinkedin` does NOT exist in this version of react-icons. Use `Linkedin` from lucide-react instead. `SiReddit`, `SiX`, `SiProducthunt`, `SiIndiehackers` all work fine.

**Why:** The react-icons/si package in the installed version removed/renamed the LinkedIn icon. Lucide has a native Linkedin icon that works reliably.

## Key files
- API routes: artifacts/api-server/src/routes/{leads,outreach,ai,dashboard}.ts
- Frontend pages: artifacts/duollance-acquisition/src/pages/
- API hooks: lib/api-client-react/src/generated/api.ts
- Brand assets: artifacts/duollance-acquisition/public/logo-{white,blue,icon}.png
