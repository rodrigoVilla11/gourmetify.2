/**
 * Script: add-require-org.mjs
 * Automatically adds requireOrg import and call to all API route handlers
 * that don't already have it.
 *
 * Usage: node scripts/add-require-org.mjs
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, resolve } from 'path';

const apiDir = resolve('src/app/api');
const IMPORT_LINE = `import { requireOrg } from "@/lib/requireOrg";`;
const ORG_CALL = `  let orgId: string;\n  try { orgId = requireOrg(req); } catch (e) { return e as Response; }`;

// Routes that should NOT be modified (auth routes, upload)
const SKIP_PATTERNS = [
  '/api/auth/',
  '/api/upload',
];

function getAllRouteFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      files.push(...getAllRouteFiles(full));
    } else if (entry === 'route.ts') {
      files.push(full);
    }
  }
  return files;
}

function shouldSkip(filePath) {
  const normalized = filePath.replace(/\\/g, '/');
  return SKIP_PATTERNS.some(p => normalized.includes(p));
}

function processFile(filePath) {
  let content = readFileSync(filePath, 'utf8');
  const normalized = filePath.replace(/\\/g, '/');

  if (shouldSkip(normalized)) {
    console.log(`  SKIP: ${normalized}`);
    return;
  }

  if (content.includes('requireOrg')) {
    console.log(`  DONE: ${normalized} (already has requireOrg)`);
    return;
  }

  // 1. Add the import after the last existing import line
  const importMatch = content.match(/(^import .+;\n)+/m);
  if (!importMatch) {
    console.log(`  WARN: ${normalized} - no imports found, skipping`);
    return;
  }

  // Find the position after all imports
  const lastImportEnd = content.lastIndexOf('\nimport ');
  const afterLastImport = content.indexOf('\n', lastImportEnd + 1);

  if (!content.includes(IMPORT_LINE)) {
    content = content.slice(0, afterLastImport + 1) + IMPORT_LINE + '\n' + content.slice(afterLastImport + 1);
  }

  // 2. Add the requireOrg call inside each exported async function handler
  // Match: export async function GET/POST/PUT/PATCH/DELETE(req: NextRequest...
  // We need to add the orgId call as the first line inside the function body

  // Pattern: find "export async function (GET|POST|PUT|PATCH|DELETE)" followed by opening brace
  const handlerPattern = /export async function (GET|POST|PUT|PATCH|DELETE)\([^)]*req[^)]*\)[^{]*\{/g;

  let match;
  const insertions = [];
  while ((match = handlerPattern.exec(content)) !== null) {
    const bracePos = match.index + match[0].length;
    // Check that requireOrg isn't already in the next few lines
    const nextChunk = content.slice(bracePos, bracePos + 200);
    if (!nextChunk.includes('requireOrg') && !nextChunk.includes('orgId')) {
      insertions.push(bracePos);
    }
  }

  // Apply insertions in reverse order to preserve positions
  for (let i = insertions.length - 1; i >= 0; i--) {
    const pos = insertions[i];
    const newline = content[pos] === '\n' ? '' : '\n';
    content = content.slice(0, pos) + newline + ORG_CALL + '\n' + content.slice(pos);
  }

  // 3. Ensure handler has req parameter if it's missing
  // If function signature is "GET()" without req, add req: NextRequest
  // This is tricky to do safely, so we just warn
  const noReqHandlers = content.match(/export async function (GET|POST|PUT|PATCH|DELETE)\(\s*\)/g);
  if (noReqHandlers) {
    console.log(`  WARN: ${normalized} - has handlers without req param:`, noReqHandlers);
  }

  writeFileSync(filePath, content, 'utf8');
  console.log(`  UPDATED: ${normalized}`);
}

const files = getAllRouteFiles(apiDir);
console.log(`Found ${files.length} route files\n`);

for (const file of files) {
  processFile(file);
}

console.log('\nDone! Now manually add organizationId to where/data clauses in each route.');
