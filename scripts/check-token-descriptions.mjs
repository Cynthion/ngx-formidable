#!/usr/bin/env node
/**
 * Keeps the portal's token manifest honest about `user/theme-reference.md`.
 *
 * `token-manifest.spec.ts` already holds the manifest's variable **names** in step with the stylesheet, at
 * runtime. Nothing held its **descriptions** in step with the reference, which is where they came from — so
 * the portal's inline help and its documentation route could drift from the document that owns them.
 *
 * This is the missing half. It reads the reference's tables and the manifest's entries and requires the two
 * to agree exactly, so the markdown stays the single source and the TypeScript stays a transcription of it.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const referencePath = join(root, '.documentation/user/theme-reference.md');
const manifestPath = join(root, 'src/app/portal/model/token-manifest.ts');

/** The reference's last section lists what the library writes itself, which the manifest deliberately omits. */
const WRITTEN_HEADING = '## Variables The Library Sets Itself';

/** Splits the reference into the editable variables and the ones the library writes. */
function readReference() {
  const source = readFileSync(referencePath, 'utf8');
  const cut = source.indexOf(WRITTEN_HEADING);

  const rowsIn = (text) => {
    const found = new Map();

    for (const line of text.split('\n')) {
      const row = line.match(/^\|\s*`(--formidable-[a-z0-9-]+)`\s*\|\s*(.*?)\s*\|\s*$/);

      if (row) found.set(row[1], row[2].replace(/\s+/g, ' ').trim());
    }

    return found;
  };

  return {
    editable: rowsIn(cut < 0 ? source : source.slice(0, cut)),
    written: cut < 0 ? new Map() : rowsIn(source.slice(cut))
  };
}

/** The body of one exported array literal, so the two token lists are never read as one. */
function arrayBody(source, name) {
  const start = source.indexOf(`export const ${name}`);
  if (start < 0) return '';

  const open = source.indexOf('[', start);
  const close = source.indexOf('\n];', open);

  return open < 0 || close < 0 ? '' : source.slice(open, close);
}

/**
 * Reads `name` / `description` pairs. Both quote styles are accepted: Prettier writes a string holding an
 * apostrophe with double quotes, so a single-quote-only pattern silently skips exactly those entries and
 * pairs every later name with the wrong description.
 */
function readEntries(body, valueKey) {
  const entries = new Map();
  const quoted = String.raw`(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)")`;
  const pattern = new RegExp(String.raw`name:\s*'(--formidable-[a-z0-9-]+)'[\s\S]*?${valueKey}:\s*${quoted}`, 'g');
  let match;

  while ((match = pattern.exec(body)) !== null) {
    const raw = match[2] ?? match[3] ?? '';

    entries.set(match[1], raw.replace(/\\(['"\\])/g, '$1'));
  }

  return entries;
}

const reference = readReference();
const manifestSource = readFileSync(manifestPath, 'utf8');
const editable = readEntries(arrayBody(manifestSource, 'THEME_TOKENS'), 'description');
const written = readEntries(arrayBody(manifestSource, 'LIBRARY_WRITTEN_TOKENS'), 'setBy');

const problems = [];

if (reference.editable.size === 0)
  problems.push('Read no variables out of the reference — has its table format changed?');
if (editable.size === 0) problems.push('Read no entries out of the manifest — has its shape changed?');

for (const [name, description] of editable) {
  const expected = reference.editable.get(name);

  if (expected === undefined) {
    problems.push(`${name}\n    the manifest exposes it, the reference does not document it.`);
  } else if (expected !== description) {
    problems.push(`${name}\n    reference: ${expected}\n    manifest:  ${description}`);
  }
}

for (const name of reference.editable.keys()) {
  if (!editable.has(name)) {
    problems.push(`${name}\n    the reference documents it, the manifest does not expose it.`);
  }
}

for (const name of reference.written.keys()) {
  if (!written.has(name)) {
    problems.push(`${name}\n    the reference lists it as library-written, the manifest does not.`);
  }
}

for (const name of written.keys()) {
  if (!reference.written.has(name)) {
    problems.push(`${name}\n    the manifest calls it library-written, the reference does not list it.`);
  }
}

if (problems.length) {
  console.error(
    `\n${problems.length} problem(s) between\n` +
      `  .documentation/user/theme-reference.md  (the source)\n` +
      `  src/app/portal/model/token-manifest.ts  (the transcription)\n`
  );
  for (const problem of problems) console.error(`  ${problem}\n`);
  console.error('The reference is authoritative. Update the manifest to match it.\n');
  process.exit(1);
}

console.log(
  `${editable.size} token descriptions and ${written.size} library-written entries match theme-reference.md.`
);
