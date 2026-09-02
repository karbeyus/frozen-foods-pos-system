#!/bin/bash

# Installation script for Frozen Foods POS System

echo "═══════════════════════════════════════════════════════════════"
echo "  Frozen Foods & Supermarket POS System - Setup Script"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Check Node.js
echo "✓ Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    echo "✗ Node.js is not installed. Please install Node.js 14+"
    exit 1
fi
echo "  Node.js version: $(node --version)"

# Check npm
echo ""
echo "✓ Checking npm installation..."
if ! command -v npm &> /dev/null; then
    echo "✗ npm is not installed."
    exit 1
fi
echo "  npm version: $(npm --version)"

# Check PostgreSQL
echo ""
echo "✓ Checking PostgreSQL installation..."
if ! command -v psql &> /dev/null; then
    echo "✗ PostgreSQL is not installed. Please install PostgreSQL 12+"
    exit 1
fi
echo "  PostgreSQL is installed"

# Install dependencies
echo ""
echo "✓ Installing dependencies..."
npm install

# Create .env file if not exists
echo ""
echo "✓ Setting up environment configuration..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "  Created .env file"
    echo "  ⚠️  Please update .env with your PostgreSQL credentials"
else
    echo "  .env file already exists"
fi

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  Installation Complete!"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "Next steps:"
echo "  1. Update .env with your PostgreSQL credentials"
echo "  2. Run: npm run setup-db"
echo "  3. Run: npm start"
echo "  4. Open: http://localhost:5000"
echo ""
echo "Default Login:"
echo "  Username: admin"
echo "  Password: Admin@123456"
echo ""
