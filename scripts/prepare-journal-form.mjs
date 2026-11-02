// Register the generated journal edit; retain the approved source pixels elsewhere.
import { createRequire } from 'node:module';
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { MASTER_OBJECTS } from '../public/portfolio/assets/js/scenes/room-master.js';
const sharp=createRequire(import.meta.url)('sharp');
const input=process.argv[2];
if(!input)throw new Error('Usage: node scripts/prepare-journal-form.mjs <room-referenced-edit.png>');
const root=new URL('../public/portfolio/assets/room/master/',import.meta.url);
const original=await readFile(new URL('studio-objects-v2.webp',root));
const edited=await readFile(input),meta=await sharp(edited).metadata();
if(meta.width!==1672||meta.height!==941)throw new Error('Journal source must retain the exact 1672 × 941 room camera.');
const region={left:497,top:410,width:354,height:116};
const patch=await sharp(edited).extract(region).toBuffer();
const ai=MASTER_OBJECTS.ai.path;
const mask=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1672" height="941"><path fill="white" d="${ai}"/></svg>`);
const originalAI=await sharp(original).ensureAlpha().composite([{input:mask,blend:'dest-in'}]).png().toBuffer();
const output=await sharp(original).composite([{input:patch,left:region.left,top:region.top},{input:originalAI}]).webp({lossless:true,effort:6}).toBuffer();
// Validate exact unchanged opaque pixels for the other four representatives.
const before=await sharp(original).ensureAlpha().raw().toBuffer(),after=await sharp(output).ensureAlpha().raw().toBuffer();
for(const name of ['games','films','music','ai']) {
  const clip=await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1672" height="941"><path fill="white" d="${MASTER_OBJECTS[name].path}"/></svg>`)).ensureAlpha().raw().toBuffer();
  for(let i=0;i<clip.length;i+=4)if(clip[i+3]===255&&!before.subarray(i,i+4).equals(after.subarray(i,i+4)))throw new Error(`${name} opaque pixels changed`);
}
const proof=new URL('../artifacts/item-form-redraw/',import.meta.url);await mkdir(proof,{recursive:true});
await copyFile(input,new URL('book-generated.png',proof));
await writeFile(new URL('studio-objects-v3.webp',root),output);
console.log('Registered journal source; other four opaque object sprites verified unchanged.');
