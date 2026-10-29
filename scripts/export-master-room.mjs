// Mechanical clipping of approved pixels. No generation, repainting or new perspective.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {MASTER_ROOM,MASTER_OBJECTS} from '../public/portfolio/assets/js/scenes/room-master.js';
const sharp=createRequire(import.meta.url)('sharp');
const root=new URL('../public/portfolio/assets/room/master/',import.meta.url);
await mkdir(root,{recursive:true});
const master=await readFile(new URL(MASTER_ROOM.objectSource.split('/').at(-1),root));
const clean=await readFile(new URL('floor-clean-source.webp',root));
async function svg([x,y,w,h],source,clip=''){
  let image=sharp(source).ensureAlpha();
  if(clip)image=image.composite([{input:Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1672" height="941"><path fill="white" d="${clip}"/></svg>`),blend:'dest-in'}]);
  // Evaluate the full-size mask before extraction; only the cropped lossless pixels
  // are embedded, avoiding five complete copies of the environment over the wire.
  const full=await image.png().toBuffer();
  const data=(await sharp(full).extract({left:x,top:y,width:w,height:h}).webp({lossless:true,effort:6}).toBuffer()).toString('base64');
  const hash=createHash('sha256').update(source).digest('hex');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${x} ${y} ${w} ${h}" data-source-sha256="${hash}">${clip?`<defs><clipPath id="cut"><path d="${clip}"/></clipPath></defs>`:''}<image x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="none" style="image-rendering:pixelated" href="data:image/webp;base64,${data}"${clip?' clip-path="url(#cut)"':''}/></svg>`;
}
for(const[name,o]of Object.entries(MASTER_OBJECTS))await writeFile(new URL(`${name}.svg`,root),await svg(o.box,master,o.path));
await writeFile(new URL('floor-clean-patch.svg',root),await svg([480,700,240,207],clean));
await writeFile(new URL('book-page-corner.svg',root),await svg([786,455,56,34],master,'M786 455L812 468L840 483L793 480Z'));
console.log('Exported five exact master masks and the reconstructed floor patch.');
