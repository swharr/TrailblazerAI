# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TrailBlazer AI is an overland route planning and trail analysis application built with Next.js 14. It uses AI to analyze trail photos for terrain conditions and helps users plan multi-day overland routes.

## Quick Start

```bash
docker compose up -d          # Start PostgreSQL
npx prisma migrate dev        # Run migrations (if needed)
npm run dev                   # http://localhost:3636
```

## Commands

```bash
npm run dev          # Development server (port 3636)
npm run build        # Production build
npm run lint         # ESLint
npm run format       # Prettier
npx prisma studio    # Database GUI
npx prisma migrate dev   # Run migrations
npx prisma generate      # Regenerate Prisma client
```

## Architecture

### Tech Stack
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS + shadcn/ui
- **Database**: PostgreSQL + Prisma ORM
- **Auth**: NextAuth.js v5 (beta) with JWT strategy
- **AI**: Anthropic Claude (trail photo analysis)
- **Dev Tooling**: Claude Code (documentation automation, code linting)

### Core Feature: Trail Photo Analysis

The main feature analyzes trail photos using AI vision models:

1. **Upload flow**: `src/components/upload/ImageUpload.tsx` → POST `/api/analyze`
2. **API route**: `src/app/api/analyze/route.ts` validates images, calls AI, parses JSON response
3. **Model client**: `src/lib/model-clients/anthropic.ts` implements `ModelProvider` interface
4. **Prompts**: `src/lib/prompts.ts` contains `buildAnalysisPrompt()` for structured JSON output
5. **Results**: `src/components/upload/TrailAnalysisResults.tsx` displays analysis

The AI returns structured JSON matching `TrailAnalysis` type in `src/lib/types.ts`.

### Model Provider Pattern

All AI providers implement `ModelProvider` interface from `src/lib/model-clients/base.ts`:
- `analyzeImage(imageBase64, prompt)` → `AnalysisResponse`
- `chat(messages, stream?)` → `ChatResponse`
- `getModelInfo()` → `ModelConfig`

To add a new provider, create a client in `src/lib/model-clients/` implementing this interface.

### Authentication

NextAuth v5 configured in `src/lib/auth.ts`:
- JWT session strategy (not database sessions)
- Providers: Credentials (email/password), Google, Apple, Passkeys (WebAuthn)
- Custom pages: `/auth/signin`, `/auth/signup`
- User roles: `user` or `admin` (stored in JWT token)

Protected API routes use `requireAuth()` from `src/lib/api-auth.ts`.

### Database Schema

```
User → Account[], Session[], Authenticator[], VehicleProfile[], TrailAnalysis[]
TrailAnalysis → AnalysisMetrics (token/cost tracking)
PlannedRoute → waypoints (JSON array)
```

### Key Patterns

- React Server Components by default; "use client" only when needed
- All external API calls go through `/app/api/` routes
- Mobile-first responsive design (Sheet for mobile nav, fixed sidebar for desktop)
- Custom colors: `trail-green`, `trail-brown`, `trail-orange`, `trail-tan`, `trail-cream`

## Code Style

- TypeScript strict mode; avoid `any`
- Functional components with hooks (no classes)
- Async/await over promise chains
- Tailwind utilities over custom CSS
- One component per file, default export
- Shared types in `src/lib/types.ts`

## Environment Variables

Required:
```bash
ANTHROPIC_API_KEY=xxx
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=xxx
NEXTAUTH_URL=http://localhost:3636
```

Optional:
```bash
GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET    # Google OAuth
APPLE_CLIENT_ID, APPLE_CLIENT_SECRET      # Apple OAuth
MAPBOX_ACCESS_TOKEN                       # Maps
PAYI_BASE_URL                             # Pay-i API base URL (e.g., https://your-app.pay-i.com)
PAYI_API_KEY                              # Pay-i API key for usage tracking
```

## API Documentation

Swagger/OpenAPI documentation is available at `/api-docs` when running the development server.

API routes are documented with JSDoc annotations that generate the OpenAPI spec.

## Session State

Check `.claude/session-state.md` for current development progress.

## Adding shadcn/ui Components

```bash
npx shadcn@latest add [component-name]
```
