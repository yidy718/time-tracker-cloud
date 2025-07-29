# ⏰ VasHours - The Time Tracker That Actually Works 🎯

*Because keeping track of when your employees are "totally working from home" shouldn't be rocket science*

A comprehensive multi-tenant SaaS time tracking solution that's more reliable than your morning coffee and easier to use than ordering pizza online. Built with Next.js and Supabase because we believe in using good tools, not just trendy ones.

## 🚀 What Makes This Thing Special?

### 👑 **Super Admin Powers** (With Great Power Comes Great Responsibility)
- Manage multiple companies like a digital overlord
- Create companies faster than you can say "enterprise solution"
- Delete companies (but please don't - think of the employees!)
- Reset manager passwords when they inevitably forget them
- Monitor everything with the vigilance of a helicopter parent

### 🏢 **Company Admin Dashboard** (Your Command Center)
- **Employee Management**: Add, edit, and manage your workforce with cards so pretty you'll want to frame them
- **Location Tracking**: Because "I'm working from the beach" needs verification
- **Client Projects**: Organize work like a pro (billing rates included, because money matters)
- **Reports & Analytics**: CSV exports so detailed, your accountant will cry tears of joy
- **Payroll Integration**: Hourly rates and automatic calculations - math has never been this fun

### 👤 **Employee Interface** (Simple, Because It Should Be)
- Clock in/out with one button (revolutionary, we know)
- Location selection (no more "I was definitely at the office" debates)
- Break tracking with reasons (yes, "bathroom break" is a valid reason)
- Session history so you can reminisce about that time you worked 12 hours straight

## 🛠️ Tech Stack (The Good Stuff)

**Frontend:** Next.js 14 + Tailwind CSS (because life's too short for ugly interfaces)
**Backend:** Supabase (PostgreSQL + Auth + Real-time magic)
**Mobile:** React Native with Expo (your pocket-sized time tracker)
**Deployment:** Vercel (because it just works™)

## 📱 Features That Will Make You Smile

### 🎨 **UI/UX That Doesn't Suck**
- **Responsive Design**: Looks good on everything from your phone to your grandmother's tablet
- **Dark Theme**: Easy on the eyes during those late-night admin sessions
- **Modern Cards**: Employee cards so sleek, they make business cards jealous
- **Smooth Animations**: Because who doesn't love a little eye candy?

### 📊 **Reports That Actually Help**
- **CSV Exports**: Download data faster than your patience runs out
- **Payroll Calculations**: Automatic math (no calculator required)
- **Location Filtering**: Find that one employee who's always "working remotely"
- **Date Range Selection**: Because sometimes you need to see what happened last Tuesday

### 🔐 **Security That Won't Keep You Up at Night**
- **Row Level Security**: Your data stays YOUR data
- **Multi-tenant Architecture**: Companies can't peek at each other's stuff
- **Secure Authentication**: Username/password for employees, email/password for admins
- **Password Reset**: For when "password123" stops working

## 🏗️ Project Structure (Organized Chaos)

```
time-tracker-cloud/
├── components/              # The React magic happens here
│   ├── AdminDashboard.js      # Where admins feel powerful
│   ├── SuperAdminDashboard.js # Ultimate power interface
│   ├── TimeTracker.js         # Employee time tracking magic
│   ├── ReportsTab.js          # Where numbers become insights
│   └── CompanySetupWizard.js  # Making company creation easy
├── lib/                     # The behind-the-scenes heroes
│   └── supabase.js            # Database communication central
├── pages/                   # Next.js routing goodness
├── mobile-app/              # Pocket-sized time tracking
├── supabase/               # Database migrations
└── styles/                 # Making things look pretty
```

## 🚀 Getting Started (AKA "How to Make This Work")

### Prerequisites (The Boring But Necessary Stuff)
- Node.js 18+ (because we're not living in 2019)
- Supabase account (it's free, don't worry)
- Git (you know why you're here)
- Coffee ☕ (optional but highly recommended)

### 1. Clone & Install (The Easy Part)
```bash
git clone https://github.com/your-username/time-tracker-cloud.git
cd time-tracker-cloud
npm install
# Go grab that coffee while npm does its thing
```

### 2. Environment Setup (The "Don't Skip This" Part)
Create `.env.local` and fill it with your Supabase secrets:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_super_secret_key_here
```

### 3. Database Setup (The "This Better Work" Moment)
```bash
# Run the database schema
# Copy-paste the SQL files into your Supabase SQL Editor
# Or use the migration files in supabase/migrations/
# Cross your fingers and hope for the best
```

### 4. Run Development Server (The Moment of Truth)
```bash
npm run dev
# Visit http://localhost:3000
# If it works, do a little dance
```

## 🌟 What's New and Improved?

### ✨ **Recent Upgrades** (The Good Stuff We Just Added)
- **📱 Mobile-First Design**: Dropdown menus that actually stay on screen (revolutionary!)
- **💳 Employee Cards**: Redesigned to look like they belong in 2025, not 2005
- **📍 Location Management**: Full CRUD operations because sometimes locations change
- **💰 Payroll Features**: Hourly rates and automatic calculations (your bookkeeper will love you)
- **💼 Client Projects**: Organize work by client with billing rates (money talks)
- **✏️ Super Admin Edit**: Actually edit companies instead of just staring at them
- **🔑 Password Reset**: Because everyone forgets passwords (yes, even you)

### 🎯 **Key Features That Make Life Better**
- **Real-time Updates**: See changes instantly (like magic, but with WebSockets)
- **Offline Support**: Works even when your WiFi doesn't
- **Multi-language Ready**: Currently speaks English, but ready to learn more
- **Audit Trail**: Track who did what, when (for those "who changed this?" moments)

## 🚀 Deployment (Making It Live)

### 🌐 **Live on Vercel** (Because It Just Works)
**Production URL**: Coming soon! (Building an awesome landing page first)

### 🔄 **Continuous Deployment** (Set It and Forget It)
- Push to `main` branch → Automatic deployment
- Environment variables managed in Vercel dashboard
- Build errors will make the deploy fail (as they should)
- Rollback available if things go sideways

## 🎭 **User Roles Explained** (Who Can Do What)

### 👑 **Super Admin** (The Digital Overlord)
- Creates and manages companies
- Resets manager passwords
- Views all company data
- Activates/deactivates companies
- Basically, can do everything (use responsibly)

### 🏢 **Company Admin** (The Manager)
- Manages employees within their company
- Creates locations and projects
- Generates reports and exports
- Sets employee hourly rates
- Cannot see other companies' data (privacy is key)

### 👤 **Employee** (The Worker Bee)
- Clocks in/out at assigned locations
- Takes breaks (everyone needs them)
- Views their own time history
- Cannot access other employees' data

## 🤓 **Technical Deep Dive** (For the Nerds)

### 🏗️ **Architecture Decisions**
- **Multi-tenancy**: Row Level Security ensures data isolation
- **Real-time**: Supabase subscriptions for live updates
- **State Management**: React hooks (keeping it simple)
- **Styling**: Tailwind CSS (utility-first for the win)
- **Authentication**: Dual system (Supabase Auth + custom employee auth)

### 📊 **Database Schema Highlights**
- `organizations` table with RLS policies
- `employees` table with custom authentication
- `time_sessions` with automatic duration calculation
- `client_projects` for work organization
- `locations` for attendance tracking

## 🐛 **Troubleshooting** (When Things Go Wrong)

### Common Issues and Solutions:
1. **"Database not defined" error**: Check your environment variables
2. **Employee can't log in**: Verify the employee exists and is active
3. **Dropdown menus disappear**: We fixed this (you're welcome)
4. **Time calculations wrong**: Check timezone settings
5. **"It doesn't work"**: Have you tried turning it off and on again?

## 🤝 **Contributing** (Join the Fun)

1. Fork the repo (make it your own)
2. Create a feature branch (`git checkout -b feature/amazing-new-thing`)
3. Write some code (make it good)
4. Test it (please, for the love of code)
5. Commit with a good message (`git commit -m 'Add amazing new thing'`)
6. Push and create a Pull Request
7. Wait for review (be patient, we're only human)

## 🙏 **Special Thanks** (The Heroes Behind the Scenes)

- **KIKI** 🦸‍♀️ - Our amazing red-headed testing superhero who broke things so we could fix them (and made everything better in the process!)

## 📝 **License** (The Legal Stuff)

This project is proprietary software built with love and caffeine. All rights reserved to yidy and the coffee that made this possible.

## 🆘 **Support** (When You Need Help)

- 🐛 **Found a bug?** Create an issue (with details, please)
- 💡 **Have an idea?** We love suggestions
- 🤔 **Need help?** Check existing issues first
- ☕ **Want to buy us coffee?** We accept virtual coffee

## 🎉 **Credits** (The Amazing People)

**Built with ❤️ (and lots of ☕) by yidy**

Special thanks to:
- Supabase team for making backend simple
- Vercel for hosting magic
- Tailwind CSS for making CSS bearable
- The countless Stack Overflow answers that saved our sanity
- Claude AI for being an amazing coding partner 🤖

---

*"Time tracking software that doesn't make you want to throw your computer out the window"* - Probably someone, somewhere

**Live Demo**: Contact us for a private demo!
**GitHub**: Making code social since... well, since GitHub existed

---

### 🔮 **Coming Soon** (The Future is Bright)
- 📱 Mobile app (because your phone needs more apps)
- 🌍 Multi-language support (habla español?)
- 📈 Advanced analytics (more graphs = more insights)
- 🔔 Push notifications (because who doesn't love alerts?)
- 🎯 Goal tracking (set those targets)
- 🤖 AI insights (because AI is apparently in everything now)

*Remember: Good software is like a good joke - if you have to explain it, it's probably not that good. Fortunately, this one explains itself!* 😄