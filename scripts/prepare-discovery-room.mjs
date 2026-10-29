// Mechanical registration/compositing of ImageGen edits, never a second art medium.
// Run with sharp available (the bundled runtime supplies it). Keep source PNGs local.
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { MASTER_OBJECTS } from '../public/portfolio/assets/js/scenes/room-master.js';
const sharp = createRequire(import.meta.url)('sharp');
const root = new URL('../public/portfolio/assets/room/master/', import.meta.url);
const sources = new URL('../artifacts/home-discoverability/source/', import.meta.url);
const width = 1672, height = 941;
const original = await readFile(new URL('studio-master.webp', root));
const edited = await readFile(new URL('objects-generated.png', sources));
const cleaned = await readFile(new URL('environment-generated.png', sources));
const oldContours = JSON.parse(await readFile(new URL('original-contours.json', sources), 'utf8'));
for (const input of [original, edited, cleaned]) {
  const meta = await sharp(input).metadata();
  if (meta.width !== width || meta.height !== height) throw new Error('Source camera dimensions must remain 1672 × 941; do not distort an image to fit.');
}
const svg = content => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${content}</svg>`);
const objectMask = name => svg(`<path fill="white" d="${MASTER_OBJECTS[name].path}"/>`);
const clip = async (input, mask) => sharp(input).ensureAlpha().composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer();
// Only feathered clearance masks around the three old silhouettes may change
// the approved environment; rectangular image seams must not become visible.
const restorationMask = await sharp(svg(`<g fill="white" stroke="white" stroke-linejoin="round">${Object.entries(oldContours).map(([name, path]) => `<path d="${path}" stroke-width="${name === 'music' ? 70 : 26}"/>`).join('')}</g>`)).blur(3).png().toBuffer();
let environment = await sharp(original).composite([{ input: await clip(cleaned, restorationMask) }]).png().toBuffer();
// The electric guitar is registered 8 source pixels lower, preserving the original
// hit box and floor baseline. Translation only: no perspective or aspect changes.
const guitarPixels = await sharp(edited).extract({ left: 54, top: 150, width: 258, height: 610 }).png().toBuffer();
const guitar = await sharp({ create: { width, height, channels: 4, background: '#00000000' } }).composite([{ input: guitarPixels, left: 54, top: 158 }]).png().toBuffer();
const shadowMask = svg(`<g fill="white"><ellipse cx="183" cy="764" rx="137" ry="15"/><ellipse cx="670" cy="510" rx="175" ry="15"/><ellipse cx="1410" cy="489" rx="169" ry="13"/></g><g fill="black">${['music','research','films'].map(name => `<path d="${MASTER_OBJECTS[name].path}"/>`).join('')}</g>`);
// Remove object interiors from the shadow alpha rather than baking prop fragments
// into the background. Each selectable object remains a separate clipped layer.
const shadowAlpha = await sharp(shadowMask).removeAlpha().greyscale().raw().toBuffer();
const shadowRGBA = Buffer.alloc(width * height * 4);
for (let i = 0; i < shadowAlpha.length; i++) { shadowRGBA[i * 4] = 255; shadowRGBA[i * 4 + 1] = 255; shadowRGBA[i * 4 + 2] = 255; shadowRGBA[i * 4 + 3] = shadowAlpha[i]; }
const shadow = await sharp(shadowRGBA, { raw: { width, height, channels: 4 } }).blur(4).composite(['music','research','films'].map(name => ({ input: objectMask(name), blend: 'dest-out' }))).png().toBuffer();
const shadowArt = await sharp(edited).composite([{ input: guitar, left: 0, top: 0 }]).png().toBuffer();
environment = await sharp(environment).composite([{ input: await clip(shadowArt, shadow) }, { input: await clip(original, objectMask('ai')) }]).png().toBuffer();
const objectLayers = await Promise.all(['music','research','films'].map(async name => ({ input: await clip(name === 'music' ? guitar : edited, objectMask(name)) })));
const objects = await sharp(environment).composite([...objectLayers, { input: await clip(original, objectMask('ai')) }]).png().toBuffer();
await mkdir(root, { recursive: true });
await sharp(environment).webp({ lossless: true, effort: 6 }).toFile(fileURLToPath(new URL('studio-environment-v2.webp', root)));
await sharp(objects).webp({ lossless: true, effort: 6 }).toFile(fileURLToPath(new URL('studio-objects-v2.webp', root)));
const originalRaw = await sharp(original).ensureAlpha().raw().toBuffer();
const outputRaw = await sharp(objects).ensureAlpha().raw().toBuffer();
for (const name of ['ai','games']) {
  const mask = await sharp(objectMask(name)).ensureAlpha().raw().toBuffer();
  for (let i = 0; i < mask.length; i += 4) if (mask[i + 3] === 255 && originalRaw.subarray(i, i + 4).compare(outputRaw.subarray(i, i + 4))) throw new Error(`${name} source pixels changed`);
}
await writeFile(new URL('registration.json', sources), JSON.stringify({ width, height, guitarTranslation: [0,8], changedObjects: ['music','research','films'], preservedObjects: ['ai','games'], encoding: 'lossless WebP', camera: 'unchanged approved master', cleanup: 'feathered clearance masks around three old silhouettes; source-derived contact shadows exclude object interiors' }, null, 2));
console.log('Prepared registered environment and object source; laptop/bird opaque source pixels verified unchanged.');
