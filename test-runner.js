#!/usr/bin/env node

// Test runner for multi-company features
// Run with: node test-runner.js

const fs = require('fs');
const path = require('path');

console.log('🚀 Multi-Company Features Test Runner\n');

// Test 1: Check if migration file exists and is valid
function testMigrationFile() {
  console.log('📝 Testing Migration File...');
  
  const migrationFile = '20250731000003_multi_company_features.sql';
  const exists = fs.existsSync(migrationFile);
  
  if (exists) {
    const content = fs.readFileSync(migrationFile, 'utf8');
    const checks = {
      'Has user_organizations table': content.includes('CREATE TABLE user_organizations'),
      'Has expenses table': content.includes('CREATE TABLE expenses'),
      'Has new role enum': content.includes("ADD VALUE 'non_clock_worker'"),
      'Has RLS policies': content.includes('CREATE POLICY'),
      'Has functions': content.includes('get_user_organizations'),
      'Has indexes': content.includes('CREATE INDEX'),
      'Has data migration': content.includes('INSERT INTO user_organizations')
    };
    
    Object.entries(checks).forEach(([check, passed]) => {
      console.log(`  ${passed ? '✅' : '❌'} ${check}`);
    });
  } else {
    console.log('  ❌ Migration file not found');
  }
  console.log('');
}

// Test 2: Check if component files exist and have basic structure
function testComponentFiles() {
  console.log('🧩 Testing Component Files...');
  
  const components = [
    'CompanySelectionModal.js',
    'ManagerDashboard.js', 
    'NonClockWorkerDashboard.js',
    'ExpenseEntry.js',
    'ExpenseModal.js'
  ];
  
  components.forEach(component => {
    const filePath = path.join('components', component);
    const exists = fs.existsSync(filePath);
    
    if (exists) {
      const content = fs.readFileSync(filePath, 'utf8');
      const hasExport = content.includes('export default');
      const hasReact = content.includes('useState') || content.includes('useEffect');
      
      console.log(`  ${hasExport && hasReact ? '✅' : '❌'} ${component}`);
    } else {
      console.log(`  ❌ ${component} (not found)`);
    }
  });
  console.log('');
}

// Test 3: Check package.json for required dependencies
function testDependencies() {
  console.log('📦 Testing Dependencies...');
  
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    const required = ['react', 'next', '@supabase/supabase-js'];
    
    required.forEach(dep => {
      const exists = dependencies[dep];
      console.log(`  ${exists ? '✅' : '❌'} ${dep}${exists ? ` (${dependencies[dep]})` : ''}`);
    });
  } catch (error) {
    console.log('  ❌ Could not read package.json');
  }
  console.log('');
}

// Test 4: Check existing files that need modification
function testExistingFiles() {
  console.log('🔄 Testing Existing Files for Modification...');
  
  const filesToCheck = [
    { file: 'components/TimeTracker.js', should: 'add expense modal integration' },
    { file: 'components/ReportsTab.js', should: 'add expense column to exports' },
    { file: 'pages/_app.js', should: 'add company selection logic' }
  ];
  
  filesToCheck.forEach(({ file, should }) => {
    const exists = fs.existsSync(file);
    console.log(`  ${exists ? '✅' : '❌'} ${file} - ${should}`);
  });
  console.log('');
}

// Test 5: Validate SQL syntax (basic check)
function testSQLSyntax() {
  console.log('🔍 Testing SQL Syntax...');
  
  const migrationFile = '20250731000003_multi_company_features.sql';
  
  if (fs.existsSync(migrationFile)) {
    const content = fs.readFileSync(migrationFile, 'utf8');
    
    // Basic syntax checks
    const checks = {
      'Balanced parentheses': (content.match(/\(/g) || []).length === (content.match(/\)/g) || []).length,
      'All statements end with semicolon': !content.split('\n').filter(line => 
        line.trim() && 
        !line.trim().startsWith('--') && 
        !line.trim().endsWith(';') &&
        !line.trim().endsWith('$$') &&
        !line.trim().startsWith('$$')
      ).length,
      'No obvious typos in keywords': !content.match(/\b(CREAT|TABEL|SLECT|INSRT)\b/i)
    };
    
    Object.entries(checks).forEach(([check, passed]) => {
      console.log(`  ${passed ? '✅' : '❌'} ${check}`);
    });
  } else {
    console.log('  ❌ Migration file not found');
  }
  console.log('');
}

// Run all tests
function runAllTests() {
  testMigrationFile();
  testComponentFiles();
  testDependencies();
  testExistingFiles();
  testSQLSyntax();
  
  console.log('🏁 Test Summary Complete!');
  console.log('\n📋 Next steps:');
  console.log('  1. Run manual tests from MANUAL_TESTING.md');
  console.log('  2. Test on development database copy');
  console.log('  3. Verify all components render without errors');
  console.log('  4. Test role-based access controls');
  console.log('  5. Validate expense tracking end-to-end');
}

// Execute tests
runAllTests();