#!/bin/bash

echo "🚀 Time Tracker Mobile App - Android APK Build Script"
echo "=================================================="

# Check if logged in to EAS
echo "📋 Step 1: Login to EAS"
echo "Run: eas login"
echo "Enter your Expo account credentials when prompted"
echo ""

# Initialize project if needed
echo "📋 Step 2: Initialize EAS project (if not already done)"
echo "Run: eas project:init"
echo ""

# Build development APK
echo "📋 Step 3: Build development APK"
echo "Run: eas build --profile development --platform android"
echo ""

# Build preview APK (recommended for testing)
echo "📋 Step 4: Build preview APK (better for testing)"
echo "Run: eas build --profile preview --platform android"
echo ""

echo "📱 APK Installation Instructions:"
echo "1. Download APK from EAS build dashboard"
echo "2. Enable 'Unknown Sources' on Android device"
echo "3. Install APK directly on device"
echo "4. Test push notifications and authentication"
echo ""

echo "🔗 Build will be available at:"
echo "https://expo.dev/accounts/YOUR_USERNAME/projects/time-tracker-cloud/builds"
echo ""

echo "⏱️ Build time: ~10-15 minutes"
echo "📧 You'll get email notification when complete"