# TrailBlazer AI

AI-powered overland route planning and trail analysis tool. Upload photos of trails to get terrain analysis, or plan multi-day overland routes with intelligent waypoint management.

## Features

- **Trail Photo Analysis**: Upload trail photos and get AI-powered terrain condition analysis, obstacle detection, and vehicle recommendations
- **Route Planning**: Create detailed overland routes with waypoints for campsites, water sources, fuel stops, and points of interest
- **Dashboard**: Track your planned routes, analyzed photos, and trail statistics

## Tech Stack

- Next.js 14 with App Router
- TypeScript (strict mode)
- Tailwind CSS with custom earthy color palette
- shadcn/ui components
- Responsive mobile-first design

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd trailblazer-ai
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env.local
   ```

4. Edit `.env.local` and add your API keys:
   - AI API key (OpenAI, Anthropic, or Google AI)
   - Map service token (Mapbox or Google Maps)

5. Run the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   │   ├── analyze/       # Photo analysis endpoint
│   │   └── health/        # Health check endpoint
│   ├── analyze/           # Trail photo analysis page
│   ├── dashboard/         # User dashboard page
│   ├── plan/              # Route planning page
│   ├── layout.tsx         # Root layout with sidebar
│   └── page.tsx           # Home page
├── components/
│   ├── navigation/        # Navigation components (sidebar)
│   └── ui/                # shadcn/ui components
└── lib/
    ├── types.ts           # TypeScript type definitions
    └── utils.ts           # Utility functions
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Deployment

### Vercel (Recommended)

1. Push your code to a Git repository (GitHub, GitLab, or Bitbucket)

2. Import the project in [Vercel Dashboard](https://vercel.com/new)

3. Configure environment variables in Vercel project settings

4. Deploy - Vercel automatically builds and deploys on push

The `vercel.json` configuration is included with security headers and regional settings.

### Kubernetes

1. Build the Docker image:
   ```bash
   docker build -t trailblazer-ai:latest .
   ```

2. Push to your container registry:
   ```bash
   docker tag trailblazer-ai:latest your-registry/trailblazer-ai:latest
   docker push your-registry/trailblazer-ai:latest
   ```

3. Update `k8s/base/deployment.yaml` with your image registry path

4. Configure secrets in `k8s/base/secret.yaml` with your API keys

5. Update `k8s/base/ingress.yaml` with your domain

6. Deploy using Kustomize (choose one autoscaling strategy):
   ```bash
   # With Horizontal Pod Autoscaler (scales replicas 2-10)
   kubectl apply -k k8s/overlays/hpa

   # OR with Vertical Pod Autoscaler (adjusts CPU/memory)
   kubectl apply -k k8s/overlays/vpa
   ```

7. Verify deployment:
   ```bash
   kubectl get pods -n trailblazer-ai
   kubectl get svc -n trailblazer-ai
   ```

#### Kubernetes Structure

```
k8s/
├── base/                  # Core resources
│   ├── namespace.yaml
│   ├── configmap.yaml
│   ├── secret.yaml
│   ├── deployment.yaml
│   ├── service.yaml
│   └── ingress.yaml
└── overlays/
    ├── hpa/               # Horizontal Pod Autoscaler (scale out)
    └── vpa/               # Vertical Pod Autoscaler (scale up)
```

| Overlay | Use Case |
|---------|----------|
| `hpa` | Scale replica count based on CPU/memory utilization |
| `vpa` | Auto-adjust container resource requests/limits |

## Environment Variables

See `.env.example` for all available configuration options:

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | OpenAI API key for AI analysis |
| `ANTHROPIC_API_KEY` | Anthropic API key (alternative) |
| `MAPBOX_ACCESS_TOKEN` | Mapbox token for map features |
| `DATABASE_URL` | Database connection string |

## Health Check

The `/api/health` endpoint returns application status for load balancers and Kubernetes probes:

```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 123.456,
  "environment": "production"
}
```

## License

MIT
