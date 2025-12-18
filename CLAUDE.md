# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TrailBlazer AI is an overland route planning and trail analysis application built with Next.js 14. It uses AI to analyze trail photos for terrain conditions and helps users plan multi-day overland routes.

## Commands

```bash
npm run dev      # Start development server on http://localhost:3636
npm run build    # Build for production
npm run lint     # Run ESLint
npm run format   # Format code with Prettier
npm run start    # Start production server
```

### Docker Commands
```bash
docker build -t trailblazer-ai:latest .
docker run -p 3636:3636 trailblazer-ai:latest
```

### Kubernetes Commands
```bash
kubectl apply -k k8s/overlays/hpa        # Deploy with Horizontal Pod Autoscaler
kubectl apply -k k8s/overlays/vpa        # Deploy with Vertical Pod Autoscaler
kubectl get pods -n trailblazer-ai       # Check pod status
kubectl logs -n trailblazer-ai -l app.kubernetes.io/name=trailblazer-ai  # View logs
```

## Architecture

### Tech Stack
- Next.js 14 with App Router (standalone output for Docker)
- TypeScript with strict mode
- Tailwind CSS with shadcn/ui components
- Custom earthy color palette (greens, browns, oranges) defined in `src/app/globals.css`

### File Structure
- `src/app/` - Next.js App Router pages and API routes
- `src/app/api/health/` - Health check endpoint for K8s probes
- `src/components/ui/` - shadcn/ui components (Button, Card, Sheet, etc.)
- `src/components/navigation/` - Navigation sidebar component
- `src/lib/types.ts` - TypeScript type definitions for trails, routes, waypoints, and API responses
- `src/lib/utils.ts` - Utility functions including `cn()` for className merging
- `k8s/` - Kubernetes deployment manifests

### Key Patterns
- All pages use the shared layout with responsive sidebar navigation
- Mobile navigation uses Sheet component (hamburger menu)
- Desktop shows fixed sidebar (hidden on mobile via `md:` breakpoint)
- Color system uses CSS variables with HSL values for easy theming
- Custom trail colors available: `trail-green`, `trail-brown`, `trail-orange`, `trail-tan`, `trail-cream`

### Adding shadcn/ui Components
```bash
npx shadcn@latest add [component-name]
```

### Environment Variables
Copy `.env.example` to `.env.local` and configure API keys for AI services and map providers.

### Deployment
- **Vercel**: Push to Git repo, import in Vercel dashboard. Config in `vercel.json`
- **Kubernetes**: Build Docker image, push to registry, apply manifests from `k8s/` directory
