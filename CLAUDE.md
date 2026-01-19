# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TrailBlazer AI is an overland route planning and trail analysis application built with Next.js 14. It uses AI to analyze trail photos for terrain conditions and helps users plan multi-day overland routes.

## Quick Start

```bash
docker compose up -d          # Start PostgreSQL (port 5433)
npx prisma migrate dev        # Run migrations (if needed)
npm run dev                   # http://localhost:3636
```

## Commands

```bash
npm run dev          # Development server (port 3636)
npm run dev:clean    # Clear .next cache and start dev server
npm run build        # Production build
npm run lint         # ESLint
npm run format       # Prettier
npx prisma studio    # Database GUI (http://localhost:5555)
npx prisma migrate dev   # Run migrations
npx prisma generate      # Regenerate Prisma client
```

Note: No test suite is configured. PostgreSQL runs on port 5433 (not default 5432).

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

### Pay-i Proxy Service (Production)

In production, AI calls route through a Python FastAPI proxy for usage instrumentation:

```
Browser → Next.js API → Pay-i Proxy (Python) → Anthropic API
                              ↓
                         Pay-i Dashboard
```

- **Proxy service**: `services/payi-proxy/` - FastAPI with Pay-i SDK instrumentation
- **Client**: `src/lib/payi-client.ts` - TypeScript client for the proxy
- **K8s manifests**: `k8s/base/payi-proxy-*.yaml`

The proxy is optional; without `PAYI_PROXY_URL`, the app calls Anthropic directly.

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
- All external API calls go through `/app/api/` routes (no direct client calls to external APIs)
- Mobile-first responsive design (Sheet for mobile nav, fixed sidebar for desktop)
- Custom colors: `trail-green`, `trail-brown`, `trail-orange`, `trail-tan`, `trail-cream`
- Cost tracking required on every model API call (stored in `AnalysisMetrics`)

## Code Style

- TypeScript strict mode; avoid `any`
- Functional components with hooks (no classes)
- Async/await over promise chains
- Tailwind utilities over custom CSS; use Tailwind's spacing scale (4, 8, 16, 24, 32)
- One component per file, default export
- Shared types in `src/lib/types.ts`
- No commented-out code (use git history)

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
PAYI_PROXY_URL                            # Pay-i proxy URL (e.g., http://payi-proxy:8000 in K8s)
PAYI_API_KEY                              # Pay-i API key for usage tracking
```

## API Documentation

Swagger/OpenAPI documentation is available at `/api-docs` when running the development server.

## Deployment

### Kubernetes (AKS)

```bash
# Deploy with Horizontal Pod Autoscaler
kubectl apply -k k8s/overlays/aks

# Check status
kubectl get pods -n trailblazer-ai
kubectl logs deployment/payi-proxy -n trailblazer-ai  # Proxy logs
```

K8s structure: `k8s/base/` contains core manifests; `k8s/overlays/` has environment-specific patches (aks, hpa, vpa).

## Session State

Check `.claude/session-state.md` for current development progress.

## Adding shadcn/ui Components

```bash
npx shadcn@latest add [component-name]
```
