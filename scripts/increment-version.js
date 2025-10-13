#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read package.json
const packagePath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

// Parse current version
const [major, minor, patch] = packageJson.version.split('.').map(Number);

// Increment patch version
const newVersion = `${major}.${minor}.${patch + 1}`;

// Update package.json
packageJson.version = newVersion;
fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');

console.log(`Version updated from ${packageJson.version} to ${newVersion}`);

// Update version in App.vue if it exists
const appPath = path.join(__dirname, '..', 'src', 'App.vue');
if (fs.existsSync(appPath)) {
  let appContent = fs.readFileSync(appPath, 'utf8');
  
  // Look for version in comments or constants
  const versionRegex = /version.*?(\d+\.\d+\.\d+)/gi;
  if (versionRegex.test(appContent)) {
    appContent = appContent.replace(versionRegex, `version ${newVersion}`);
    fs.writeFileSync(appPath, appContent);
    console.log(`Updated version in App.vue to ${newVersion}`);
  }
}

console.log(`Version ${newVersion} ready for commit!`);