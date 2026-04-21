# PassExamAI

Upload an exam paper. Get a personalized study plan, AI-generated lessons, exercises, and mock exams — all grounded in your own documents.

Built for **GCD4F 2026** · AI for Education · SDG 4

---

## Stack

**Backend** — FastAPI, Supabase (PostgreSQL + pgvector), Groq (LLaMA 3.3), Jina embeddings, LlamaParse, Tavily, Firecrawl

**Frontend** — Next.js 14, TypeScript, Tailwind CSS

---

## Getting started

```bash
# Backend
cd backend && cp .env.example .env
uv sync
uv run uvicorn app.main:app --reload

# Frontend
cd frontend && cp .env.example .env.local
npm install && npm run dev
```

Run the SQL migration in your Supabase SQL Editor before starting.

---

## Environment

See `.env.example` in each package for the required keys (Supabase, Groq, Jina, Tavily, Firecrawl, LlamaParse).

---

## License

MIT