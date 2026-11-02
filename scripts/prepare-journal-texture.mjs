// Retain the approved Room pixels and their exact silhouette for Blender UVs.
import { createRequire } from 'node:module';
import { readFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const sharp=createRequire(import.meta.url)('sharp');
const base=new URL('../public/portfolio/assets/room/',import.meta.url);
const svg=await readFile(new URL('master/research.svg',base),'utf8');
const path=svg.match(/<clipPath[^>]*><path d="([^"]+)"/)[1];
const mask=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="354" height="112" viewBox="497 414 354 112"><path fill="white" d="${path}"/></svg>`);
const directory=new URL('journal-3d/v3/',base);await mkdir(directory,{recursive:true});
await sharp(await readFile(new URL('journal-3d/v2/cover-source.png',base))).ensureAlpha().composite([{input:mask,blend:'dest-in'}]).png().toFile(fileURLToPath(new URL('cover-source.png',directory)));
console.log('Exported native book texture with the Room silhouette, original yellow page grain and red spine markings.');
