#!/bin/bash

# Time Tracker Database Deployment Script
echo "🚀 Deploying Time Tracker Database..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if Supabase project is linked
echo -e "${BLUE}📋 Checking Supabase project status...${NC}"
npx supabase status

# Option 1: Reset everything (clean slate)
echo -e "${YELLOW}⚠️  Do you want to reset the database completely? (y/n)${NC}"
read -r reset_choice

if [ "$reset_choice" = "y" ] || [ "$reset_choice" = "Y" ]; then
    echo -e "${RED}🗑️  Resetting database...${NC}"
    npx supabase db reset --linked
    echo -e "${GREEN}✅ Database reset complete!${NC}"
else
    echo -e "${BLUE}📦 Applying migrations only...${NC}"
    npx supabase db push --linked
fi

# Option 2: Seed with sample data
echo -e "${YELLOW}🌱 Do you want to add sample company data? (y/n)${NC}"
read -r seed_choice

if [ "$seed_choice" = "y" ] || [ "$seed_choice" = "Y" ]; then
    echo -e "${BLUE}🌱 Adding sample data...${NC}"
    npx supabase db reset --linked --seed
    echo -e "${GREEN}✅ Sample data added!${NC}"
fi

echo -e "${GREEN}🎉 Database deployment complete!${NC}"
echo -e "${BLUE}📊 Your database is ready at: https://vashours.vercel.app${NC}"

# Show next steps
echo ""
echo -e "${YELLOW}📋 Next Steps:${NC}"
echo "1. Open https://vashours.vercel.app"
echo "2. Create your first company using the Super Admin dashboard"
echo "3. Set up company managers and employees"
echo "4. Test the mobile apps with new accounts"
echo ""
echo -e "${GREEN}🔥 You're ready to rock!${NC}"