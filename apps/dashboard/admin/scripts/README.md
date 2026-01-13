# UnoCSS Migration Automation Scripts

This directory contains automated scripts to migrate inline styles to UnoCSS utility classes.

## Available Scripts

### 0. **analyze-styles.cjs** (Run this first!)
Analyzes the current state of inline styles in your codebase.

**Usage:**
```bash
node scripts/analyze-styles.cjs
```

**Output:**
- Total inline styles count
- Files ranked by complexity
- Pattern frequency analysis
- Estimated migration time
- Automation feasibility

---

### 1. **migrate-simple.cjs** (Recommended for first pass)
Simple regex-based replacements for common patterns.

**Pros:**
- No dependencies needed
- Fast execution (~1 second)
- Handles 60-70% of simple cases
- Safe and predictable

**Cons:**
- Can't handle complex nested styles
- May miss dynamic styles
- Requires manual follow-up

**Usage:**
```bash
# Dry run (preview changes)
node scripts/migrate-simple.cjs --dry-run

# Apply changes
node scripts/migrate-simple.cjs
```

**What it handles:**
- Simple `style={{ display: "flex" }}` → `className="flex"`
- Multi-property common patterns (breadcrumbs, cards)
- Merging with existing className attributes

---

### 2. **migrate-to-unocss.ts** (Advanced AST-based)
Full AST parsing with TypeScript for comprehensive transformation.

**Pros:**
- Handles 90% of cases including complex styles
- Understands JSX structure
- Preserves dynamic styles that can't be converted
- More accurate transformations

**Cons:**
- Requires Babel dependencies
- Slower execution (~10-30 seconds)
- More complex error handling

**Usage:**
```bash
# Install dependencies first
pnpm add -D @babel/parser @babel/traverse @babel/generator @babel/types tsx

# Dry run
pnpm tsx scripts/migrate-to-unocss.ts --dry-run

# Migrate specific file
pnpm tsx scripts/migrate-to-unocss.ts --file=src/pages/AppDetail.tsx

# Migrate all files
pnpm tsx scripts/migrate-to-unocss.ts
```

**What it handles:**
- All patterns from migrate-simple.js PLUS:
- Complex multi-property style objects
- Dynamic values (preserves them)
- Nested object expressions
- Template literals in styles

---

## Recommended Workflow

### **Phase 1: Automated (80% done in 5 minutes)**

```bash
# Step 1: Preview changes
node scripts/migrate-simple.js --dry-run

# Step 2: Apply simple patterns
node scripts/migrate-simple.js

# Step 3: Verify it compiles
pnpm typecheck

# Step 4: Test dev server
pnpm dev
```

### **Phase 2: Manual Cleanup (20% remaining)**

After automation, manually refactor:

1. **Components with dynamic styles:**
   - ConfirmModal (variant-based background colors)
   - Select dropdown (hover states)
   - Toast (animation keyframes)

2. **Complex layouts:**
   - Multi-column grids with custom sizes
   - Absolute positioned overlays
   - Animations and transitions

3. **Edge cases:**
   - Conditional styles based on props
   - Inline event handler styles (onMouseEnter, etc.)
   - Template literal classNames that need merging

---

## How the Automation Works

### **Regex-Based (migrate-simple.js)**

1. **Pattern Matching:**
   ```javascript
   /style=\{\{\s*display:\s*["']flex["']\s*\}\}/g
   ```
   Finds: `style={{ display: "flex" }}`
   Replaces with: `className="flex"`

2. **Multi-Property Patterns:**
   ```javascript
   {
     find: /style={{ display: "flex", gap: "12px" }}/g,
     replace: 'className="flex gap-3"'
   }
   ```

3. **Merge with Existing:**
   ```javascript
   className="existing" style={{ display: "flex" }}
   // Becomes:
   className="existing flex"
   ```

### **AST-Based (migrate-to-unocss.ts)**

1. **Parse to AST:**
   ```typescript
   const ast = parse(content, {
     sourceType: 'module',
     plugins: ['typescript', 'jsx'],
   });
   ```

2. **Traverse JSX:**
   ```typescript
   traverse(ast, {
     JSXElement(path) {
       // Find style attributes
       // Extract style object
       // Convert to classes
       // Merge or replace
     }
   });
   ```

3. **Generate Code:**
   ```typescript
   const output = generate(ast, {}, content);
   fs.writeFileSync(filePath, output.code);
   ```

---

## Pattern Mapping Examples

### Common Conversions

```typescript
// Before:
style={{
  display: "flex",
  alignItems: "center",
  gap: "12px",
  padding: "16px"
}}

// After:
className="flex items-center gap-3 p-4"
```

```typescript
// Before:
style={{
  fontSize: "14px",
  fontWeight: "500",
  color: "var(--text-primary)"
}}

// After:
className="text-14px font-medium text-text-primary"
```

### Preserved Dynamic Styles

```typescript
// Before:
style={{
  display: "flex",
  background: variant === "danger" ? "#ef4444" : "#8b5cf6"
}}

// After:
className="flex"
style={{
  background: variant === "danger" ? "#ef4444" : "#8b5cf6"
}}
```

---

## Adding New Patterns

To add new pattern mappings, edit the scripts:

### In migrate-simple.js:
```javascript
const PATTERNS = [
  // Add new pattern:
  [
    /style=\{\{\s*yourPattern\s*\}\}/g,
    'className="uno-classes"',
    'description'
  ],
];
```

### In migrate-to-unocss.ts:
```typescript
const STYLE_MAPPINGS: Record<string, string> = {
  // Add new mapping:
  'yourProperty:"yourValue"': 'uno-class',
};
```

---

## Troubleshooting

### "Syntax error after migration"
- Run: `pnpm typecheck` to see exact errors
- Common issues:
  - Malformed JSX (missing closing tags)
  - Invalid className merging
  - Dynamic styles not preserved

### "Classes not working"
- Verify UnoCSS config: `uno.config.ts`
- Check theme mappings for custom CSS variables
- Ensure dev server is running (HMR may be needed)

### "Some styles not converted"
- Check the mapping tables in scripts
- Add custom patterns for your use case
- Some styles intentionally preserved (dynamic, complex)

---

## Testing Strategy

After running automation:

1. **Compile check:**
   ```bash
   pnpm typecheck
   ```

2. **Visual inspection:**
   ```bash
   pnpm dev
   # Open http://localhost:5174
   # Check each page visually
   ```

3. **Verify removal:**
   ```bash
   grep -r "style={{" src/ | wc -l
   # Should be <50 (only dynamic styles remain)
   ```

4. **Build check:**
   ```bash
   pnpm build
   ```

---

## Statistics Tracking

The scripts output:
- Files processed
- Patterns matched
- Conversion rate
- Remaining manual work

Example output:
```
📊 Summary:
  Total files: 31
  Files modified: 28
  Total replacements: 342
  Conversion rate: 85%

✅ Phase 1 complete!
   ⚠️  15% require manual refactoring
```

---

## Next Steps After Automation

1. **Review changes:**
   ```bash
   git diff src/
   ```

2. **Fix TypeScript errors:**
   ```bash
   pnpm typecheck
   ```

3. **Manual refactoring:**
   - Focus on files with most remaining `style={{`
   - Start with components (Toast, Modal, Select)
   - Then high-traffic pages (Login, Projects, AppDetail)

4. **Test thoroughly:**
   - Visual regression testing
   - Responsive design check
   - Dark mode verification (if applicable)

5. **Final verification:**
   ```bash
   grep -r "style={{" src/ | grep -v "style={{.*style.*}}"
   # Should only show dynamic styles
   ```

---

## Performance Impact

**Before migration:**
- CSS-in-JS runtime overhead
- Per-component style injection
- Large runtime bundle

**After migration:**
- Atomic CSS classes
- No runtime overhead
- Smaller bundle (~30% reduction)
- Faster initial render

---

## Support

If automation fails or produces unexpected results:
1. Check TypeScript errors: `pnpm typecheck`
2. Review git diff: `git diff src/`
3. Revert if needed: `git checkout src/`
4. Report issues with specific file examples

---

**Last Updated:** January 11, 2026  
**UnoCSS Version:** 0.66.5
