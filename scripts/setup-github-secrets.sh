#!/bin/bash
set -e

# TrailBlazer AI - GitHub Secrets Setup
# This script helps create the Azure credentials for GitHub Actions

RESOURCE_GROUP="mrg-trailblazer-ai-demos"
AKS_CLUSTER_NAME="trailblazer-aks"
SP_NAME="trailblazer-github-actions"

echo "=== TrailBlazer AI - GitHub Secrets Setup ==="
echo ""
echo "This script creates an Azure Service Principal for GitHub Actions"
echo "and shows you the secrets to add to your GitHub repository."
echo ""

# Check if logged into Azure
if ! az account show &>/dev/null; then
    echo "Not logged in. Please run: az login"
    exit 1
fi

SUBSCRIPTION_ID=$(az account show --query id -o tsv)
echo "Subscription ID: $SUBSCRIPTION_ID"
echo ""

# Create Service Principal
echo "=== Creating Service Principal ==="
SP_OUTPUT=$(az ad sp create-for-rbac \
    --name $SP_NAME \
    --role contributor \
    --scopes /subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP \
    --sdk-auth)

echo ""
echo "=========================================="
echo "=== GitHub Secrets to Configure ==="
echo "=========================================="
echo ""
echo "Go to: https://github.com/swharr/TrailblazerAI/settings/secrets/actions"
echo ""
echo "Add the following secrets:"
echo ""
echo "1. AZURE_CREDENTIALS (copy the entire JSON block below):"
echo "---"
echo "$SP_OUTPUT"
echo "---"
echo ""
echo "2. ANTHROPIC_API_KEY: Your Anthropic API key"
echo "3. DATABASE_URL: Your Azure PostgreSQL connection string"
echo "4. NEXTAUTH_SECRET: Generate with: openssl rand -base64 32"
echo "5. OPENAI_API_KEY: (optional) Your OpenAI API key"
echo "6. MAPBOX_ACCESS_TOKEN: (optional) Your Mapbox token"
echo ""
echo "=========================================="
echo ""
echo "For Azure Database for PostgreSQL, create one with:"
echo "az postgres flexible-server create \\"
echo "  --resource-group $RESOURCE_GROUP \\"
echo "  --name trailblazer-db \\"
echo "  --location westus2 \\"
echo "  --admin-user trailblazer \\"
echo "  --admin-password <your-password> \\"
echo "  --sku-name Standard_B1ms \\"
echo "  --tier Burstable"
echo ""
