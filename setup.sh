#!/bin/bash
# ─────────────────────────────────────────────
# CRM SaaS — Quick Start Script
# Run from the root crm-saas/ directory
# ─────────────────────────────────────────────

set -e

echo ""
echo "🚀 CRM SaaS — Quick Start"
echo "─────────────────────────"

# Backend setup
echo ""
echo "📦 Setting up Backend..."
cd backend

if [ ! -f .env ]; then
  cp .env.example .env
  echo "⚠️  Created backend/.env — please edit your DATABASE_URL and JWT_SECRET before continuing."
  echo "   Then re-run this script."
  exit 0
fi

npm install
npx prisma generate
npx prisma db push
node src/lib/seed.js

echo "✅ Backend ready"
cd ..

# Frontend setup
echo ""
echo "📦 Setting up Frontend..."
cd frontend

if [ ! -f .env.local ]; then
  cp .env.local.example .env.local
  echo "✅ Created frontend/.env.local with defaults"
fi

npm install
echo "✅ Frontend ready"
cd ..

echo ""
echo "────────────────────────────────────────────"
echo "✅ Setup complete! Start the servers:"
echo ""
echo "   Terminal 1 (Backend):"
echo "   cd backend && npm run dev"
echo ""
echo "   Terminal 2 (Frontend):"
echo "   cd frontend && npm run dev"
echo ""
echo "🌐 Open: http://localhost:3000"
echo ""
echo "📋 Demo credentials:"
echo "   Super Admin: admin@crm.com / Admin@123"
echo "   Sales Rep:   sales@crm.com / Sales@123"
echo "────────────────────────────────────────────"
