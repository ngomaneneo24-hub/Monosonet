#!/usr/bin/env tsx

/**
 * Complete Sonet Migration Script
 * Updates all remaining AT Protocol imports and references to Sonet equivalents
 */

import fs from 'fs'
import path from 'path'
import {execSync} from 'child_process'

const REPLACEMENTS = {
  // Core imports
  '@atproto/api': '@sonet/api',
  '@atproto/common-web': '@sonet/types',
  '@atproto/lexicon': '@sonet/types',
  '@atproto/repo': '@sonet/api',
  '@atproto/xrpc': '@sonet/api',
  
  // Type imports
  'AppBsky': 'Sonet',
  'ComAtproto': 'Sonet',
  'ChatBsky': 'Sonet',
  'BskyAgent': 'SonetAppAgent',
  'AtpSessionData': 'SonetSessionData',
  'AtpSessionEvent': 'SonetSessionEvent',
  
  // Constants and URLs
  'bsky.app': 'sonet.app',
  'bsky.social': 'sonet.social',
  'blueskyweb': 'sonetweb',
  'at://': 'sonet://',
  'https://bsky.app': 'https://sonet.app',
  
  // Terminology
  'Note': 'Note',
  'note': 'note',
  'Renote': 'Renote',
  'renote': 'renote',
  'Handle': 'Username',
  'handle': 'username',
  'DID': 'UserID',
  'did': 'userId',
  'subscribed-note': 'subscribed-note',
  
  // File paths
  'expo-bluesky-swiss-army': 'expo-sonet-swiss-army',
  'bskyweb': 'sonetweb',
  'bskyembed': 'sonetembed',
}

function updateFile(filePath: string): void {
  try {
    let content = fs.readFileSync(filePath, 'utf8')
    let updated = false
    
    // Apply all replacements
    for (const [oldStr, newStr] of Object.entries(REPLACEMENTS)) {
      if (content.includes(oldStr)) {
        content = content.replace(new RegExp(oldStr, 'g'), newStr)
        updated = true
      }
    }
    
    // Additional specific replacements
    if (content.includes('$type')) {
      content = content.replace(/\$type:\s*['"][^'"]*['"]/g, 'type: "sonet"')
      updated = true
    }
    
    if (content.includes('app.bsky.')) {
      content = content.replace(/app\.bsky\./g, 'app.sonet.')
      updated = true
    }
    
    if (content.includes('com.atproto.')) {
      content = content.replace(/com\.atproto\./g, 'com.sonet.')
      updated = true
    }
    
    if (updated) {
      fs.writeFileSync(filePath, content, 'utf8')
      console.log(`✅ Updated: ${filePath}`)
    }
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error)
  }
}

function processDirectory(dirPath: string): void {
  const items = fs.readdirSync(dirPath)
  
  for (const item of items) {
    const fullPath = path.join(dirPath, item)
    const stat = fs.statSync(fullPath)
    
    if (stat.isDirectory()) {
      // Skip node_modules and other non-source directories
      if (!item.startsWith('.') && item !== 'node_modules' && item !== 'dist' && item !== 'build') {
        processDirectory(fullPath)
      }
    } else if (item.endsWith('.ts') || item.endsWith('.tsx') || item.endsWith('.js') || item.endsWith('.jsx')) {
      // Skip test files for now
      if (!item.includes('.test.') && !item.includes('.spec.')) {
        updateFile(fullPath)
      }
    }
  }
}

function main(): void {
  console.log('🚀 Starting Complete Sonet Migration...')
  
  const sourceDir = path.join(process.cwd(), 'src')
  
  if (!fs.existsSync(sourceDir)) {
    console.error('❌ Source directory not found:', sourceDir)
    process.exit(1)
  }
  
  console.log(`📁 Processing directory: ${sourceDir}`)
  processDirectory(sourceDir)
  
  // Update package.json
  const packagePath = path.join(process.cwd(), 'package.json')
  if (fs.existsSync(packagePath)) {
    console.log('📦 Updating package.json...')
    updateFile(packagePath)
  }
  
  // Update tsconfig.json
  const tsconfigPath = path.join(process.cwd(), 'tsconfig.json')
  if (fs.existsSync(tsconfigPath)) {
    console.log('⚙️ Updating tsconfig.json...')
    updateFile(tsconfigPath)
  }
  
  // Update webpack.config.js
  const webpackPath = path.join(process.cwd(), 'webpack.config.js')
  if (fs.existsSync(webpackPath)) {
    console.log('🔧 Updating webpack.config.js...')
    updateFile(webpackPath)
  }
  
  console.log('🎉 Migration completed!')
  console.log('📝 Next steps:')
  console.log('   1. Run: npm install')
  console.log('   2. Run: npm run test')
  console.log('   3. Run: npm run build')
  console.log('   4. Fix any remaining type errors')
}

if (require.main === module) {
  main()
}