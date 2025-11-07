#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const packagePath = path.join(__dirname, '..', 'package.json')
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'))

const oldVersion = packageJson.version
const [major, minor, patch] = oldVersion.split('.').map(Number)
const newVersion = `${major}.${minor}.${patch + 1}`

packageJson.version = newVersion
fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n')

console.log(`Version updated from ${oldVersion} to ${newVersion}`)

const appPath = path.join(__dirname, '..', 'src', 'App.vue')
if (fs.existsSync(appPath)) {
  let appContent = fs.readFileSync(appPath, 'utf8')
  const versionRegex = /(version\s+)(\d+\.\d+\.\d+)/gi
  if (versionRegex.test(appContent)) {
    appContent = appContent.replace(versionRegex, `$1${newVersion}`)
    fs.writeFileSync(appPath, appContent)
    console.log(`Updated version in App.vue to ${newVersion}`)
  }
}

console.log(`Version ${newVersion} ready for commit!`)