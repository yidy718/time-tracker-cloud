# ⏰ Time Tracker Cloud

A modern, cloud-based time tracking application built with Next.js and Supabase. Perfect for teams and organizations to track employee work hours, breaks, and generate detailed reports.

## ✨ Features

### 👥 **Multi-User Support**
- **Admin Dashboard** - Complete management interface
- **Employee Interface** - Simple time clock for workers
- **Role-Based Access** - Secure permissions system
- **Organization Management** - Multi-tenant support

### ⏱️ **Time Tracking**
- **Clock In/Out** - Simple one-click time tracking
- **Break Management** - Track lunch and break times separately
- **Location Tracking** - Assign work locations to sessions
- **Real-Time Updates** - Live status across all devices
- **Session History** - View recent time entries

### 📊 **Reporting & Analytics**
- **Weekly Reports** - Export detailed CSV reports
- **Employee Filtering** - Reports by individual or all employees
- **Break Time Calculation** - Work time excludes break periods
- **Location Data** - See where employees worked
- **Payroll Ready** - CSV format perfect for payroll systems

### 🔐 **Security & Management**
- **Secure Authentication** - Powered by Supabase Auth
- **Password Management** - Users can change passwords
- **Employee Invitation** - Admins create employee accounts
- **Data Security** - Row-level security policies

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- Supabase account
- Vercel account (for deployment)

### 1. Clone & Install
```bash
git clone https://github.com/yidy718/time-tracker-cloud.git
cd time-tracker-cloud
npm install
```

### 2. Database Setup
1. Create a new project at [supabase.com](https://supabase.com)
2. Go to SQL Editor in your Supabase dashboard
3. Copy and paste the entire contents of `database-schema.sql`
4. Click "RUN" to create all tables and policies

### 3. Environment Variables
Create `.env.local` file:
```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 4. Development
```bash
npm run dev
# Open http://localhost:3000
```

### 5. Deployment
Deploy to Vercel with one click:
1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on every push

## 📱 How to Use

### **For Administrators**

#### **Initial Setup**
1. Sign up as the first user (automatically becomes admin)
2. Complete organization setup
3. Add work locations (Office, Warehouse, Remote, etc.)
4. Invite employees

#### **Adding Employees**
1. Go to Admin Dashboard → Employees tab
2. Click "Add Employee"
3. Fill in employee details
4. Employee gets temporary password: `TempPass123!`
5. Share login credentials with employee

#### **Weekly Reports**
1. Go to Admin Dashboard → Reports tab
2. Select week and employee filter
3. Click "Export CSV"
4. Use CSV for payroll or record keeping

### **For Employees**

#### **First Login**
1. Sign in with credentials from admin
2. Use temporary password: `TempPass123!`
3. Click "Change Password" to set your own password
4. Start tracking time!

#### **Daily Time Tracking**
1. **Clock In**: Select location and click "Clock In"
2. **Take Breaks**: Click "Start Break" for lunch/breaks
3. **End Breaks**: Click "End Break" when returning
4. **Clock Out**: Click "Clock Out" when done (disabled during breaks)

#### **Break System**
- Break time is tracked separately from work time
- Cannot clock out while on break (prevents accidents)
- Work time = Total time - Break time
- Status shows "On Break" with yellow indicator

## 💾 Database Schema

### **Tables**
- **organizations** - Company/organization data
- **employees** - User profiles with roles (admin/manager/employee)
- **locations** - Work locations (Office, Remote, etc.)
- **time_sessions** - Clock in/out records with break tracking

### **Key Features**
- **Automatic Calculations** - Durations calculated by database triggers
- **Row-Level Security** - Users only see their organization's data
- **Real-Time Updates** - Live data with Supabase subscriptions
- **Break Tracking** - Separate break_start/break_end timestamps

## 🛠️ Technology Stack

### **Frontend**
- **Next.js 14** - React framework with SSR
- **Tailwind CSS** - Utility-first styling
- **React Hooks** - Modern React patterns

### **Backend**
- **Supabase** - PostgreSQL database + Auth + Real-time
- **Row-Level Security** - Database-level permissions
- **Automatic Triggers** - Duration calculations

### **Deployment**
- **Vercel** - Serverless deployment platform
- **GitHub Integration** - Automatic deployments
- **Environment Variables** - Secure configuration

## 📁 Project Structure

```
time-tracker-cloud/
├── components/
│   ├── AdminDashboard.js    # Admin interface
│   ├── TimeTracker.js       # Employee time clock
│   ├── Auth.js              # Login/signup
│   └── ReportsTab.js        # Weekly export functionality
├── lib/
│   └── supabase.js          # Database client & helpers
├── pages/
│   ├── _app.js              # App wrapper
│   └── index.js             # Main routing logic
├── styles/
│   └── globals.css          # Global styles + Tailwind
├── database-schema.sql      # Complete database setup
└── README.md               # This file
```

## 🔧 Configuration

### **Supabase Setup**
1. **Authentication**: Email/password enabled
2. **Row-Level Security**: Enabled on all tables
3. **Real-time**: Enabled for live updates

### **Environment Variables**
```bash
# Required
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Optional (for additional features)
NEXT_PUBLIC_APP_NAME=Your Company Name
```

## 👤 User Roles

### **Admin**
- Create/manage employees
- Add/edit locations
- Export weekly reports
- Access full dashboard
- Manage organization settings

### **Manager** 
- View team data
- Limited employee management
- Export reports
- Time tracking

### **Employee**
- Time clock interface only
- Clock in/out with breaks
- View own session history
- Change password

## 📊 CSV Export Format

Weekly reports include:
```csv
Employee,Date,Clock In,Clock Out,Break Time,Work Time,Location
"John Doe","1/20/2025","09:00:00","17:30:00","1:00","7:30","Main Office"
"Jane Smith","1/20/2025","08:30:00","16:45:00","0:30","7:45","Warehouse"
...
"TOTAL",,,,,,"42:15",
```

## 🔐 Security Features

- **Row-Level Security** - Database enforces data isolation
- **Authentication Required** - No anonymous access
- **Role-Based Permissions** - Different interfaces per role
- **Password Management** - Users control their passwords
- **Secure API Keys** - Environment variable configuration

## 🚀 Deployment Guide

### **Vercel Deployment**
1. Push code to GitHub
2. Connect repository to Vercel
3. Add environment variables
4. Deploy automatically

### **Custom Domain**
1. Add domain in Vercel dashboard
2. Update DNS records
3. SSL automatically configured

## 🆘 Troubleshooting

### **Common Issues**

**Database Connection Error**
- Check Supabase URL and API key
- Verify environment variables
- Ensure database schema is deployed

**No Employees Showing**
- Check organization setup
- Verify user roles in database
- Ensure RLS policies are active

**Export Not Working**
- Check browser popup blockers
- Verify time session data exists
- Check JavaScript console for errors

### **Support**
- Check database logs in Supabase dashboard
- Review browser console for errors
- Verify environment variables are set

## 📄 License

MIT License - feel free to use for commercial or personal projects.

## 👨‍💻 Credits

Made with ❤️ by yidy

**Built with:**
- [Next.js](https://nextjs.org/) - React framework
- [Supabase](https://supabase.com/) - Backend as a Service
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework
- [Vercel](https://vercel.com/) - Deployment platform

---

## 🎯 Perfect For

- **Small Businesses** - Track employee hours easily
- **Remote Teams** - Location-based time tracking
- **Contractors** - Detailed time logs for clients
- **Payroll Systems** - CSV exports for payroll processing
- **Project Management** - See where time is spent

Start tracking time professionally with Time Tracker Cloud! ⏰