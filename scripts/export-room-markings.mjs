// Authored pixel lettering on existing SVG object layers; no prop regeneration.
// Coordinates use the approved 1672 × 941 room camera, not viewport UI positions.
import { writeFile } from 'node:fs/promises';
import { MASTER_OBJECTS } from '../public/portfolio/assets/js/scenes/room-master.js';

const glyphs = {
  A:['01110','10001','10001','11111','10001','10001','10001'],
  C:['01111','10000','10000','10000','10000','10000','01111'],
  E:['11111','10000','10000','11110','10000','10000','11111'],
  F:['11111','10000','10000','11110','10000','10000','10000'],
  G:['01111','10000','10000','10111','10001','10001','01111'],
  H:['10001','10001','10001','11111','10001','10001','10001'],
  I:['11111','00100','00100','00100','00100','00100','11111'],
  L:['10000','10000','10000','10000','10000','10000','11111'],
  M:['10001','11011','10101','10101','10001','10001','10001'],
  R:['11110','10001','10001','11110','10100','10010','10001'],
  S:['01111','10000','10000','01110','00001','00001','11110'],
  U:['10001','10001','10001','10001','10001','10001','01110'],
};
function lettering(word,x,y,scale,ink) {
  let d='';
  for(const [index,letter] of [...word].entries()) for(const [row,pixels] of glyphs[letter].entries()) for(const [col,bit] of [...pixels].entries()) if(bit==='1') d+=`M${index*6+col} ${row}h1v1h-1Z`;
  return `<path fill="${ink}" transform="translate(${x} ${y}) scale(${scale})" d="${d}"/>`;
}
function badge(word,x,y,width,height,scale) {
  return `<g transform="translate(${x} ${y})"><path fill="#473b32" d="M2 3H${width}V${height}H2Z"/><path fill="#ead7a7" d="M2 0H${width-3}V2H${width}V${height-3}H${width-2}V${height-1}H0V3H2Z"/><path fill="#a08258" d="M2 ${height-4}H${width-3}v2H2Z"/>${lettering(word,(width-(word.length*6-1)*scale)/2,4,scale,'#283c40')}</g>`;
}
// Cover axes follow its upper edge (~214,-24) and depth direction (~50,58).
const title = '<g transform="matrix(1 -.115 .72 .84 586 452)">'+lettering('RESEARCH',0,1,2.6,'#172035')+lettering('RESEARCH',0,0,2.6,'#d4b575')+'</g>';
const screen = lettering('AI',1004,327,6,'#a8c8b5')+'<path fill="#718c8c" d="M1078 366h10v3h-10Z"/>';
const guitar = '<g transform="matrix(1 -.06 .04 1 132 702)">'+badge('MUSIC',0,0,90,26,2.2)+'</g>';
const camera = '<g transform="matrix(1 .025 0 1 1269 388)"><path fill="#706d60" d="M0 -2H64V17H0Z"/><path fill="#c6c1a7" d="M1 -1H63V16H1Z"/><path fill="#e2d9bc" d="M1 -1H63V0H2V15H1Z"/><path fill="#8e8d80" d="M2 15H63V1H62V14H2Z"/>'+lettering('FILMS',3,1,2,'#e8dfc2')+lettering('FILMS',3,0,2,'#303940')+'</g>';
function bird(left) {
  // A tied cloth neckerchief follows the chest; lettering itself never mirrors.
  const cloth='<path fill="#263e43" d="M588 790H638V787H646V796H649V812L629 831L592 816Z"/><path fill="#5c7e78" d="M590 794H643V799H646V811L628 826L595 813Z"/><path fill="#88a397" d="M590 794H641V797H593Z"/><path fill="#345853" d="M628 818L643 808V812L628 826L600 815Z"/><path fill="#bbbc91" d="M638 787H646V794H641V799H637V795H633V791H638Z"/>';
  const surface=left?`<g transform="translate(1220 0) scale(-1 1)">${cloth}</g>`:cloth;
  return surface+`<g data-readable-facing="${left?'left':'right'}">${lettering('GAMES',left?575:594,800,1.75,'#f0e6c5')}</g>`;
}
const drawings={research:title,ai:screen,music:guitar,films:camera,games:bird(false),'games-left':bird(true)};
const labels={research:'RESEARCH',ai:'AI',music:'MUSIC',films:'FILMS',games:'GAMES'};
for(const [name,art] of Object.entries(drawings)) {
  const key=name==='games-left'?'games':name,o=MASTER_OBJECTS[key],box=o.box.join(' ');
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${o.box[2]}" height="${o.box[3]}" viewBox="${box}" data-category="${labels[key]}" data-medium="source-registered-pixel-lettering"><defs><clipPath id="surface"><path d="${o.path}"/></clipPath></defs><g clip-path="url(#surface)" shape-rendering="crispEdges">${art}</g></svg>`;
  await writeFile(new URL(`../public/portfolio/assets/room/master/${name}-mark.svg`,import.meta.url),svg);
}
console.log('Exported six physical category markings in the existing object camera.');
