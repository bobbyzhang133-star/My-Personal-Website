import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../public/portfolio/', import.meta.url));
async function files(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return (await Promise.all(entries.map(entry => entry.isDirectory() ? files(path.join(dir, entry.name)) : path.join(dir, entry.name)))).flat().sort();
}
// Versioned and newly added unversioned imports must hash identically.
const normalize = text => text.replace(/\?v=[\w-]+/g, '');
const sources = (await files(root)).filter(file => /\.(js|css|html)$/.test(file));
const records = await Promise.all(sources.map(async file => ({ file, text: await readFile(file, 'utf8') })));
const hash = createHash('sha256');
for (const { file, text } of records.filter(record => /\.(js|css)$/.test(record.file))) {
  hash.update(path.relative(root, file)).update(normalize(text));
}
const revision = hash.digest('hex').slice(0, 12);
const check = process.argv.includes('--check');
const stale = [];
for (const { file, text } of records) {
  const updated = text
    .replace(/((?:src|href)=["']\/assets\/(?:js|css)\/[^"'?]+\.(?:js|css))(?:\?v=[\w-]+)?(["'])/g, `$1?v=${revision}$2`)
    .replace(/(from\s+["']\.{1,2}\/[^"'?]+\.js)(?:\?v=[\w-]+)?(["'])/g, `$1?v=${revision}$2`);
  if (updated !== text) {
    stale.push(path.relative(root, file));
    if (!check) await writeFile(file, updated);
  }
}
if (check && stale.length) {
  console.error(`Inconsistent portfolio release: ${stale.join(', ')}. Run node scripts/sync-portfolio-release.mjs.`);
  process.exitCode = 1;
} else console.log(`Portfolio release ${revision}: ${check ? 'verified' : 'synchronized'}.`);
