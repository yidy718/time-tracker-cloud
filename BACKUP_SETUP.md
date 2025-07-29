# 🗄️ Database Backup Setup Guide

## **Recommended: Supabase PITR (Point-in-Time Recovery)**

### **Steps to Enable:**

1. 📱 **Go to Supabase Dashboard**
   - Visit [supabase.com/dashboard](https://supabase.com/dashboard)
   - Select your time-tracker project

2. ⚙️ **Navigate to Database Settings**
   - Left sidebar → **"Settings"**
   - Click **"Database"** 

3. 🔄 **Enable Point-in-Time Recovery**
   - Find **"Point in time recovery"** section
   - Click **"Enable PITR"**
   - Confirm the setup

4. 💰 **Cost**: ~$0.10/GB/month
   - Very affordable for small databases
   - Automatic every few minutes
   - 7 days of history

### **Benefits:**
- ✅ **Automatic**: No manual work required
- ✅ **Granular**: Restore to any specific second
- ✅ **Reliable**: Managed by Supabase
- ✅ **Fast**: Quick recovery times

---

## **Alternative: Free GitHub Backup**

If you prefer free backups, you can use the GitHub Action I created:

### **Setup Steps:**

1. 🔑 **Add Database URL to GitHub Secrets**
   - Go to your GitHub repo
   - Settings → Secrets and variables → Actions
   - Add new repository secret:
     - Name: `DATABASE_URL`
     - Value: Your Supabase connection string

2. 📅 **Backup Schedule**
   - Runs automatically every Sunday at 2 AM UTC
   - Keeps 4 weeks of backups
   - Can trigger manually anytime

3. 📥 **Access Backups**
   - Go to Actions tab in GitHub
   - Click on backup workflow run
   - Download backup artifacts

---

## **Manual Backup (Emergency)**

Use the `database/backup-script.sql` file:

1. Copy the SQL script
2. Run in Supabase SQL Editor  
3. Save the output as backup files

---

## **Recovery Testing**

❗ **Important**: Test your backup system!

1. Create a test restore in development
2. Verify all data is intact
3. Document recovery procedures
4. Test quarterly

---

## **Recommendation**

For production, I **strongly recommend the Supabase PITR option**:
- Professional-grade reliability
- Minimal cost (~$0.10/month for small DB)
- Zero maintenance required
- Covers you for human error, data corruption, etc.

The GitHub backup is good as a secondary option or for cost-conscious setups.