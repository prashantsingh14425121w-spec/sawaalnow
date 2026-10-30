# SawaalNow

Multilingual AI helpdesk agent (build#thon 2026, Idea 1). Answers only from verified circulars, cites the source, speaks and listens, falls back to SMS-style short answers and a human handoff.

## Run
```bash
npm install
cp .env.example .env.local   # add your GEMINI_API_KEY
npm run dev                  # http://localhost:3000
```
Deploy: push to GitHub, import in Vercel, set `GEMINI_API_KEY` (and optional `GEMINI_MODEL`).

## How the AI works
- `data/circulars.json` is the only knowledge source (swap in your real circulars).
- `app/api/ask/route.ts` sends all circulars + the question to Gemini with a strict system prompt and JSON output.
- Server guard: an answer is marked verified only if it cites a real circular id; otherwise it becomes a human handoff.
- Prompt-injection: the question is treated as data, length capped at 500 chars.
- Voice uses the browser Web Speech API (Chrome best). SMS and handoff are simulated; wire `app/api/handoff/route.ts` to a real SMS/WhatsApp/email provider.

## Known limits
No database, no rate limiting, retrieval sends all circulars (fine for small sets; use embeddings for large ones).
