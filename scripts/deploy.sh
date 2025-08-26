
#!/bin/bash

# Production deployment script for Luco backend

set -e

echo "🚀 Starting Luco Backend Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}Docker Compose is not installed. Please install Docker Compose first.${NC}"
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}Warning: .env file not found. Creating from .env.example...${NC}"
    cp .env.example .env
    echo -e "${YELLOW}Please edit the .env file with your actual configuration before running the deployment again.${NC}"
    exit 1
fi

# Validate required environment variables
echo "📋 Validating environment variables..."
source .env

required_vars=(
    "DATABASE_URL"
    "REDIS_URL" 
    "JWT_ACCESS_SECRET"
    "JWT_REFRESH_SECRET"
    "SESSION_SECRET"
    "GOOGLE_CLIENT_ID"
    "GOOGLE_CLIENT_SECRET"
    "AWS_ACCESS_KEY_ID"
    "AWS_SECRET_ACCESS_KEY"
    "AWS_REGION"
    "STRIPE_SECRET_KEY"
    "ENCRYPTION_KEY"
    "SMTP_USER"
    "SMTP_PASS"
)

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo -e "${RED}Error: Required environment variable $var is not set.${NC}"
        exit 1
    fi
done

echo -e "${GREEN}✅ Environment variables validated${NC}"

# Build and start services
echo "🔨 Building Docker images..."
docker-compose build --no-cache

echo "🗃️ Starting database services..."
docker-compose up -d postgres redis

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
timeout 60 bash -c "until docker-compose exec postgres pg_isready -U luco_user -d luco_db; do sleep 1; done"

# Run database migrations
echo "🗄️ Running database migrations..."
docker-compose run --rm app npx prisma db push

# Start all services
echo "🚀 Starting all services..."
docker-compose up -d

# Wait for application to be ready
echo "⏳ Waiting for application to be ready..."
timeout 60 bash -c "until curl -f http://localhost:5000/api/health; do sleep 2; done"

echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo -e "${GREEN}📊 Application is running at: http://localhost:5000${NC}"
echo -e "${GREEN}📈 Health check: http://localhost:5000/api/health${NC}"

# Show running containers
echo "📦 Running containers:"
docker-compose ps
