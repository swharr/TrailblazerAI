# TrailBlazer AI - Session State

Last Updated: 2026-01-15

## Current Status: WORKING
App is live at https://demoapp.t8rsk8s.io

---

## Recent Session (2026-01-15)

### Completed Work

#### User Settings Feature
- Profile management (name, image URL)
- Password change for credentials-based accounts
- Route sharing with shareable links
- Settings page UI with Profile, Security, My Routes sections
- Files: `src/app/settings/page.tsx`, `src/app/api/user/profile/route.ts`, `src/app/api/user/password/route.ts`

#### Route Sharing
- Share token generation/revocation API
- Public route viewing page (no auth required)
- Files: `src/app/api/routes/[id]/share/route.ts`, `src/app/api/routes/shared/[token]/route.ts`, `src/app/routes/shared/[token]/page.tsx`

#### Auth Fixes
- Fixed NextAuth v5 cookie name in middleware (`__Secure-authjs.session-token`)
- Added role to JWT/session for admin checks
- Admin link hidden in sidebar for non-admin users
- GitHub secrets configured
- Files: `src/lib/auth.ts`, `src/middleware.ts`, `src/types/next-auth.d.ts`, `src/components/navigation/Sidebar.tsx`

#### Database Updates
- Added `isPublic` and `shareToken` fields to PlannedRoute model
- Schema pushed to Azure PostgreSQL

### Demo User
- **Email:** demouser@icloud.com
- **Password:** R1d3th@t$h1t2026!
- **Role:** user (non-admin)

### Known Issues / TODO

#### GitHub Workflow Overwrites Secrets
The deploy-aks.yml workflow recreates secrets on every deploy. GitHub secrets are now configured, but if they get out of sync, manually patch Kubernetes secrets:
```bash
kubectl patch secret trailblazer-ai-secrets -n trailblazer-ai -p '{"data":{...}}'
```

#### Potential Improvements
- Add file upload for profile pictures (currently URL-based)
- Add email verification flow
- Add password reset flow
- Consider Azure Key Vault for secrets management

---

## Infrastructure

### Azure Resources
```
Resource Group: mrg-trailblazer-ai-demos
Location:       West US 3
ACR:            trailblazeraicr.azurecr.io
AKS:            trailblazer-aks
PostgreSQL:     trailblazer-db.postgres.database.azure.com
Ingress:        demoapp.t8rsk8s.io
```

### Secrets
All secrets backed up in `.secrets.local` (gitignored):
- DATABASE_URL (Azure PostgreSQL)
- AUTH_SECRET / NEXTAUTH_SECRET
- ANTHROPIC_API_KEY
- MAPBOX_ACCESS_TOKEN
- Demo user credentials

### GitHub Secrets (Configured)
- AUTH_SECRET
- DATABASE_URL
- ANTHROPIC_API_KEY
- MAPBOX_ACCESS_TOKEN
- AZURE_CREDENTIALS

---

## Key Files Reference

### Auth System
| File | Purpose |
|------|---------|
| `src/lib/auth.ts` | NextAuth v5 config with role in JWT |
| `src/middleware.ts` | Protected routes with correct cookie name |
| `src/types/next-auth.d.ts` | Type extensions for role |
| `src/lib/api-auth.ts` | API route auth helpers |

### User Settings
| File | Purpose |
|------|---------|
| `src/app/settings/page.tsx` | Full settings page UI |
| `src/app/api/user/profile/route.ts` | Profile GET/PATCH |
| `src/app/api/user/password/route.ts` | Password change |

### Route Sharing
| File | Purpose |
|------|---------|
| `src/app/api/routes/[id]/share/route.ts` | Generate/revoke share tokens |
| `src/app/api/routes/shared/[token]/route.ts` | Public route access |
| `src/app/routes/shared/[token]/page.tsx` | Public shared route page |

### Navigation
| File | Purpose |
|------|---------|
| `src/components/navigation/Sidebar.tsx` | Admin link hidden for non-admins |

### Deployment
| File | Purpose |
|------|---------|
| `.github/workflows/deploy-aks.yml` | CI/CD pipeline |
| `k8s/overlays/aks/` | AKS Kustomize overlay |

---

## Commands to Resume

```bash
# Start local PostgreSQL
docker compose up -d

# Start dev server
npm run dev    # http://localhost:3636

# Check production logs
kubectl logs deployment/trailblazer-ai -n trailblazer-ai --tail=50

# Fix secrets if needed
kubectl patch secret trailblazer-ai-secrets -n trailblazer-ai -p '{"data":{...}}'

# Force restart deployment
kubectl rollout restart deployment/trailblazer-ai -n trailblazer-ai
```

---

## Previous Work (Completed)

- Trail analysis feature with AI vision
- PostgreSQL + Prisma ORM
- NextAuth v5 (credentials + OAuth + passkeys)
- Security hardening (CORS, headers, rate limiting)
- AKS deployment with Spot VMs
- Mapbox integration for route planning
