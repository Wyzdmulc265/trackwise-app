#!/bin/bash

# TrackWise Database Deployment Script
# This script helps deploy the PostgreSQL database for TrackWise

set -e

# Configuration
RESOURCE_GROUP="${RESOURCE_GROUP:-trackwise-rg}"
LOCATION="${LOCATION:-eastus}"
SERVER_NAME="${SERVER_NAME:-trackwise-postgres-$(uuidgen | tr '[:upper:]' '[:lower:]' | cut -d'-' -f1)}"
ADMIN_PASSWORD="${ADMIN_PASSWORD}"
VNET_NAME="${VNET_NAME:-trackwise-vnet}"
SUBNET_NAME="${SUBNET_NAME:-postgresql-subnet}"
DATABASE_NAME="${DATABASE_NAME:-trackwise}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}TrackWise Database Deployment Script${NC}"
echo "=================================="

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    echo -e "${RED}Error: Azure CLI is not installed. Please install it first.${NC}"
    exit 1
fi

# Check if logged in
if ! az account show &> /dev/null; then
    echo -e "${RED}Error: Not logged in to Azure. Please run 'az login' first.${NC}"
    exit 1
fi

# Validate parameters
if [ -z "$ADMIN_PASSWORD" ]; then
    echo -e "${RED}Error: ADMIN_PASSWORD environment variable is required.${NC}"
    echo "Set it with: export ADMIN_PASSWORD='your-secure-password'"
    exit 1
fi

echo -e "${YELLOW}Deploying Azure PostgreSQL Flexible Server...${NC}"

# Create resource group if it doesn't exist
echo "Creating resource group: $RESOURCE_GROUP"
az group create --name "$RESOURCE_GROUP" --location "$LOCATION" --output none

# Create virtual network and subnet
echo "Creating virtual network and subnet..."
az network vnet create \
    --resource-group "$RESOURCE_GROUP" \
    --name "$VNET_NAME" \
    --address-prefix 10.0.0.0/16 \
    --subnet-name "$SUBNET_NAME" \
    --subnet-prefix 10.0.1.0/24 \
    --output none

# Get subnet ID
SUBNET_ID=$(az network vnet subnet show \
    --resource-group "$RESOURCE_GROUP" \
    --vnet-name "$VNET_NAME" \
    --name "$SUBNET_NAME" \
    --query id -o tsv)

# Deploy PostgreSQL server
echo "Deploying PostgreSQL Flexible Server..."
az deployment group create \
    --resource-group "$RESOURCE_GROUP" \
    --template-file infrastructure/postgresql.bicep \
    --parameters \
        serverName="$SERVER_NAME" \
        administratorLoginPassword="$ADMIN_PASSWORD" \
        virtualNetworkName="$VNET_NAME" \
        databaseName="$DATABASE_NAME" \
        allowPublicAccess=false \
    --output none

# Get server details
SERVER_FQDN=$(az postgres flexible-server show \
    --resource-group "$RESOURCE_GROUP" \
    --name "$SERVER_NAME" \
    --query fullyQualifiedDomainName -o tsv)

echo -e "${GREEN}PostgreSQL server deployed successfully!${NC}"
echo "Server: $SERVER_NAME"
echo "FQDN: $SERVER_FQDN"
echo "Database: $DATABASE_NAME"
echo ""

# Wait for server to be ready
echo -e "${YELLOW}Waiting for server to be ready...${NC}"
sleep 30

# Create database schema
echo -e "${YELLOW}Creating database schema...${NC}"

# Note: You'll need to run the schema.sql file manually or through a database client
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Connect to the database using a PostgreSQL client:"
echo "   psql 'host=$SERVER_FQDN port=5432 user=trackwiseadmin dbname=$DATABASE_NAME sslmode=require'"
echo ""
echo "2. Run the schema files in order:"
echo "   \\i database/types_and_functions.sql"
echo "   \\i database/schema.sql"
echo ""
echo "3. Or run the complete schema:"
echo "   \\i database/schema.sql"
echo ""

echo -e "${GREEN}Deployment completed successfully!${NC}"