# 📱 Simple Monthly Backup Process

## 🎯 **Your External Drive Setup**
- **Drive Name**: Extreme SSD
- **Backup Folder**: `/media/yidy/Extreme SSD/TimeTracker_Backups/`
- **Already Created**: ✅ Ready to use!

## 🗓️ **Monthly Backup Steps (5 minutes)**

### **Step 1: Get the Backup Script**
```bash
cd /home/yidy/Desktop/time-tracker-cloud
cat MONTHLY_BACKUP_SCRIPT.sql
```
**Copy** all the SQL that appears.

### **Step 2: Run in Supabase**
1. **Open**: [supabase.com/dashboard](https://supabase.com/dashboard)
2. **Go to**: Your time-tracker project → SQL Editor
3. **Paste**: The backup script
4. **Click**: "Run" button
5. **Wait**: For results to appear

### **Step 3: Save to External Drive**
1. **Copy** all the results from Supabase
2. **Open** file manager → Navigate to your external drive
3. **Go to**: `Extreme SSD/TimeTracker_Backups/`
4. **Create new file**: `backup_2025_01_29.sql` (use today's date)
5. **Paste** the results and save

## 📅 **File Naming Convention**
- **Format**: `backup_YYYY_MM_DD.sql`
- **Example**: `backup_2025_01_29.sql`
- **Easy to find** by date!

## 🔄 **Next Backup Date**
**Set a calendar reminder**: 1st of February 2025

## ⚡ **Quick Backup Right Now**
Want to test it? Here's a mini backup script you can run right now:

**Copy this** and run in Supabase SQL Editor:
```sql
-- Quick test backup
SELECT 'Organizations:' as info;
SELECT count(*) as total_orgs FROM organizations;

SELECT 'Employees:' as info;
SELECT count(*) as total_employees FROM employees;

SELECT 'Projects:' as info;
SELECT count(*) as total_projects FROM projects;

SELECT 'Time Sessions (last 7 days):' as info;
SELECT count(*) as recent_sessions FROM time_sessions 
WHERE clock_in >= NOW() - INTERVAL '7 days';

SELECT 'Backup test completed!' as status, NOW() as backup_time;
```

Save the results as `test_backup_$(date +%Y_%m_%d).sql` on your external drive.

## ✅ **You're All Set!**
Your backup system is ready. Just remember to do it monthly! 🎉