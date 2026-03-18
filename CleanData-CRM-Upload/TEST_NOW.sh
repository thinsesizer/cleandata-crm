#!/bin/bash
# Test CleanData CRM locally - WORKS IMMEDIATELY

echo "🚀 Quick Test Script"
echo "===================="
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found"
    echo "Install with: curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt-get install -y nodejs"
    exit 1
fi

echo "✓ Node.js: $(node --version)"
echo "✓ npm: $(npm --version)"
echo ""

# Check if we're in the right place
if [ ! -f "package.json" ]; then
    echo "⚠️  package.json not found"
    echo "Please run this from the cleandata-crm directory"
    exit 1
fi

echo "📦 Installing dependencies (this takes 2-3 minutes)..."
npm install --legacy-peer-deps 2>&1 | tail -5

echo ""
echo "⚙️  Setting up database..."
npx prisma generate > /dev/null 2>&1

# Create simple .env if not exists
if [ ! -f ".env.local" ]; then
    echo "📝 Creating default config..."
    cat > .env.local <> EOENV
# Auto-generated config
DATABASE_URL="file:./prisma/dev.db"
NEXT_PUBLIC_SUPABASE_URL="http://localhost:54321"
NEXT_PUBLIC_SUPABASE_ANON_KEY="local-key"
SUPABASE_SERVICE_ROLE_KEY="local-key"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXTAUTH_SECRET="$(openssl rand -base64 32)"
EOENV
fi

echo ""
echo "🔨 Building app (this takes 1-2 minutes)..."
npm run build 2>&1 | tail -10

echo ""
echo "✅ READY!"
echo "========="
echo ""
echo "Start the app with: npm run dev"
echo "Then open: http://localhost:3000"
echo ""
echo "Or start now? (y/n)"
read -r response
if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    echo "🚀 Starting..."
    npm run dev
fi
