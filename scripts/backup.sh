
#!/bin/bash

# Database backup script for Luco backend

set -e

echo "💾 Starting database backup..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Create backup directory if it doesn't exist
mkdir -p backups

# Generate backup filename with timestamp
BACKUP_FILE="backups/luco_backup_$(date +%Y%m%d_%H%M%S).sql"

# Perform database backup
echo "📁 Creating backup: $BACKUP_FILE"
docker-compose exec postgres pg_dump -U luco_user -d luco_db > $BACKUP_FILE

# Compress the backup
gzip $BACKUP_FILE

echo -e "${GREEN}✅ Backup completed: ${BACKUP_FILE}.gz${NC}"

# Clean up old backups (keep only last 7 days)
echo "🧹 Cleaning up old backups..."
find backups/ -name "*.sql.gz" -mtime +7 -delete

echo -e "${GREEN}✅ Backup process completed successfully!${NC}"
