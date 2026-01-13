#!/usr/bin/env node
/**
 * Analyze inline styles in the codebase
 * 
 * This script provides a detailed report of:
 * - How many files have inline styles
 * - Which patterns are most common
 * - Estimated complexity of migration
 * 
 * Usage: node scripts/analyze-styles.js
 */

const fs = require('fs');
const path = require('path');

function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  // Count style={{ occurrences
  const styleMatches = content.match(/style=\{\{/g) || [];
  const styleCount = styleMatches.length;
  
  // Find common patterns
  const patterns = {
    display: (content.match(/display:\s*["']/g) || []).length,
    flex: (content.match(/flex/gi) || []).length,
    padding: (content.match(/padding:\s*["']/g) || []).length,
    margin: (content.match(/margin[^:]*:\s*["']/g) || []).length,
    fontSize: (content.match(/fontSize:\s*["']/g) || []).length,
    color: (content.match(/color:\s*["']/g) || []).length,
    background: (content.match(/background:\s*["']/g) || []).length,
    border: (content.match(/border[^:]*:\s*["']/g) || []).length,
  };
  
  // Check complexity
  const hasMultiLine = /style=\{\{[\s\S]{50,}\}\}/.test(content);
  const hasDynamic = /style=\{\{[^}]*\?[^}]*\}\}/.test(content);
  const hasTemplates = /style=\{\{[^}]*`[^}]*`[^}]*\}\}/.test(content);
  
  return {
    filePath,
    styleCount,
    patterns,
    complexity: {
      multiLine: hasMultiLine,
      dynamic: hasDynamic,
      templates: hasTemplates,
    },
    lineCount: lines.length,
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
  const rootDir = path.join(__dirname, '..');
  
  console.log('🔍 Analyzing inline styles in codebase...\n');
  
  const componentFiles = findTsxFiles(path.join(rootDir, 'src/components'));
  const pageFiles = findTsxFiles(path.join(rootDir, 'src/pages'));
  const allFiles = [...componentFiles, ...pageFiles];
  
  console.log(`📁 Found ${allFiles.length} TSX files:`);
  console.log(`   - Components: ${componentFiles.length}`);
  console.log(`   - Pages: ${pageFiles.length}\n`);
  
  const results = allFiles.map(analyzeFile);
  const filesWithStyles = results.filter(r => r.styleCount > 0);
  
  // Summary statistics
  const totalStyles = results.reduce((sum, r) => sum + r.styleCount, 0);
  const totalPatterns = results.reduce((sum, r) => {
    return sum + Object.values(r.patterns).reduce((s, v) => s + v, 0);
  }, 0);
  
  const complexFiles = results.filter(r => 
    r.complexity.multiLine || r.complexity.dynamic || r.complexity.templates
  );
  
  // Sort by style count (descending)
  filesWithStyles.sort((a, b) => b.styleCount - a.styleCount);
  
  console.log('📊 OVERALL STATISTICS\n');
  console.log(`Total inline style attributes: ${totalStyles}`);
  console.log(`Files with inline styles: ${filesWithStyles.length}/${allFiles.length}`);
  console.log(`Average per file: ${Math.round(totalStyles / filesWithStyles.length)}`);
  console.log(`Complex files: ${complexFiles.length}`);
  console.log('');
  
  console.log('🎯 TOP 10 FILES BY STYLE COUNT\n');
  filesWithStyles.slice(0, 10).forEach((result, index) => {
    const relativePath = path.relative(rootDir, result.filePath);
    const complexity = Object.entries(result.complexity)
      .filter(([, v]) => v)
      .map(([k]) => k)
      .join(', ');
    
    console.log(`${index + 1}. ${relativePath}`);
    console.log(`   Styles: ${result.styleCount} | Lines: ${result.lineCount}`);
    if (complexity) {
      console.log(`   Complexity: ${complexity}`);
    }
    console.log('');
  });
  
  console.log('📈 PATTERN FREQUENCY\n');
  const allPatterns = results.reduce((acc, r) => {
    Object.entries(r.patterns).forEach(([key, value]) => {
      acc[key] = (acc[key] || 0) + value;
    });
    return acc;
  }, {});
  
  const sortedPatterns = Object.entries(allPatterns)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8);
  
  sortedPatterns.forEach(([pattern, count]) => {
    const percentage = Math.round((count / totalPatterns) * 100);
    const bar = '█'.repeat(Math.floor(percentage / 2));
    console.log(`${pattern.padEnd(15)} ${bar} ${count} (${percentage}%)`);
  });
  console.log('');
  
  console.log('🎨 COMPONENT vs PAGES\n');
  const componentResults = results.filter(r => r.filePath.includes('/components/'));
  const pageResults = results.filter(r => r.filePath.includes('/pages/'));
  
  const componentStyles = componentResults.reduce((sum, r) => sum + r.styleCount, 0);
  const pageStyles = pageResults.reduce((sum, r) => sum + r.styleCount, 0);
  
  console.log(`Components: ${componentStyles} styles in ${componentResults.length} files`);
  console.log(`Pages: ${pageStyles} styles in ${pageResults.length} files`);
  console.log('');
  
  console.log('⚠️  COMPLEXITY BREAKDOWN\n');
  const multiLine = complexFiles.filter(r => r.complexity.multiLine).length;
  const dynamic = complexFiles.filter(r => r.complexity.dynamic).length;
  const templates = complexFiles.filter(r => r.complexity.templates).length;
  
  console.log(`Multi-line style objects: ${multiLine} files`);
  console.log(`Dynamic styles (ternaries): ${dynamic} files`);
  console.log(`Template literals: ${templates} files`);
  console.log('');
  
  console.log('💡 MIGRATION RECOMMENDATIONS\n');
  const simpleFiles = filesWithStyles.length - complexFiles.length;
  const automationRate = Math.round((simpleFiles / filesWithStyles.length) * 100);
  
  console.log(`✅ Can be automated: ${simpleFiles} files (${automationRate}%)`);
  console.log(`⚠️  Need manual work: ${complexFiles.length} files (${100 - automationRate}%)`);
  console.log('');
  console.log(`Estimated time:`);
  console.log(`  - Automation: ~5 minutes`);
  console.log(`  - Manual cleanup: ~${Math.ceil(complexFiles.length * 10 / 60)} hours`);
  console.log(`  - Testing: ~1 hour`);
  console.log('');
  
  console.log('🚀 NEXT STEPS\n');
  console.log('1. Run: node scripts/migrate-simple.js --dry-run');
  console.log('2. Review the changes');
  console.log('3. Run: node scripts/migrate-simple.js');
  console.log('4. Manually refactor complex files listed above');
  console.log('5. Run: pnpm typecheck && pnpm build');
}

main();
