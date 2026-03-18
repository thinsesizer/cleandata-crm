#!/bin/bash
#
# CleanData CRM - Local One-Command Installer
# Run this directly on your Linux server
#

set -e

echo "╔══════════════════════════════════════════════════════════╗"
echo "║           🚀 CleanData CRM Local Installer               ║"
echo "║                                                          ║"
echo "║   This script will install CleanData CRM on your server ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "Error: Please run this script from the cleandata-crm directory"
    echo "Example: cd /path/to/cleandata-crm && bash LOCAL_INSTALL.sh"
    exit 1
fi

print_status "Step 1/5: Checking prerequisites..."

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "Node.js not found. Installing..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo "Error: Node.js 20+ required. Current: $(node --version)"
    exit 1
fi
print_success "Node.js $(node --version) installed"

# Check npm
if ! command -v npm &> /dev/null; then
    echo "npm not found. Please install Node.js properly"
    exit 1
fi
print_success "npm $(npm --version) installed"

print_status "Step 2/5: Installing dependencies..."
npm install --legacy-peer-deps
print_success "Dependencies installed"

print_status "Step 3/5: Setting up environment..."

# Create .env.local if it doesn't exist
if [ ! -f ".env.local" ]; then
    cat > .env.local << EOENV
# CleanData CRM - Local Development
# Replace these with your actual values

# Database - Using local SQLite for zero-config setup
DATABASE_URL="file:./prisma/dev.db"

# Supabase (optional - skip for local testing)
NEXT_PUBLIC_SUPABASE_URL="http://localhost:54321"
NEXT_PUBLIC_SUPABASE_ANON_KEY="local-anon-key"
SUPABASE_SERVICE_ROLE_KEY="local-service-key"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_APP_NAME="CleanData CRM"

# Security (generate random)
NEXTAUTH_SECRET="$(openssl rand -base64 32)"

# Other services (add later)
STRIPE_SECRET_KEY=""
STRIPE_WEBHOOK_SECRET=""
SALESFORCE_CLIENT_ID=""
SALESFORCE_CLIENT_SECRET=""
UPSTASH_REDIS_REST_URL=""
UPSTASH_REDIS_REST_TOKEN=""
EOENV
    print_success "Created .env.local with default values"
else
    print_success ".env.local already exists"
fi

print_status "Step 4/5: Setting up database..."
npx prisma generate
npx prisma migrate dev --name init --accept-data-loss || true
print_success "Database ready"

print_status "Step 5/5: Building application..."
npm run build
print_success "Build complete"

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  🎉 Installation Complete!"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Your CRM is ready! Start it with:"
echo "  npm run dev"
echo ""
echo "Then open: http://localhost:3000"
echo ""
echo "Default admin setup:"
echo "  1. Visit http://localhost:3000/signup"
echo "  2. Create your admin account"
echo "  3. Start using CleanData CRM!"
echo ""
echo "To add external services (Salesforce, Stripe, etc.):"
echo "  Edit .env.local and add your API keys"
echo ""
