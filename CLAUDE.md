# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start Next.js dev server (port 3000, falls back to 3001)
npm run build        # Production build
npm run lint         # ESLint
npx tsx scripts/pipeline.ts              # Full data pipeline
npx tsx scripts/pipeline.ts --fetch      # Fetch only
npx tsx scripts/pipeline.ts --analyze    # Analyze only
npx tsx scripts/pipeline.ts --daily      # Daily update only
npx tsx scripts/<script-name>.ts         # Run any individual script
```

## Architecture

**Howard** is a financial intelligence tracker that monitors trusted sources (investors, analysts, founders) across YouTube and Substack, analyzes their content with Claude, and surfaces market sentiment, predictions, and emerging narratives.

### Stack
- Next.js 14 (App Router), TypeScript, Tailwind CSS
- Supabase (Postgres) for data storage; falls back to mock data (`src/lib/mock-data.ts`) when env vars are missing
- Claude API for content analysis, outlook generation, and signal synthesis
- Voyage AI for embeddings, YouTube Transcript API for transcripts

### Data Flow
1. **Fetch** content from YouTube/Substack/Oaktree PDFs (`src/lib/fetchers/`)
2. **Analyze** with Claude to extract sentiment, themes, predictions, key quotes (`src/lib/analysis/analyzeContent.ts`)
3. **Embed** content via Voyage AI (`src/lib/embeddings.ts`)
4. **Synthesize** into outlooks, signals, positioning, house view, and daily updates (various pipeline scripts)

### Layout
- `src/app/(main)/layout.tsx` — App shell: TickerTape + Sidebar + MainArea with context providers (DomainFilter, Search, Transition)
- Pages under `src/app/(main)/` — dashboard, feed, sources, predictions, house-view, discovery, technicals, etc.
- API routes under `src/app/api/` — server-side data access via Supabase
- `src/lib/data.ts` — Data access layer; checks `hasSupabase` flag and returns mock data if Supabase is not configured

### Key Patterns
- **Credibility scoring**: 8-dimension weighted system in `src/lib/scoring.ts` (performance=1.5, sincerity=1.4, independence=1.3 are top weights)
- **Path alias**: `@/*` maps to `./src/*`
- **Scripts directory** is excluded from tsconfig — scripts use `dotenv/config` and run standalone via `npx tsx`

## Environment Variables

See `.env.local.example`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `YOUTUBE_API_KEY`, `ANTHROPIC_API_KEY`

## Lint/Build Notes

- ESLint: underscore-prefixed unused args are allowed (`argsIgnorePattern: "^_"`)
- `pdf-parse` is in `serverComponentsExternalPackages` in `next.config.mjs`
- Fonts: Inter (`--font-main`) and JetBrains Mono (`--font-mono`) via `next/font/google`
- Dark theme with CSS custom properties in `src/app/globals.css`, accent color `#FF4800`
