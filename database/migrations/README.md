# Database Migrations

This folder contains database migration scripts for the time tracker application.

## Archive Folder
The `archive/` folder contains historical SQL scripts used during development. These are kept for reference but should not be run in production.

## Current Schema
- **organizations**: Company data
- **employees**: User accounts and roles  
- **locations**: Physical work locations
- **projects**: Client projects (assigned to locations)
- **time_sessions**: Clock in/out records

## Security Notes
- All tables use Row Level Security (RLS)
- Views use `security_invoker = true` 
- No sensitive data should be committed to git