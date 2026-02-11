#!/bin/bash

# Setup script for gaud-integrations
# Prepara o ambiente para desenvolvimento local

set -e

echo "🚀 Setup gaud-integrations..."

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Verificar Node.js
echo -e "${BLUE}Checking Node.js...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}⚠️  Node.js not found. Please install Node.js 18+${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js $(node --version)${NC}"

# 2. Verificar npm
echo -e "${BLUE}Checking npm...${NC}"
echo -e "${GREEN}✓ npm $(npm --version)${NC}"

# 3. Instalar dependências
echo -e "${BLUE}Installing dependencies...${NC}"
npm ci
echo -e "${GREEN}✓ Dependencies installed${NC}"

# 4. Setup env
echo -e "${BLUE}Setting up environment...${NC}"
if [ ! -f .env ]; then
    echo -e "${YELLOW}Creating .env from .env.example...${NC}"
    cp .env.example .env
    echo -e "${YELLOW}⚠️  Please configure .env with your Pipedrive credentials${NC}"
else
    echo -e "${GREEN}✓ .env exists${NC}"
fi

# 5. Build TypeScript
echo -e "${BLUE}Building TypeScript...${NC}"
npm run build
echo -e "${GREEN}✓ Build successful${NC}"

# 6. Run tests
echo -e "${BLUE}Running tests...${NC}"
npm run test:ci
echo -e "${GREEN}✓ All tests passed${NC}"

# 7. Setup git hooks
echo -e "${BLUE}Setting up git hooks...${NC}"
if [ -d .git ]; then
    npm install husky --save-dev --force
    npx husky install
    echo -e "${GREEN}✓ Git hooks installed${NC}"
fi

# 8. Docker check
echo -e "${BLUE}Checking Docker...${NC}"
if command -v docker &> /dev/null; then
    echo -e "${GREEN}✓ Docker $(docker --version | awk '{print $3}')${NC}"

    # Optional: Docker compose setup
    read -p "Setup Docker Compose? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}Starting Docker Compose...${NC}"
        docker-compose up -d
        echo -e "${GREEN}✓ Docker Compose running${NC}"
        sleep 3
    fi
else
    echo -e "${YELLOW}⚠️  Docker not found (optional)${NC}"
fi

echo ""
echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Configure .env with Pipedrive credentials"
echo "2. Run: npm run dev"
echo "3. API available at http://localhost:3000"
echo "4. Test: curl http://localhost:3000/health"
echo ""
echo -e "${BLUE}Useful commands:${NC}"
echo "  npm run dev       - Start dev server with hot reload"
echo "  npm test          - Run tests in watch mode"
echo "  npm run test:ci   - Run tests once (CI mode)"
echo "  npm run lint      - Lint code"
echo "  npm run build     - Build TypeScript"
echo ""
echo -e "${BLUE}Documentation:${NC}"
echo "  README.md          - Project overview"
echo "  DEPLOYMENT.md      - Deployment guide"
echo "  docs/PHASE_A_CRM_LAYER.md  - CRM architecture"
echo "  docs/ADDING_NEW_CRM.md     - How to add new CRM"
