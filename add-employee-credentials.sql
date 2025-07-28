-- Add username and password fields to employees table
ALTER TABLE employees ADD COLUMN IF NOT EXISTS username VARCHAR(50) UNIQUE;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS password VARCHAR(255);

-- Update existing employees to have usernames (if any exist)
-- This is for any existing employees that might not have usernames
UPDATE employees SET 
    username = LOWER(first_name || '.' || last_name),
    password = 'password123'
WHERE username IS NULL;
EOF < /dev/null