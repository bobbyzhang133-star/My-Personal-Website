// Mechanical clipping of approved pixels. No generation, repainting or new perspective.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {MASTER_OBJECTS} from '../public/portfolio/assets/js/scenes/room-master.js';
const root=new URL('../public/portfolio/assets/room/master/',import.meta.url);
await mkdir(root,{recursive:true});
const master=(await readFile(new URL('studio-master.webp',root))).toString('base64');
const clean=(await readFile(new URL('floor-clean-source.webp',root))).toString('base64');
function svg([x,y,w,h],data,clip=''){return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${x} ${y} ${w} ${h}">${clip?`<defs><clipPath id="cut"><path d="${clip}"/></clipPath></defs>`:''}<image x="0" y="0" width="1672" height="941" preserveAspectRatio="none" style="image-rendering:pixelated" href="data:image/webp;base64,${data}"${clip?' clip-path="url(#cut)"':''}/></svg>`;}
for(const[name,o]of Object.entries(MASTER_OBJECTS))await writeFile(new URL(`${name}.svg`,root),svg(o.box,master,o.path));
await writeFile(new URL('floor-clean-patch.svg',root),svg([480,700,240,207],clean));
console.log('Exported five exact master masks and the reconstructed floor patch.');
