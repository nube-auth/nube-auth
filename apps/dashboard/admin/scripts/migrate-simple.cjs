#!/usr/bin/env node
/**
 * Simple Regex-Based UnoCSS Migration Script
 * 
 * This script uses regex patterns to replace common inline style patterns
 * with UnoCSS utility classes. Simpler than AST parsing but handles 80% of cases.
 * 
 * Usage: node scripts/migrate-simple.js [--dry-run]
 */

const fs = require('fs');
const path = require('path');

// Pattern replacements: [regex, replacement, description]
const PATTERNS = [
  // Common style={{ ... }} patterns that can be directly replaced
  [/style=\{\{\s*display:\s*["']flex["']\s*\}\}/g, 'className="flex"', 'display: flex'],
  [/style=\{\{\s*display:\s*["']grid["']\s*\}\}/g, 'className="grid"', 'display: grid'],
  
  // Multiple properties - more complex patterns
  [
    /style=\{\{\s*display:\s*["']flex["'],\s*gap:\s*["']12px["']\s*\}\}/g,
    'className="flex gap-3"',
    'flex with gap-12px'
  ],
  [
    /style=\{\{\s*display:\s*["']flex["'],\s*alignItems:\s*["']center["']\s*\}\}/g,
    'className="flex items-center"',
    'flex with alignItems-center'
  ],
  [
    /style=\{\{\s*display:\s*["']flex["'],\s*justifyContent:\s*["']space-between["']\s*\}\}/g,
    'className="flex justify-between"',
    'flex with justifyContent-space-between'
  ],
  
  // Merge with existing className
  [
    /className=["']([^"']*)["']\s+style=\{\{\s*display:\s*["']flex["']\s*\}\}/g,
    'className="$1 flex"',
    'merge flex with existing className'
  ],
];

// More comprehensive replacements for common multi-property style blocks
const BLOCK_PATTERNS = [
  {
    // Breadcrumb pattern
    find: /style=\{\{\s*display:\s*["']flex["'],\s*alignItems:\s*["']center["'],\s*gap:\s*["']8px["'],\s*marginBottom:\s*["']24px["']\s*\}\}/g,
    replace: 'className="breadcrumb"',
    desc: 'breadcrumb navigation'
  },
  {
    // Card pattern
    find: /style=\{\{\s*background:\s*["']var\(--card-bg\)["'],\s*padding:\s*["']24px["'],\s*borderRadius:\s*["']12px["']\s*\}\}/g,
    replace: 'className="card"',
    desc: 'card component'
  },
  {
    // Button primary base
    find: /style=\{\{\s*padding:\s*["']10px\s*20px["'],\s*fontSize:\s*["']14px["'],\s*fontWeight:\s*["']500["'],\s*borderRadius:\s*["']6px["']\s*\}\}/g,
    replace: 'className="px-5 py-2.5 text-14px font-medium rounded-md"',
    desc: 'button base styles'
  },
];

function replaceInFile(filePath, dryRun = false) {
  let content = fs.readFileSync(filePath, 'utf-8');
  const originalContent = content;
  let replacements = 0;
  const applied = [];

  // Apply block patterns first (more specific)
  for (const pattern of BLOCK_PATTERNS) {
    const matches = content.match(pattern.find);
    if (matches) {
      content = content.replace(pattern.find, pattern.replace);
      replacements += matches.length;
      applied.push(`${matches.length}x ${pattern.desc}`);
    }
  }

  // Apply simple patterns
  for (const [regex, replacement, desc] of PATTERNS) {
    const matches = content.match(regex);
    if (matches) {
      content = content.replace(regex, replacement);
      replacements += matches.length;
      applied.push(`${matches.length}x ${desc}`);
    }
  }

  if (replacements > 0 && !dryRun) {
    fs.writeFileSync(filePath, content, 'utf-8');
  }

  return {
    filePath,
    replacements,
    applied,
    changed: content !== originalContent,
  };
}

function findTsxFiles(dir) {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...findTsxFiles(fullPath));
    } else if (entry.name.endsWith('.tsx')) {
      files.push(fullPath);
    }
  }

  return files;
}

function main() {
  const dryRun = process.argv.includes('--dry-run');
  const rootDir = path.join(__dirname, '..');

  console.log('🚀 Simple UnoCSS Migration Script');
  if (dryRun) {
    console.log('📋 DRY RUN MODE - No files will be modified\n');
  }

  const files = [
    ...findTsxFiles(path.join(rootDir, 'src/components')),
    ...findTsxFiles(path.join(rootDir, 'src/pages')),
  ];

  console.log(`Found ${files.length} TSX files\n`);

  const results = [];
  let totalReplacements = 0;

  for (const file of files) {
    const result = replaceInFile(file, dryRun);
    if (result.replacements > 0) {
      results.push(result);
      totalReplacements += result.replacements;
      
      const relativePath = path.relative(rootDir, file);
      console.log(`✓ ${relativePath}`);
      console.log(`  Replacements: ${result.replacements}`);
      result.applied.forEach(item => console.log(`    - ${item}`));
      console.log('');
    }
  }

  console.log('\n📊 Summary:');
  console.log(`  Total files: ${files.length}`);
  console.log(`  Files modified: ${results.length}`);
  console.log(`  Total replacements: ${totalReplacements}`);

  if (dryRun) {
    console.log('\n💡 Run without --dry-run to apply changes');
  } else {
    console.log('\n✅ Phase 1 complete!');
    console.log('   ⚠️  This handles simple patterns only');
    console.log('   ⚠️  Complex styles still need manual refactoring');
    console.log('   Run: pnpm typecheck to verify');
  }
}

main();
