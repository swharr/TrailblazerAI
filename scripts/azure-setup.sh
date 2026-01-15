#!/bin/bash
set -e

# TrailBlazer AI - Azure Infrastructure Setup
# This script creates ACR, AKS cluster with Spot VMs, and configures ingress

# Configuration
RESOURCE_GROUP="mrg-trailblazer-ai-demos"
LOCATION="westus3"
ACR_NAME="trailblazerairegistry"
AKS_CLUSTER_NAME="trailblazer-aks"

# System pool (minimal, for ingress/system pods)
SYSTEM_NODE_COUNT=1
SYSTEM_VM_SIZE="Standard_D2as_v4"

# Spot pool (workloads - up to 90% cheaper!)
SPOT_NODE_COUNT=1
SPOT_NODE_MAX=3
SPOT_VM_SIZE="Standard_D2as_v4"
SPOT_MAX_PRICE=-1  # -1 = pay up to on-demand price (max availability)

echo "=== TrailBlazer AI - Azure Setup (with Spot VMs) ==="
echo "Resource Group: $RESOURCE_GROUP"
echo "Location: $LOCATION"
echo "ACR: $ACR_NAME"
echo "AKS: $AKS_CLUSTER_NAME"
echo ""
echo "Node Pools:"
echo "  System: ${SYSTEM_NODE_COUNT}x ${SYSTEM_VM_SIZE} (on-demand)"
echo "  Spot:   ${SPOT_NODE_COUNT}-${SPOT_NODE_MAX}x ${SPOT_VM_SIZE} (spot instances)"
echo ""

# Check if logged into Azure
echo "Checking Azure CLI login status..."
if ! az account show &>/dev/null; then
    echo "Not logged in. Please run: az login"
    exit 1
fi

SUBSCRIPTION=$(az account show --query name -o tsv)
echo "Using subscription: $SUBSCRIPTION"
echo ""

# Create Resource Group
echo "=== Creating Resource Group ==="
az group create \
    --name $RESOURCE_GROUP \
    --location $LOCATION \
    --output table

# Create Azure Container Registry
echo ""
echo "=== Creating Azure Container Registry ==="
az acr create \
    --resource-group $RESOURCE_GROUP \
    --name $ACR_NAME \
    --sku Basic \
    --admin-enabled true \
    --output table

# Get ACR login server
ACR_LOGIN_SERVER=$(az acr show --name $ACR_NAME --query loginServer -o tsv)
echo "ACR Login Server: $ACR_LOGIN_SERVER"

# Create AKS Cluster with minimal system pool
echo ""
echo "=== Creating AKS Cluster (this may take 5-10 minutes) ==="
az aks create \
    --resource-group $RESOURCE_GROUP \
    --name $AKS_CLUSTER_NAME \
    --node-count $SYSTEM_NODE_COUNT \
    --node-vm-size $SYSTEM_VM_SIZE \
    --nodepool-name system \
    --nodepool-labels nodepool=system \
    --enable-managed-identity \
    --attach-acr $ACR_NAME \
    --generate-ssh-keys \
    --network-plugin azure \
    --network-policy azure \
    --output table

# Add Spot node pool for workloads
echo ""
echo "=== Adding Spot Node Pool ==="
az aks nodepool add \
    --resource-group $RESOURCE_GROUP \
    --cluster-name $AKS_CLUSTER_NAME \
    --name spot \
    --node-count $SPOT_NODE_COUNT \
    --node-vm-size $SPOT_VM_SIZE \
    --priority Spot \
    --eviction-policy Delete \
    --spot-max-price $SPOT_MAX_PRICE \
    --enable-cluster-autoscaler \
    --min-count $SPOT_NODE_COUNT \
    --max-count $SPOT_NODE_MAX \
    --labels nodepool=spot kubernetes.azure.com/scalesetpriority=spot \
    --node-taints kubernetes.azure.com/scalesetpriority=spot:NoSchedule \
    --output table

# Get AKS credentials
echo ""
echo "=== Getting AKS Credentials ==="
az aks get-credentials \
    --resource-group $RESOURCE_GROUP \
    --name $AKS_CLUSTER_NAME \
    --overwrite-existing

# Verify cluster connection
echo ""
echo "=== Verifying Cluster Connection ==="
kubectl get nodes

# Install NGINX Ingress Controller
echo ""
echo "=== Installing NGINX Ingress Controller ==="
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.9.4/deploy/static/provider/cloud/deploy.yaml

# Wait for ingress controller to be ready
echo "Waiting for ingress controller to be ready..."
kubectl wait --namespace ingress-nginx \
    --for=condition=ready pod \
    --selector=app.kubernetes.io/component=controller \
    --timeout=120s

# Get the external IP
echo ""
echo "=== Ingress Controller External IP ==="
echo "Waiting for external IP assignment..."
sleep 30
EXTERNAL_IP=$(kubectl get svc -n ingress-nginx ingress-nginx-controller -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "pending")
echo "External IP: $EXTERNAL_IP"

# Summary
echo ""
echo "=========================================="
echo "=== Setup Complete ==="
echo "=========================================="
echo ""
echo "ACR Login Server: $ACR_LOGIN_SERVER"
echo "AKS Cluster: $AKS_CLUSTER_NAME"
echo "Ingress External IP: $EXTERNAL_IP"
echo ""
echo "Node Pools:"
kubectl get nodes -o custom-columns=NAME:.metadata.name,SIZE:.metadata.labels.node\\.kubernetes\\.io/instance-type,POOL:.metadata.labels.agentpool,SPOT:.metadata.labels.kubernetes\\.azure\\.com/scalesetpriority
echo ""
echo "Cost Savings: Spot VMs are up to 90% cheaper than on-demand!"
echo ""
echo "Next steps:"
echo "1. Build and push your Docker image:"
echo "   az acr login --name $ACR_NAME"
echo "   docker build -t $ACR_LOGIN_SERVER/trailblazer-ai:latest ."
echo "   docker push $ACR_LOGIN_SERVER/trailblazer-ai:latest"
echo ""
echo "2. Update DNS to point to: $EXTERNAL_IP"
echo ""
echo "3. Deploy to AKS:"
echo "   kubectl apply -k k8s/overlays/aks"
echo ""
echo "Note: Spot VMs can be evicted when Azure needs capacity."
echo "App will automatically restart when spot capacity is available."
echo ""
