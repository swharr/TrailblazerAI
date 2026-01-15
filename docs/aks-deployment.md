# AKS Deployment Guide

This guide covers deploying TrailBlazer AI to Azure Kubernetes Service (AKS).

## Prerequisites

- Azure CLI installed (`az`)
- kubectl installed
- Docker installed
- GitHub repository access

## Quick Start

### 1. Create Azure Infrastructure

```bash
# Login to Azure
az login

# Run the setup script
./scripts/azure-setup.sh
```

This creates:
- Resource group: `mrg-trailblazer-ai-demos`
- Azure Container Registry: `trailblazeraicr`
- AKS cluster: `trailblazer-aks`
  - System node pool (1x Standard_B2s) - for ingress controller
  - Spot node pool (2-5x Standard_D2s_v3) - for app workloads (up to 90% cheaper!)
- NGINX Ingress Controller

### 2. Configure GitHub Secrets

```bash
./scripts/setup-github-secrets.sh
```

Add these secrets to your GitHub repository (Settings > Secrets > Actions):

| Secret | Description |
|--------|-------------|
| `AZURE_CREDENTIALS` | Service principal JSON from setup script |
| `ANTHROPIC_API_KEY` | Anthropic API key for AI analysis |
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | Auth secret (generate with `openssl rand -base64 32`) |
| `OPENAI_API_KEY` | (Optional) OpenAI API key |
| `MAPBOX_ACCESS_TOKEN` | (Optional) Mapbox token for maps |

### 3. Deploy

Push to `main` branch to trigger automatic deployment, or manually run:

```bash
# Build and push image
az acr login --name trailblazeraicr
docker build -t trailblazeraicr.azurecr.io/trailblazer-ai:latest .
docker push trailblazeraicr.azurecr.io/trailblazer-ai:latest

# Deploy to AKS
kubectl apply -k k8s/overlays/aks
```

## Architecture

```
                    ┌─────────────────────────────────────┐
                    │         Azure Cloud                  │
                    │                                      │
┌──────────┐       │  ┌─────────────────────────────────┐ │
│  GitHub  │──push─┼──│     Azure Container Registry    │ │
│  Actions │       │  └─────────────────────────────────┘ │
└──────────┘       │                  │                    │
                    │                  ▼                    │
                    │  ┌─────────────────────────────────┐ │
                    │  │           AKS Cluster           │ │
                    │  │  ┌───────────────────────────┐  │ │
Internet ──────────┼──┼──│   NGINX Ingress Controller │  │ │
                    │  │  └─────────────┬─────────────┘  │ │
                    │  │                │                 │ │
                    │  │  ┌─────────────▼─────────────┐  │ │
                    │  │  │   TrailBlazer AI Pod      │  │ │
                    │  │  │   (on Spot VM - 90% off!) │  │ │
                    │  │  └─────────────┬─────────────┘  │ │
                    │  └────────────────┼────────────────┘ │
                    │                   │                   │
                    │  ┌────────────────▼────────────────┐ │
                    │  │   Azure Database for PostgreSQL │ │
                    │  └─────────────────────────────────┘ │
                    └─────────────────────────────────────┘
```

## Configuration

### Update Domain Name

Edit `k8s/overlays/aks/ingress-patch.yaml`:

```yaml
spec:
  rules:
    - host: your-domain.com  # Change this
```

Edit `k8s/overlays/aks/configmap-patch.yaml`:

```yaml
data:
  NEXTAUTH_URL: "https://your-domain.com"  # Change this
```

### Enable TLS

1. Install cert-manager:
```bash
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.2/cert-manager.yaml
```

2. Create ClusterIssuer for Let's Encrypt:
```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: your-email@example.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
      - http01:
          ingress:
            class: nginx
```

3. Uncomment TLS section in `k8s/overlays/aks/ingress-patch.yaml`

### Scale Deployment

Edit `k8s/overlays/aks/deployment-patch.yaml`:

```yaml
spec:
  replicas: 3  # Increase replicas
```

Or use HPA overlay:
```bash
kubectl apply -k k8s/overlays/hpa
```

## Database Setup

### Azure Database for PostgreSQL

```bash
# Create PostgreSQL Flexible Server
az postgres flexible-server create \
  --resource-group mrg-trailblazer-ai-demos \
  --name trailblazer-db \
  --location westus2 \
  --admin-user trailblazer \
  --admin-password <your-secure-password> \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --storage-size 32

# Allow AKS access
az postgres flexible-server firewall-rule create \
  --resource-group mrg-trailblazer-ai-demos \
  --name trailblazer-db \
  --rule-name AllowAKS \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 255.255.255.255

# Get connection string
# Format: postgresql://trailblazer:<password>@trailblazer-db.postgres.database.azure.com:5432/trailblazer?sslmode=require
```

### Run Migrations

```bash
# Port forward to database or run from a pod
kubectl run prisma-migrate --rm -it \
  --image=trailblazeraicr.azurecr.io/trailblazer-ai:latest \
  --env="DATABASE_URL=<your-connection-string>" \
  -- npx prisma migrate deploy
```

## Monitoring

### View Pods
```bash
kubectl get pods -n trailblazer-ai
```

### View Logs
```bash
kubectl logs -f deployment/trailblazer-ai -n trailblazer-ai
```

### Check Ingress
```bash
kubectl get ingress -n trailblazer-ai
kubectl describe ingress trailblazer-ai -n trailblazer-ai
```

## Troubleshooting

### Pod not starting
```bash
kubectl describe pod <pod-name> -n trailblazer-ai
kubectl logs <pod-name> -n trailblazer-ai
```

### Image pull errors
```bash
# Verify ACR is attached to AKS
az aks check-acr --name trailblazer-aks \
  --resource-group mrg-trailblazer-ai-demos \
  --acr trailblazeraicr
```

### Database connection issues
- Verify `DATABASE_URL` secret is correct
- Check PostgreSQL firewall rules
- Ensure SSL mode is set to `require`

## Costs

Estimated monthly costs (West US 2) with Spot VMs:
- AKS System pool (1x Standard_B2s): ~$15
- AKS Spot pool (2x Standard_D2s_v3 @ ~80% discount): ~$15
- ACR (Basic): ~$5
- PostgreSQL (Standard_B1ms): ~$25
- Load Balancer: ~$20
- **Total**: ~$80/month (vs ~$180 without Spot!)

### Spot VM Considerations

Spot VMs can be evicted when Azure needs capacity:
- App will automatically restart when spot capacity is available
- Suitable for non-critical/demo workloads
- Configured with autoscaling (2-5 nodes) to maximize availability

Scale spot pool:
```bash
az aks nodepool scale --resource-group mrg-trailblazer-ai-demos \
  --cluster-name trailblazer-aks --name spot --node-count 1
```

Check spot eviction events:
```bash
kubectl get events -n trailblazer-ai --field-selector reason=Evicted
```
