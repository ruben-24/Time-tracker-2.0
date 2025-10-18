#!/usr/bin/env node
/*
  Patch iOS Info.plist to enable Files app access to Documents folder:
  - UIFileSharingEnabled = true
  - LSSupportsOpeningDocumentsInPlace = true

  Usage (after `npx cap sync ios`):
    node scripts/patch-ios-filesharing.js
*/

const fs = require('fs')
const path = require('path')

const possiblePlistPaths = [
  path.join('ios', 'App', 'App', 'Info.plist'),
  path.join('ios', 'App', 'Info.plist'),
]

function findInfoPlist() {
  for (const p of possiblePlistPaths) {
    if (fs.existsSync(p)) return p
  }
  return null
}

function ensureKey(content, key, valueTag) {
  if (content.includes(`<key>${key}</key>`)) return content
  const insertAt = content.lastIndexOf('</dict>')
  if (insertAt === -1) return content
  const indent = '  '
  const snippet = `\n${indent}<key>${key}</key>\n${indent}<${valueTag}/>`
  return content.slice(0, insertAt) + snippet + '\n' + content.slice(insertAt)
}

function run() {
  const plistPath = findInfoPlist()
  if (!plistPath) {
    console.log('[patch-ios-filesharing] Info.plist not found. Skipping.')
    process.exit(0)
  }

  let content = fs.readFileSync(plistPath, 'utf8')

  // Basic guard to ensure this looks like a plist
  if (!content.includes('<plist') || !content.includes('<dict>')) {
    console.warn('[patch-ios-filesharing] File does not look like a plist. Skipping safe patch.')
    process.exit(0)
  }

  const before = content
  content = ensureKey(content, 'UIFileSharingEnabled', 'true')
  content = ensureKey(content, 'LSSupportsOpeningDocumentsInPlace', 'true')

  if (content !== before) {
    fs.writeFileSync(plistPath, content, 'utf8')
    console.log(`[patch-ios-filesharing] Patched ${plistPath} to enable Files access.`)
  } else {
    console.log('[patch-ios-filesharing] Keys already present. No changes made.')
  }
}

run()
