# 📅 Monthly Backup Guide

## 🗓️ **When to Backup**
- **1st of every month** (set a calendar reminder!)
- **Before major changes** (new features, updates)
- **When you feel like it** (more backups = better)

## 📱 **Step-by-Step Process**

### **Step 1: Prepare Your External Drive**
1. **Connect** your external drive (the "Extreme" one)
2. **Run** the backup helper script:
   ```bash
   cd /home/yidy/Desktop/time-tracker-cloud
   ./backup-to-external.sh
   ```
3. **Note** where it will save the backup

### **Step 2: Run Database Backup**
1. **Open** [supabase.com/dashboard](https://supabase.com/dashboard)
2. **Go to** your time-tracker project
3. **Click** "SQL Editor" in left sidebar
4. **Copy** the contents of `database/backup-script.sql`
5. **Paste** into SQL Editor
6. **Click "Run"** (big play button)

### **Step 3: Save the Results**
1. **Wait** for script to finish (shows tables and counts)
2. **Copy** all the output results
3. **Save** as text file with name suggested by backup script
4. **Example**: `time_tracker_backup_20250129_143022.sql`

### **Step 4: Copy to External Drive**
1. **Navigate** to your external drive folder
2. **Create** `TimeTracker_Backups` folder if it doesn't exist
3. **Save** the backup file there
4. **Verify** the file saved correctly

## 📊 **What Gets Backed Up**
- ✅ **Organizations** (your companies)
- ✅ **Employees** (all user accounts) 
- ✅ **Locations** (work sites)
- ✅ **Projects** (client projects)
- ✅ **Time Sessions** (last 90 days of clock data)
- ✅ **Table counts** (for verification)

## 🛡️ **Security Notes**
- **Backup files contain sensitive data** - keep external drive secure
- **Don't email or cloud-sync** backup files
- **Store external drive safely** when not in use

## 🔄 **Backup Rotation**
- **Keep 6 months** of backups (delete older ones)
- **Name format**: `time_tracker_backup_YYYYMMDD_HHMMSS.sql`
- **Easy to find** the backup you need by date

## ⚡ **Quick Backup (Emergency)**
If you need a quick backup right now:

1. **Copy this entire script** and run in Supabase SQL Editor:

```sql
-- Quick backup - copy results and save to file
SELECT 'Organizations:' as table_name;
SELECT * FROM organizations;

SELECT 'Employees:' as table_name;  
SELECT * FROM employees;

SELECT 'Locations:' as table_name;
SELECT * FROM locations;

SELECT 'Projects:' as table_name;
SELECT * FROM projects;

SELECT 'Recent Time Sessions:' as table_name;
SELECT * FROM time_sessions WHERE clock_in >= NOW() - INTERVAL '30 days';

SELECT 'Backup completed:' as status, NOW() as backup_time;
```

## 📞 **Need Help?**
- **Check** `database/backup-script.sql` for the full backup script
- **Run** `./backup-to-external.sh` to see backup locations
- **Remember**: It's better to have too many backups than too few!