# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TrailBlazer AI is an overland route planning and trail analysis application built with Next.js 14. It uses AI to analyze trail photos for terrain conditions and helps users plan multi-day overland routes.

**GitHub**: https://github.com/swharr/TrailblazerAI

## Quick Start

```bash
# 1. Start PostgreSQL database
docker compose up -d

# 2. Run database migrations (if needed)
npx prisma migrate dev

# 3. Start development server
npm run dev    # http://localhost:3636
```

## Commands

```bash
npm run dev      # Start development server on http://localhost:3636
npm run build    # Build for production
npm run lint     # Run ESLint
npm run format   # Format code with Prettier
npm run start    # Start production server
```

### Database Commands
```bash
docker compose up -d              # Start PostgreSQL
docker compose down               # Stop PostgreSQL
npx prisma migrate dev            # Run migrations
npx prisma studio                 # Open Prisma Studio (DB GUI)
npx prisma generate               # Regenerate Prisma client
```

### Docker Commands
```bash
docker build -t trailblazer-ai:latest .
docker run -p 3636:3636 trailblazer-ai:latest
```

## Architecture

### Tech Stack
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS + shadcn/ui components
- **Database**: PostgreSQL + Prisma ORM
- **Auth**: NextAuth.js v5 (beta)
- **AI**: Anthropic Claude (primary), OpenAI/Google (planned)

### File Structure
```
src/
├── app/                    # Next.js App Router
│   ├── api/
│   │   ├── analyze/        # Trail photo analysis API
│   │   ├── auth/           # NextAuth endpoints
│   │   └── health/         # K8s health check
│   ├── analyze/            # Trail analyzer page
│   ├── dashboard/          # User dashboard
│   ├── plan/               # Route planner
│   └── settings/           # User settings
├── components/
│   ├── ui/                 # shadcn/ui components
│   ├── navigation/         # Sidebar navigation
│   ├── upload/             # Image upload, vehicle form, results
│   └── auth/               # Auth forms (planned)
├── lib/
│   ├── types.ts            # TypeScript definitions
│   ├── db.ts               # Prisma client (planned)
│   ├── auth.ts             # NextAuth config (planned)
│   ├── cost-tracker.ts     # AI token/cost tracking
│   ├── prompts.ts          # AI prompt templates
│   ├── vehicle-data.ts     # Vehicle database
│   └── model-clients/      # AI provider clients
├── generated/
│   └── prisma/             # Generated Prisma client
prisma/
├── schema.prisma           # Database schema
└── migrations/             # Database migrations
```

### Database Schema
```
User (NextAuth)
├── Account (OAuth providers)
├── Session
├── VehicleProfile[] (saved vehicle configs)
└── TrailAnalysis[] (analysis history)
    └── AnalysisMetrics (token/cost tracking)
```

### Key Patterns
- All pages use shared layout with responsive sidebar
- Mobile: hamburger menu (Sheet component)
- Desktop: fixed sidebar (hidden on mobile via `md:` breakpoint)
- Color system uses CSS variables with HSL values
- Custom colors: `trail-green`, `trail-brown`, `trail-orange`, `trail-tan`, `trail-cream`

## Environment Variables

Required in `.env.local`:
```bash
ANTHROPIC_API_KEY=xxx                    # Required for AI analysis
DATABASE_URL=postgresql://...            # PostgreSQL connection
NEXTAUTH_SECRET=xxx                      # Auth session secret
NEXTAUTH_URL=http://localhost:3636       # Auth callback URL
```

Optional:
```bash
OPENAI_API_KEY=xxx                       # For GPT models
GOOGLE_AI_API_KEY=xxx                    # For Gemini models
MAPBOX_ACCESS_TOKEN=xxx                  # For maps (planned)
```

## Session State

Check `.claude/session-state.md` for current development progress and pending tasks.

## Adding Components

```bash
npx shadcn@latest add [component-name]
```

## Deployment

- **Vercel**: Push to Git, import in Vercel dashboard. Config in `vercel.json`
- **Kubernetes**: Build Docker image, apply manifests from `k8s/` directory
