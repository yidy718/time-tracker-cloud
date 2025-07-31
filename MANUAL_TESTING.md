# Manual Testing Script for Multi-Company Features

## Setup Phase

### 1. Database Preparation
```sql
-- Create test organizations
INSERT INTO organizations (name, enable_expenses) VALUES 
('Test Company A', true),
('Test Company B', false);

-- Get organization IDs for testing
SELECT id, name FROM organizations ORDER BY created_at DESC LIMIT 2;
```

### 2. Multi-Company User Setup
```sql
-- Assign a test user to multiple companies
-- Replace 'USER_UUID' with actual user ID
INSERT INTO user_organizations (user_id, organization_id, role, is_primary) VALUES
('USER_UUID', 'ORG_A_UUID', 'employee', true),
('USER_UUID', 'ORG_B_UUID', 'manager', false);
```

### 3. Role Testing Setup
```sql
-- Create test users for different roles
INSERT INTO user_organizations (user_id, organization_id, role) VALUES
('MANAGER_USER_UUID', 'ORG_A_UUID', 'manager'),
('NON_CLOCK_USER_UUID', 'ORG_A_UUID', 'non_clock_worker');
```

## Testing Scenarios

### Scenario 1: Multi-Company User Login
**Steps:**
1. Login as multi-company user
2. **Expected:** Company selection modal appears
3. Select Company A
4. **Expected:** Dashboard loads with Company A context
5. Check if company name appears in header
6. **Expected:** All data shows only Company A information

**Validation:**
- [ ] Modal appears with correct companies listed
- [ ] Primary company is highlighted
- [ ] Selection works and modal closes
- [ ] Company context is set correctly

### Scenario 2: Single-Company User Login  
**Steps:**
1. Login as single-company user
2. **Expected:** No selection modal, direct to dashboard
3. **Expected:** Company auto-selected and context set

**Validation:**
- [ ] No modal appears
- [ ] Dashboard loads immediately
- [ ] Correct company context set

### Scenario 3: Manager Role Testing
**Steps:**
1. Login as manager user
2. **Expected:** Manager Dashboard loads
3. Check available tabs
4. **Expected:** Only "Project Management" and "Reports" tabs
5. Try to access employee management
6. **Expected:** No employee management options visible

**Validation:**
- [ ] Manager dashboard renders
- [ ] Limited functionality shown
- [ ] Can manage projects
- [ ] Can view reports
- [ ] Cannot manage employees

### Scenario 4: Non-Clock Worker Testing
**Steps:**
1. Login as non-clock worker
2. **Expected:** Tasks-only dashboard loads
3. Look for clock-in/out buttons
4. **Expected:** No time tracking UI visible
5. Check tasks access
6. **Expected:** Can view and manage tasks

**Validation:**
- [ ] Non-clock worker dashboard renders
- [ ] No clock-in/out functionality
- [ ] Tasks are accessible
- [ ] Warning message about role displayed

### Scenario 5: Expenses Feature Testing
**Steps:**
1. Login as regular employee (in company with expenses enabled)
2. Clock in and work for a few minutes
3. Clock out
4. **Expected:** Expense modal appears
5. Add an expense with amount and description
6. **Expected:** Expense saved successfully
7. Check reports for expense data
8. **Expected:** Expense appears in CSV export

**Validation:**
- [ ] Expense modal appears after clock-out
- [ ] Form validates input correctly
- [ ] Expense saves to database
- [ ] Expense appears in reports
- [ ] CSV export includes expense column

### Scenario 6: Company Context Switching
**Steps:**
1. Login as multi-company user
2. Select Company A initially
3. Navigate to a page with company-specific data
4. Switch to Company B (if switching feature implemented)
5. **Expected:** Data refreshes to show Company B information
6. **Expected:** All queries filter by new company context

**Validation:**
- [ ] Company switching works
- [ ] Data updates correctly
- [ ] Context persists across navigation
- [ ] RLS policies enforce data isolation

## Error Testing

### Invalid Data Testing
**Steps:**
1. Try to add expense with negative amount
2. **Expected:** Validation error
3. Try to assign user to non-existent company
4. **Expected:** Database constraint error
5. Try to access data from wrong company
6. **Expected:** RLS policy blocks access

**Validation:**
- [ ] Form validation works
- [ ] Database constraints enforced
- [ ] RLS policies prevent unauthorized access

## Performance Testing

### Load Testing
**Steps:**
1. Create multiple companies (10+)
2. Assign user to all companies
3. **Expected:** Selection modal loads quickly
4. Test with large expense datasets
5. **Expected:** Reports export in reasonable time

**Validation:**
- [ ] Performance acceptable with multiple companies
- [ ] Large datasets handled efficiently
- [ ] No significant slowdown in UI

## Cleanup

### Test Data Cleanup
```sql
-- Remove test data
DELETE FROM expenses WHERE description LIKE 'TEST%';
DELETE FROM user_organizations WHERE organization_id IN (
  SELECT id FROM organizations WHERE name LIKE 'Test Company%'
);
DELETE FROM organizations WHERE name LIKE 'Test Company%';
```

## Sign-off

### Final Checks
- [ ] All core functionality works
- [ ] No existing features broken
- [ ] Performance acceptable
- [ ] Security policies working
- [ ] Error handling appropriate
- [ ] User experience intuitive

**Tested by:** ________________
**Date:** ________________
**Version:** ________________
**Notes:** ________________