#!/usr/bin/env node

/**
 * Phase 3 Testing Runner
 * 
 * This script helps run automated tests and provides testing guidance
 * for the Sonet messaging Phase 3 implementation.
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Sonet Phase 3 Testing Runner');
console.log('================================\n');

// Check if we're in the right directory
const packageJsonPath = path.join(process.cwd(), 'package.json');
if (!fs.existsSync(packageJsonPath)) {
  console.error('❌ Error: Please run this script from the sonet-client directory');
  process.exit(1);
}

// Check for test files
const testFiles = [
  'src/tests/Phase3.test.tsx',
  'src/services/sonetMessagingApi/realtime.ts',
  'src/services/sonetMessagingApi/offline.ts',
  'src/services/sonetMessagingApi/pushNotifications.ts',
  'src/services/sonetMessagingApi/encryption.ts'
];

console.log('📋 Checking Phase 3 Implementation Files...\n');

let filesFound = 0;
testFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file}`);
    filesFound++;
  } else {
    console.log(`❌ ${file} - Missing`);
  }
});

console.log(`\n📊 Files Status: ${filesFound}/${testFiles.length} found\n`);

if (filesFound === 0) {
  console.log('❌ No Phase 3 files found. Please ensure Phase 3 has been implemented.');
  process.exit(1);
}

// Check package.json for test scripts
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const hasTestScript = packageJson.scripts && packageJson.scripts.test;

console.log('🔍 Checking Testing Setup...\n');

if (hasTestScript) {
  console.log('✅ Test script found in package.json');
  console.log(`   Run: npm test`);
} else {
  console.log('❌ No test script found in package.json');
}

// Check for testing dependencies
const dependencies = packageJson.dependencies || {};
const devDependencies = packageJson.devDependencies || {};
const allDeps = { ...dependencies, ...devDependencies };

const requiredDeps = [
  'jest',
  '@testing-library/react-native',
  '@testing-library/jest-native'
];

console.log('\n📦 Checking Testing Dependencies...\n');

requiredDeps.forEach(dep => {
  if (allDeps[dep]) {
    console.log(`✅ ${dep} - ${allDeps[dep]}`);
  } else {
    console.log(`❌ ${dep} - Missing`);
  }
});

// Provide testing instructions
console.log('\n🚀 Phase 3 Testing Instructions');
console.log('================================\n');

console.log('1. 📱 Manual Testing:');
console.log('   - Use the testing checklist: PHASE3_TESTING_CHECKLIST.md');
console.log('   - Test each feature manually in the app');
console.log('   - Document any issues found\n');

console.log('2. 🧪 Automated Testing:');
if (hasTestScript) {
  console.log('   - Run: npm test');
  console.log('   - Run specific tests: npm test -- Phase3.test.tsx');
} else {
  console.log('   - Set up Jest testing framework');
  console.log('   - Add test script to package.json');
}

console.log('\n3. 🔍 Feature Testing:');
console.log('   - Real-time messaging (WebSocket)');
console.log('   - Offline message queuing');
console.log('   - Push notifications');
console.log('   - Encryption system');
console.log('   - Message reactions');
console.log('   - Voice notes\n');

console.log('4. 📊 Performance Testing:');
console.log('   - Message delivery speed');
console.log('   - App responsiveness');
console.log('   - Memory usage');
console.log('   - Battery consumption\n');

console.log('5. 🐛 Error Testing:');
console.log('   - Network disconnection');
console.log('   - Invalid input handling');
console.log('   - Service error responses\n');

// Check for specific test files
console.log('🔍 Detailed File Analysis:\n');

const serviceFiles = [
  'src/services/sonetMessagingApi/realtime.ts',
  'src/services/sonetMessagingApi/offline.ts',
  'src/services/sonetMessagingApi/pushNotifications.ts',
  'src/services/sonetMessagingApi/encryption.ts'
];

serviceFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n').length;
    const hasClass = content.includes('class ');
    const hasInterface = content.includes('interface ');
    const hasExport = content.includes('export ');
    
    console.log(`📄 ${file}:`);
    console.log(`   Lines: ${lines}`);
    console.log(`   Classes: ${hasClass ? 'Yes' : 'No'}`);
    console.log(`   Interfaces: ${hasInterface ? 'Yes' : 'No'}`);
    console.log(`   Exports: ${hasExport ? 'Yes' : 'No'}\n`);
  }
});

console.log('🎯 Next Steps:');
console.log('1. Complete manual testing using the checklist');
console.log('2. Run automated tests if available');
console.log('3. Document any issues found');
console.log('4. Fix critical bugs before proceeding');
console.log('5. Begin Phase 4 planning\n');

console.log('✅ Phase 3 Testing Runner Complete!');
console.log('📋 Use PHASE3_TESTING_CHECKLIST.md for detailed testing');
console.log('🚀 Ready to test your Phase 3 implementation!');