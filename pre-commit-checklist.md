# Pre-Commit Checklist

## Code Quality
- [ ] All components have proper imports
- [ ] No console.log statements in production code
- [ ] Error handling implemented for all async operations
- [ ] Loading states implemented for all data fetching
- [ ] TypeScript errors resolved (if using TS)
- [ ] ESLint warnings addressed

## Functionality 
- [ ] Multi-company selection works
- [ ] Role-based dashboards render correctly
- [ ] Expense tracking end-to-end functional
- [ ] CSV exports include expense data
- [ ] Company context switching works
- [ ] All existing features still work

## Database
- [ ] Migration runs without errors
- [ ] RLS policies tested and working
- [ ] Functions return expected results
- [ ] Indexes created for performance
- [ ] Data migration completed successfully

## Security
- [ ] Cross-company data access blocked
- [ ] Role permissions enforced
- [ ] User input validated and sanitized
- [ ] No sensitive data in logs
- [ ] RLS policies comprehensive

## Performance
- [ ] Page load times acceptable
- [ ] Large dataset exports complete in reasonable time
- [ ] Database queries optimized
- [ ] Component re-renders minimized

## User Experience
- [ ] UI is intuitive and responsive
- [ ] Error messages are user-friendly
- [ ] Loading states provide feedback
- [ ] Navigation flows make sense
- [ ] Mobile experience tested

## Documentation
- [ ] New features documented
- [ ] API changes noted
- [ ] Migration instructions clear
- [ ] Testing procedures documented

## Backup Plan
- [ ] Database backup created before migration
- [ ] Rollback plan documented
- [ ] Feature flags implemented for gradual rollout
- [ ] Monitoring alerts configured