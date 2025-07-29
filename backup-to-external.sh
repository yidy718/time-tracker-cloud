#!/bin/bash

# Database Backup Script for External Drive
# This script helps you backup your database to your external drive

set -e  # Exit on any error

echo "🗄️  Time Tracker Database Backup Tool"
echo "====================================="

# Get current date for backup filename
BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="time_tracker_backup_${BACKUP_DATE}.sql"

echo "📅 Backup date: $(date)"
echo "📁 Backup file: $BACKUP_FILE"
echo ""

# Check for external drives
echo "🔍 Looking for external drives..."
EXTERNAL_DRIVES=$(ls /media/$USER/ 2>/dev/null || echo "")

if [ -z "$EXTERNAL_DRIVES" ]; then
    echo "❌ No external drives found in /media/$USER/"
    echo ""
    echo "💡 Options:"
    echo "   1. Connect your external drive and try again"
    echo "   2. Save backup to Desktop for now"
    echo "   3. Manually copy to external drive later"
    echo ""
    
    # Save to Desktop as fallback
    BACKUP_PATH="$HOME/Desktop/$BACKUP_FILE"
    echo "📂 Will save backup to: $BACKUP_PATH"
else
    echo "✅ Found external drives:"
    for drive in $EXTERNAL_DRIVES; do
        echo "   📱 $drive"
    done
    echo ""
    
    # Use first available drive (or you can modify this to be more specific)
    FIRST_DRIVE=$(echo $EXTERNAL_DRIVES | cut -d' ' -f1)
    
    # Check if it contains "Extreme" or similar
    if echo "$FIRST_DRIVE" | grep -i -E "(extreme|sandisk)" > /dev/null; then
        echo "🎯 Using drive: $FIRST_DRIVE (looks like your Extreme drive!)"
    else
        echo "🎯 Using drive: $FIRST_DRIVE"
    fi
    
    # Create backups folder on external drive (handle spaces in drive names)
    BACKUP_FOLDER="/media/$USER/$FIRST_DRIVE/TimeTracker_Backups"
    
    # Try to create the folder, handle permission issues gracefully
    if mkdir -p "$BACKUP_FOLDER" 2>/dev/null; then
        echo "✅ Backup folder ready"
    else
        echo "⚠️  Need to create backup folder manually"
        echo "   Please create: $BACKUP_FOLDER"
    fi
    BACKUP_PATH="$BACKUP_FOLDER/$BACKUP_FILE"
    echo "📂 Will save backup to: $BACKUP_PATH"
fi

echo ""
echo "🔄 Next steps:"
echo "   1. Copy the SQL script from: database/backup-script.sql"
echo "   2. Run it in Supabase SQL Editor"
echo "   3. Save the output as: $BACKUP_PATH"
echo ""
echo "📋 Or follow this process:"
echo "   1. Open Supabase Dashboard"
echo "   2. Go to SQL Editor"
echo "   3. Copy/paste the backup script"
echo "   4. Run it and download/save results"
echo "   5. Move the file to your external drive"
echo ""
echo "✅ Backup location ready: $BACKUP_PATH"