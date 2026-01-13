#!/usr/bin/env tsx
/**
 * Automated UnoCSS Migration Script
 * 
 * This script automatically converts inline styles to UnoCSS utility classes
 * across all TSX files in the admin dashboard.
 * 
 * Usage: pnpm tsx scripts/migrate-to-unocss.ts [--dry-run] [--file=path/to/file.tsx]
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { parse } from '@babel/parser';
import babelTraverse from '@babel/traverse';
import generate from '@babel/generator';
import type * as t from '@babel/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Handle default export for ESM compatibility
const traverse = (babelTraverse as any).default || babelTraverse;

// Comprehensive style-to-class mapping
const STYLE_MAPPINGS: Record<string, string> = {
  // Display & Layout
  'display:"flex"': 'flex',
  'display:"grid"': 'grid',
  'display:"block"': 'block',
  'display:"inline-flex"': 'inline-flex',
  'flexDirection:"column"': 'flex-col',
  'flexDirection:"row"': 'flex-row',
  'alignItems:"center"': 'items-center',
  'alignItems:"flex-start"': 'items-start',
  'alignItems:"flex-end"': 'items-end',
  'justifyContent:"center"': 'justify-center',
  'justifyContent:"space-between"': 'justify-between',
  'justifyContent:"flex-end"': 'justify-end',
  'flex:1': 'flex-1',
  'flexShrink:0': 'flex-shrink-0',

  // Spacing - Gap
  'gap:"8px"': 'gap-2',
  'gap:"12px"': 'gap-3',
  'gap:"16px"': 'gap-4',
  'gap:"20px"': 'gap-5',
  'gap:"24px"': 'gap-6',

  // Spacing - Padding
  'padding:"8px"': 'p-2',
  'padding:"10px14px"': 'px-3.5 py-2.5',
  'padding:"12px"': 'p-3',
  'padding:"16px"': 'p-4',
  'padding:"20px"': 'p-5',
  'padding:"24px"': 'p-6',
  'padding:"32px"': 'p-8',

  // Spacing - Margin
  'margin:0': 'm-0',
  'marginBottom:"8px"': 'mb-2',
  'marginBottom:"12px"': 'mb-3',
  'marginBottom:"16px"': 'mb-4',
  'marginBottom:"20px"': 'mb-5',
  'marginBottom:"24px"': 'mb-6',
  'marginTop:"8px"': 'mt-2',
  'marginTop:"12px"': 'mt-3',
  'marginTop:"16px"': 'mt-4',
  'marginTop:"20px"': 'mt-5',
  'marginTop:"24px"': 'mt-6',

  // Typography
  'fontSize:"12px"': 'text-12px',
  'fontSize:"13px"': 'text-13px',
  'fontSize:"14px"': 'text-14px',
  'fontSize:"16px"': 'text-16px',
  'fontSize:"18px"': 'text-18px',
  'fontSize:"20px"': 'text-20px',
  'fontSize:"24px"': 'text-24px',
  'fontWeight:"400"': 'font-normal',
  'fontWeight:"500"': 'font-medium',
  'fontWeight:"600"': 'font-semibold',
  'fontWeight:"700"': 'font-bold',
  'textAlign:"center"': 'text-center',
  'textAlign:"left"': 'text-left',
  'textAlign:"right"': 'text-right',
  'lineHeight:"1.6"': 'leading-relaxed',

  // Colors (CSS variables)
  'color:"var(--text-primary)"': 'text-text-primary',
  'color:"var(--text-secondary)"': 'text-text-secondary',
  'color:"var(--text-tertiary)"': 'text-text-tertiary',
  'background:"var(--surface-primary)"': 'bg-surface-primary',
  'background:"var(--surface-secondary)"': 'bg-surface-secondary',
  'background:"var(--card-bg)"': 'bg-card-bg',
  'background:"transparent"': 'bg-transparent',

  // Borders
  'border:"none"': 'border-none',
  'border:"1pxsolidvar(--border-primary)"': 'border border-border-primary',
  'borderRadius:"6px"': 'rounded-md',
  'borderRadius:"8px"': 'rounded-lg',
  'borderRadius:"12px"': 'rounded-xl',
  'borderRadius:"50%"': 'rounded-full',

  // Sizing
  'width:"100%"': 'w-full',
  'width:"20px"': 'w-5',
  'width:"48px"': 'w-12',
  'height:"20px"': 'h-5',
  'height:"48px"': 'h-12',
  'maxWidth:"400px"': 'max-w-400px',
  'maxWidth:"600px"': 'max-w-600px',
  'maxWidth:"900px"': 'max-w-900px',

  // Position
  'position:"relative"': 'relative',
  'position:"absolute"': 'absolute',
  'position:"fixed"': 'fixed',

  // Cursor & Interaction
  'cursor:"pointer"': 'cursor-pointer',
  'cursor:"not-allowed"': 'cursor-not-allowed',
  'outline:"none"': 'outline-none',

  // Transitions
  'transition:"all0.15sease"': 'transition-all duration-150',
  'transition:"all0.2sease"': 'transition-all duration-200',
};

interface TransformResult {
  filePath: string;
  stylesFound: number;
  stylesConverted: number;
  skipped: string[];
}

function normalizeStyleString(str: string): string {
  // Remove all whitespace for comparison
  return str.replace(/\s+/g, '').replace(/["']/g, '"');
}

function convertStyleObjectToClasses(styleObj: any): { classes: string[], remainingStyles: any } {
  const classes: string[] = [];
  const remainingStyles: any = {};

  if (!styleObj || typeof styleObj !== 'object') {
    return { classes, remainingStyles };
  }

  for (const [key, value] of Object.entries(styleObj)) {
    const styleString = normalizeStyleString(`${key}:${JSON.stringify(value)}`);
    const unoClass = STYLE_MAPPINGS[styleString];

    if (unoClass) {
      classes.push(unoClass);
    } else {
      // Keep styles we can't convert
      remainingStyles[key] = value;
    }
  }

  return { classes, remainingStyles };
}

function transformFile(filePath: string, dryRun: boolean = false): TransformResult {
  const content = fs.readFileSync(filePath, 'utf-8');
  const result: TransformResult = {
    filePath,
    stylesFound: 0,
    stylesConverted: 0,
    skipped: [],
  };

  try {
    const ast = parse(content, {
      sourceType: 'module',
      plugins: ['typescript', 'jsx'],
    });

    let modified = false;

    traverse(ast, {
      JSXElement(path) {
        const openingElement = path.node.openingElement;
        const attributes = openingElement.attributes;

        let styleAttr: any = null;
        let classNameAttr: any = null;
        let styleIndex = -1;
        let classNameIndex = -1;

        // Find style and className attributes
        attributes.forEach((attr, index) => {
          if (attr.type === 'JSXAttribute' && attr.name.name === 'style') {
            styleAttr = attr;
            styleIndex = index;
            result.stylesFound++;
          }
          if (attr.type === 'JSXAttribute' && attr.name.name === 'className') {
            classNameAttr = attr;
            classNameIndex = index;
          }
        });

        if (!styleAttr) return;

        // Extract style object
        const styleValue = styleAttr.value;
        if (styleValue?.type !== 'JSXExpressionContainer') return;

        const expression = styleValue.expression;
        if (expression.type !== 'ObjectExpression') return;

        // Convert properties to style object
        const styleObj: any = {};
        expression.properties.forEach((prop: any) => {
          if (prop.type === 'ObjectProperty' && prop.key.type === 'Identifier') {
            const key = prop.key.name;
            let value: any;

            if (prop.value.type === 'StringLiteral') {
              value = prop.value.value;
            } else if (prop.value.type === 'NumericLiteral') {
              value = prop.value.value;
            } else {
              // Skip complex expressions
              return;
            }

            styleObj[key] = value;
          }
        });

        const { classes, remainingStyles } = convertStyleObjectToClasses(styleObj);

        if (classes.length > 0) {
          result.stylesConverted += classes.length;
          modified = true;

          // Merge with existing className
          if (classNameAttr) {
            const existingClasses = classNameAttr.value?.type === 'StringLiteral' 
              ? classNameAttr.value.value 
              : '';
            const newClasses = `${existingClasses} ${classes.join(' ')}`.trim();
            classNameAttr.value = {
              type: 'StringLiteral',
              value: newClasses,
            } as any;
          } else {
            // Add new className attribute
            attributes.splice(styleIndex, 0, {
              type: 'JSXAttribute',
              name: { type: 'JSXIdentifier', name: 'className' },
              value: { type: 'StringLiteral', value: classes.join(' ') },
            } as any);
          }

          // Remove or update style attribute
          if (Object.keys(remainingStyles).length === 0) {
            // Remove style attribute completely
            attributes.splice(styleIndex, 1);
          } else {
            // Keep unconverted styles
            result.skipped.push(JSON.stringify(remainingStyles));
          }
        }
      },
    });

    if (modified && !dryRun) {
      const output = generate(ast, {}, content);
      fs.writeFileSync(filePath, output.code, 'utf-8');
    }

    return result;
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error);
    return result;
  }
}

function findTsxFiles(dir: string): string[] {
  const files: string[] = [];
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

// Main execution
function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const fileArg = args.find(arg => arg.startsWith('--file='));
  const specificFile = fileArg ? fileArg.split('=')[1] : null;

  console.log('🚀 UnoCSS Migration Script');
  console.log(dryRun ? '📋 DRY RUN MODE - No files will be modified\n' : '');

  const rootDir = path.join(__dirname, '..');
  const files = specificFile 
    ? [path.resolve(rootDir, specificFile)]
    : [
        ...findTsxFiles(path.join(rootDir, 'src/components')),
        ...findTsxFiles(path.join(rootDir, 'src/pages')),
      ];

  console.log(`Found ${files.length} TSX files\n`);

  const results: TransformResult[] = [];
  let totalStyles = 0;
  let totalConverted = 0;

  for (const file of files) {
    const result = transformFile(file, dryRun);
    results.push(result);
    totalStyles += result.stylesFound;
    totalConverted += result.stylesConverted;

    if (result.stylesFound > 0) {
      console.log(`✓ ${path.relative(rootDir, file)}`);
      console.log(`  Found: ${result.stylesFound} style attributes`);
      console.log(`  Converted: ${result.stylesConverted} styles`);
      if (result.skipped.length > 0) {
        console.log(`  Skipped: ${result.skipped.length} complex styles`);
      }
      console.log('');
    }
  }

  console.log('\n📊 Summary:');
  console.log(`  Total files processed: ${files.length}`);
  console.log(`  Files with styles: ${results.filter(r => r.stylesFound > 0).length}`);
  console.log(`  Total style attributes found: ${totalStyles}`);
  console.log(`  Total styles converted: ${totalConverted}`);
  console.log(`  Conversion rate: ${totalStyles > 0 ? Math.round((totalConverted / totalStyles) * 100) : 0}%`);

  if (dryRun) {
    console.log('\n💡 Run without --dry-run to apply changes');
  } else {
    console.log('\n✅ Migration complete!');
    console.log('   Run: pnpm typecheck to verify');
  }
}

main();
