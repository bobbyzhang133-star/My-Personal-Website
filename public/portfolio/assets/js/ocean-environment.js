import { OCEAN_LEVELS, OCEAN_WORLD, oceanLevel } from './experience-state.js?v=1935067ad971';

const source='/assets/game-source/plasteroids-showcase/';
// Alpha bounds measured from the unchanged source PNGs. Preserve aspect ratio.
export const OCEAN_DEBRIS=[
  {src:source+'trash-small.png',crop:[42,56,133,98],width:42},
  {src:source+'trash-medium.png',crop:[70,56,315,343],width:78},
  {src:source+'trash-large.png',crop:[42,70,462,546],width:110},
];
export const OCEAN_LANDMARKS=Array.from({length:32},(_,i)=>({
  x:[94,580,172,508,66,614,242,452][i%8],y:320+i*158,kind:i%3,
}));

export function oceanWaterColor(depth) {
  const level=oceanLevel(depth),current=OCEAN_LEVELS[level],next=OCEAN_LEVELS[Math.min(3,level+1)];
  const t=Math.max(0,Math.min(1,(depth-(current.bottom-650))/650)),mix=t*t*(3-2*t);
  const channel=(color,shift)=>parseInt(color.slice(1),16)>>shift&255;
  return `rgb(${[16,8,0].map(shift=>Math.round(channel(current.color,shift)*(1-mix)+channel(next.color,shift)*mix)).join(',')})`;
}

export function drawOceanEnvironment(ctx,images,{cameraY,scale,height,depth}) {
  const left=0,top=Math.max(0,cameraY),bottom=Math.min(OCEAN_WORLD.height,cameraY+height/scale);
  // Native water texture scrolls more slowly than the world-anchored debris.
  const water=images.ocean0;
  if(water?.complete&&water.naturalWidth){
    const cropY=64,cropH=water.naturalHeight-cropY,tileH=700*cropH/water.naturalWidth,drift=cameraY*.6;
    const first=Math.floor((top-drift)/tileH);
    ctx.save();ctx.globalAlpha=.38;
    for(let i=first;i*tileH+drift<bottom;i++){
      const y=i*tileH+drift;
      ctx.save();ctx.translate(left,y+(i%2?tileH:0));if(i%2)ctx.scale(1,-1);
      ctx.drawImage(water,0,cropY,water.naturalWidth,cropH,0,0,700,tileH+.5);ctx.restore();
    }
    ctx.restore();
    if(cameraY<130)ctx.drawImage(water,0,0,water.naturalWidth,cropY,0,0,700,700*cropY/water.naturalWidth);
  }
  // Source twilight/deep-water art, tiled at its intrinsic ratio, covers every
  // depth rather than ending after a short strip and leaving a blank fill.
  for(let index=1;index<OCEAN_LEVELS.length;index++){
    const level=OCEAN_LEVELS[index],image=images['ocean'+index];
    if(!image?.complete||!image.naturalWidth||bottom<level.top||top>level.bottom)continue;
    const tileH=700*image.naturalHeight/image.naturalWidth;
    ctx.save();ctx.beginPath();ctx.rect(0,level.top,700,level.bottom-level.top);ctx.clip();
    ctx.globalAlpha=index===1?.6:.45;
    for(let y=level.top;y<level.bottom;y+=tileH)ctx.drawImage(image,0,y,700,tileH+.5);
    ctx.restore();
  }
  // Non-interactive suspended trash is navigation texture, not floor furniture.
  for(const landmark of OCEAN_LANDMARKS){
    if(landmark.y<top-150||landmark.y>bottom+150)continue;
    const asset=OCEAN_DEBRIS[landmark.kind],image=images['debris'+landmark.kind];
    if(!image?.complete||!image.naturalWidth)continue;
    const h=asset.width*asset.crop[3]/asset.crop[2];
    ctx.save();ctx.globalAlpha=.62;ctx.drawImage(image,...asset.crop,landmark.x-asset.width/2,landmark.y,asset.width,h);ctx.restore();
  }
  // Small world-fixed motes provide optic flow even between larger landmarks.
  ctx.save();ctx.globalAlpha=.35;ctx.fillStyle=depth<3600?'#b7eee0':'#a391e0';
  for(let i=Math.max(0,Math.floor(top/85)-1);i<Math.ceil(bottom/85)+1;i++){
    const x=35+(i*137)%630,y=i*85;
    ctx.fillRect(x,y,2,4);ctx.fillRect(700-x,y+31,2,2);
  }
  ctx.restore();
}
