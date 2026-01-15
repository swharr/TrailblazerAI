# TrailBlazer AI - Session State

> Last updated: 2026-01-14
> Session: AKS Deployment Setup with Spot VMs

## Current Task
Deploying TrailBlazer AI to Azure Kubernetes Service (AKS) with Spot VMs

## Status: WAITING ON AZURE LOGIN
User needs to switch Azure subscription/login to one with permission to create resource groups.

**Next step:** Run `./scripts/azure-setup.sh` after logging in with appropriate permissions.

---

## AKS Deployment - What's Been Created

### Scripts
| File | Purpose |
|------|---------|
| `scripts/azure-setup.sh` | Creates ACR, AKS with Spot node pool, NGINX ingress |
| `scripts/setup-github-secrets.sh` | Generates Azure credentials for GitHub Actions |

### Kubernetes (AKS overlay with Spot support)
| File | Purpose |
|------|---------|
| `k8s/overlays/aks/kustomization.yaml` | Kustomize config pointing to ACR |
| `k8s/overlays/aks/ingress-patch.yaml` | NGINX ingress with SSL settings |
| `k8s/overlays/aks/deployment-patch.yaml` | Spot VM tolerations + node affinity |
| `k8s/overlays/aks/configmap-patch.yaml` | Production config |

### CI/CD
| File | Purpose |
|------|---------|
| `.github/workflows/deploy-aks.yml` | Build, push, deploy on push to main |

### Documentation
| File | Purpose |
|------|---------|
| `docs/aks-deployment.md` | Full deployment guide |

## Azure Configuration
```
Resource Group: mrg-trailblazer-ai-demos
Location:       westus2
ACR:            trailblazeraicr
AKS:            trailblazer-aks

Node Pools:
  - System: 1x Standard_B2s (on-demand) - for ingress
  - Spot:   2-5x Standard_D2s_v3 (autoscaling, ~80% discount)

Estimated cost: ~$80/month (vs ~$180 without Spot)
```

## After Infrastructure Created
1. Run `./scripts/setup-github-secrets.sh` to get credentials for GitHub Actions
2. Update domain in `k8s/overlays/aks/ingress-patch.yaml`
3. Update domain in `k8s/overlays/aks/configmap-patch.yaml`
4. Push to main or run `kubectl apply -k k8s/overlays/aks`

---

## Previous Session - Database + Auth (Completed)

### Completed
- [x] Trail analysis feature fully implemented
- [x] Pushed to GitHub: https://github.com/swharr/TrailblazerAI
- [x] PostgreSQL via Docker (port 5433)
- [x] Prisma schema with all models
- [x] NextAuth v5 with credentials + OAuth + passkeys
- [x] Auth middleware (Edge-compatible)
- [x] Security hardening (CORS, headers, strong passwords)

### Pending
- [ ] Set up Google OAuth credentials
- [ ] Set up Apple OAuth credentials
- [ ] API routes for analyses and vehicles
- [ ] Dashboard with real data

## Commands to Resume

```bash
# Start PostgreSQL
docker compose up -d

# Start dev server
npm run dev

# Deploy to AKS (after azure-setup.sh completes)
./scripts/azure-setup.sh
./scripts/setup-github-secrets.sh
kubectl apply -k k8s/overlays/aks
```
