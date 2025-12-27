#!/bin/bash

# Fly.io Deployment Script for Proofa
# Usage: ./scripts/deploy-fly.sh [command]
# Commands: setup, secrets, deploy, deploy-core, deploy-gateway, status, logs

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# App names
CORE_APP="proofa-core"
GATEWAY_APP="proofa-gateway"

# Production URLs
# Core handles OAuth with providers, Gateway handles app-facing API
CORE_PUBLIC_URL="https://auth.proofa.sh"
GATEWAY_PUBLIC_URL="https://api.proofa.sh"
USER_DASHBOARD_URL="https://user.proofa.sh"
ADMIN_DASHBOARD_URL="https://manage.proofa.sh"
COOKIE_DOMAIN=".proofa.sh"

# Load secrets from .env file if it exists
load_env() {
    if [ -f ".env" ]; then
        echo -e "${BLUE}Loading secrets from .env file...${NC}"
        # Read .env file line by line, skipping comments and empty lines
        while IFS= read -r line || [ -n "$line" ]; do
            # Skip empty lines and comments
            [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue
            # Extract key and value, stripping surrounding quotes from value
            key="${line%%=*}"
            value="${line#*=}"
            # Remove surrounding quotes if present
            value="${value#\"}"
            value="${value%\"}"
            value="${value#\'}"
            value="${value%\'}"
            # Export the variable
            export "$key=$value"
        done < .env
    else
        echo -e "${RED}Error: .env file not found${NC}"
        echo "Please create a .env file with your secrets"
        exit 1
    fi
}

# Check if fly CLI is installed
check_fly() {
    if ! command -v fly &> /dev/null; then
        echo -e "${RED}Error: fly CLI not installed${NC}"
        echo "Install it with: brew install flyctl"
        exit 1
    fi
}

# Create apps
create_apps() {
    echo -e "${BLUE}Creating Fly.io apps...${NC}"
    
    # Create Core app
    if fly apps list | grep -q "$CORE_APP"; then
        echo -e "${YELLOW}App $CORE_APP already exists${NC}"
    else
        echo -e "${GREEN}Creating $CORE_APP...${NC}"
        fly apps create "$CORE_APP" --org personal
    fi
    
    # Create Gateway app
    if fly apps list | grep -q "$GATEWAY_APP"; then
        echo -e "${YELLOW}App $GATEWAY_APP already exists${NC}"
    else
        echo -e "${GREEN}Creating $GATEWAY_APP...${NC}"
        fly apps create "$GATEWAY_APP" --org personal
    fi
}

# Set secrets for Core
set_core_secrets() {
    echo -e "${BLUE}Setting secrets for $CORE_APP...${NC}"
    load_env
    
    fly secrets set \
        DATABASE_URL="$DATABASE_URL" \
        DATABASE_AUTH_TOKEN="$DATABASE_AUTH_TOKEN" \
        UPSTASH_REDIS_REST_URL="$UPSTASH_REDIS_REST_URL" \
        UPSTASH_REDIS_REST_TOKEN="$UPSTASH_REDIS_REST_TOKEN" \
        RESEND_API_KEY="$RESEND_API_KEY" \
        EMAIL_FROM="${EMAIL_FROM:-noreply@proofa.sh}" \
        SEND_EMAILS="true" \
        GOOGLE_CLIENT_ID="$GOOGLE_CLIENT_ID" \
        GOOGLE_CLIENT_SECRET="$GOOGLE_CLIENT_SECRET" \
        GITHUB_CLIENT_ID="$GITHUB_CLIENT_ID" \
        GITHUB_CLIENT_SECRET="$GITHUB_CLIENT_SECRET" \
        CORE_PUBLIC_URL="$CORE_PUBLIC_URL" \
        CORE_S2S_TOKEN="$CORE_S2S_TOKEN" \
        SESSION_SECRET="$SESSION_SECRET" \
        --app "$CORE_APP"
    
    echo -e "${GREEN}Core secrets set successfully${NC}"
}

# Set secrets for Gateway
set_gateway_secrets() {
    echo -e "${BLUE}Setting secrets for $GATEWAY_APP...${NC}"
    load_env
    
    fly secrets set \
        DATABASE_URL="$DATABASE_URL" \
        DATABASE_AUTH_TOKEN="$DATABASE_AUTH_TOKEN" \
        UPSTASH_REDIS_REST_URL="$UPSTASH_REDIS_REST_URL" \
        UPSTASH_REDIS_REST_TOKEN="$UPSTASH_REDIS_REST_TOKEN" \
        CORE_URL="$CORE_PUBLIC_URL" \
        CORE_S2S_TOKEN="$CORE_S2S_TOKEN" \
        SESSION_SECRET="$SESSION_SECRET" \
        GATEWAY_PUBLIC_URL="$GATEWAY_PUBLIC_URL" \
        USER_DASHBOARD_URL="$USER_DASHBOARD_URL" \
        COOKIE_DOMAIN="$COOKIE_DOMAIN" \
        --app "$GATEWAY_APP"
    
    echo -e "${GREEN}Gateway secrets set successfully${NC}"
}

# Deploy Core
deploy_core() {
    echo -e "${BLUE}Deploying $CORE_APP...${NC}"
    fly deploy . --dockerfile apps/core/Dockerfile --config apps/core/fly.toml --app "$CORE_APP" --no-cache
    echo -e "${GREEN}Core deployed successfully${NC}"
}

# Deploy Gateway
deploy_gateway() {
    echo -e "${BLUE}Deploying $GATEWAY_APP...${NC}"
    fly deploy . --dockerfile apps/gateway/Dockerfile --config apps/gateway/fly.toml --app "$GATEWAY_APP" --no-cache
    echo -e "${GREEN}Gateway deployed successfully${NC}"
}

# Add custom domains
add_domains() {
    echo -e "${BLUE}Adding custom domains...${NC}"
    
    echo "Adding auth.proofa.sh to $CORE_APP..."
    fly certs add auth.proofa.sh --app "$CORE_APP" || true
    
    echo "Adding api.proofa.sh to $GATEWAY_APP..."
    fly certs add api.proofa.sh --app "$GATEWAY_APP" || true
    
    echo -e "${GREEN}Domains added. Configure DNS:${NC}"
    echo "  auth.proofa.sh -> CNAME to $CORE_APP.fly.dev"
    echo "  api.proofa.sh  -> CNAME to $GATEWAY_APP.fly.dev"
}

# Show status
show_status() {
    echo -e "${BLUE}App Status:${NC}"
    echo ""
    echo -e "${YELLOW}$CORE_APP:${NC}"
    fly status --app "$CORE_APP" 2>/dev/null || echo "Not deployed yet"
    echo ""
    echo -e "${YELLOW}$GATEWAY_APP:${NC}"
    fly status --app "$GATEWAY_APP" 2>/dev/null || echo "Not deployed yet"
}

# Show logs
show_logs() {
    local app=${1:-$CORE_APP}
    echo -e "${BLUE}Showing logs for $app...${NC}"
    fly logs --app "$app"
}

# Full setup (first time)
full_setup() {
    echo -e "${GREEN}=== Proofa Fly.io Full Setup ===${NC}"
    check_fly
    create_apps
    set_core_secrets
    set_gateway_secrets
    deploy_core
    deploy_gateway
    add_domains
    show_status
    echo ""
    echo -e "${GREEN}=== Setup Complete ===${NC}"
    echo ""
    echo "Your apps are deployed at:"
    echo "  Core:    https://$CORE_APP.fly.dev"
    echo "  Gateway: https://$GATEWAY_APP.fly.dev"
    echo ""
    echo "After DNS propagation:"
    echo "  Core:    $CORE_PUBLIC_URL"
    echo "  Gateway: $GATEWAY_PUBLIC_URL"
}

# Deploy both apps
deploy_all() {
    echo -e "${GREEN}=== Deploying All Apps ===${NC}"
    check_fly
    deploy_core
    deploy_gateway
    show_status
}

# Print usage
usage() {
    echo "Proofa Fly.io Deployment Script"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  setup          Full first-time setup (create apps, set secrets, deploy, add domains)"
    echo "  secrets        Set/update secrets for both apps"
    echo "  secrets-core   Set/update secrets for Core only"
    echo "  secrets-gw     Set/update secrets for Gateway only"
    echo "  deploy         Deploy both apps"
    echo "  deploy-core    Deploy Core only"
    echo "  deploy-gw      Deploy Gateway only"
    echo "  domains        Add custom domains"
    echo "  status         Show app status"
    echo "  logs [app]     Show logs (default: proofa-core)"
    echo "  logs-core      Show Core logs"
    echo "  logs-gw        Show Gateway logs"
    echo ""
    echo "Examples:"
    echo "  $0 setup           # First time setup"
    echo "  $0 deploy          # Deploy after code changes"
    echo "  $0 secrets         # Update secrets after .env changes"
    echo "  $0 logs-gw         # View Gateway logs"
}

# Main
case "${1:-}" in
    setup)
        full_setup
        ;;
    secrets)
        check_fly
        set_core_secrets
        set_gateway_secrets
        ;;
    secrets-core)
        check_fly
        set_core_secrets
        ;;
    secrets-gw)
        check_fly
        set_gateway_secrets
        ;;
    deploy)
        deploy_all
        ;;
    deploy-core)
        check_fly
        deploy_core
        ;;
    deploy-gw)
        check_fly
        deploy_gateway
        ;;
    domains)
        check_fly
        add_domains
        ;;
    status)
        check_fly
        show_status
        ;;
    logs)
        check_fly
        show_logs "${2:-$CORE_APP}"
        ;;
    logs-core)
        check_fly
        show_logs "$CORE_APP"
        ;;
    logs-gw)
        check_fly
        show_logs "$GATEWAY_APP"
        ;;
    *)
        usage
        ;;
esac
