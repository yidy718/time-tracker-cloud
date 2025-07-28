# Time Tracker Cloud 🕐

A comprehensive multi-tenant SaaS time tracking solution built with Next.js and Supabase. Perfect for businesses managing field workers, contractors, and employees across multiple locations.

## 🚀 Features

### 👥 Multi-Tenant Architecture
- **Super Admin**: Manage multiple companies and organizations
- **Company Admin**: Oversee employees, locations, and generate reports
- **Employees**: Clock in/out with location tracking and break management

### ⏰ Time Tracking
- Real-time clock in/out functionality
- Location-based attendance tracking
- Break tracking with reason codes
- Weekly/monthly hour summaries
- Historical time session records

### 📊 Reporting & Analytics
- Live dashboard with active sessions
- Detailed time reports by employee/date range
- Payroll-ready data export
- Employee activity monitoring

### 📱 Multi-Platform Support
- Responsive web application
- Dedicated mobile app (React Native/Expo)
- Offline-capable with sync when online

## 🏗️ Tech Stack

**Frontend:**
- Next.js 14 (React framework)
- Tailwind CSS (styling)
- React Hooks (state management)

**Backend:**
- Supabase (PostgreSQL + Auth + Real-time)
- Row Level Security (RLS) for multi-tenancy
- Real-time subscriptions

**Mobile:**
- React Native with Expo
- Offline storage with SQLite
- Sync manager for data consistency

## 📦 Project Structure

```
time-tracker-cloud/
├── components/           # React components
│   ├── AdminDashboard.js    # Admin interface
│   ├── TimeTracker.js       # Employee time tracking
│   ├── Auth.js              # Authentication
│   └── ...
├── lib/                  # Utilities and configs
│   ├── supabase.js          # Supabase client & helpers
│   └── multiTenant.js       # Multi-tenant utilities
├── pages/                # Next.js pages
│   ├── _app.js              # App wrapper
│   └── index.js             # Main application
├── mobile-app/           # React Native mobile app
│   ├── screens/             # Mobile screens
│   ├── lib/                 # Mobile utilities
│   └── ...
├── supabase/             # Database migrations
│   └── migrations/          # SQL migration files
├── database-schema.sql   # Core database schema
├── enhanced-schema.sql   # Extended features schema
└── deploy-database.sh    # Database deployment script
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Supabase account
- Git

### 1. Clone & Install
```bash
git clone <your-repo-url>
cd time-tracker-cloud
npm install
```

### 2. Environment Setup
Create `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Database Setup
```bash
# Deploy the database schema
chmod +x deploy-database.sh
./deploy-database.sh

# Or manually run the SQL files in Supabase SQL Editor:
# 1. database-schema.sql (core tables)
# 2. enhanced-schema.sql (additional features)
```

### 4. Run Development Server
```bash
npm run dev
# Visit http://localhost:3000
```

### 5. Mobile App Setup (Optional)
```bash
cd mobile-app
npm install
npx expo start
```

## 👤 User Authentication

### Admin Users (Supabase Auth)
- Email/password authentication
- Created via Supabase Dashboard or signup
- Full admin privileges

### Employee Users (Custom Auth)
- Username/password authentication
- Created by company admins
- Default password: `emp123` (must change on first login)
- Stored in `employees` table

## 🗄️ Database Schema

### Core Tables
- `organizations` - Multi-tenant companies
- `employees` - Employee records with auth
- `locations` - Work sites and offices
- `time_sessions` - Clock in/out records
- `client_projects` - Client work assignments

### Key Features
- Row Level Security (RLS) for data isolation
- Real-time subscriptions for live updates
- Automated session duration calculations
- Daily/weekly summary views

## 🚀 Deployment

### Web Application
```bash
npm run build
npm start
# Or deploy to Vercel/Netlify
```

### Mobile Application
```bash
cd mobile-app
expo build:android  # or :ios
```

## 🔧 Configuration

### Supabase Settings
1. **Authentication > Settings**:
   - Disable email confirmations for immediate employee login
   - Configure password requirements

2. **Database > RLS**:
   - Ensure RLS policies are enabled
   - Verify organization-based data isolation

### Environment Variables
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous key

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is proprietary software. All rights reserved.

## 🆘 Support

For support and questions:
- Check the existing issues
- Create a new issue with detailed description
- Include environment details and error logs

---

**Built with ❤️ by yidy**

*A modern solution for workforce time management and productivity tracking.*