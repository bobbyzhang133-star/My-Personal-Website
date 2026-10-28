import { createSpritePlayer, drawSprite } from './game-animation.js?v=0985987b2294';
import { isReducedMotion } from './utils.js?v=0985987b2294';
import { OCEAN_LEVELS, OCEAN_WORLD, BOSS_TENTACLES, RAT_OBJECTS, oceanLevel, oceanCamera, ratPropGeometry, projectRatPoint, worldFocal } from './experience-state.js?v=0985987b2294';
import { OCEAN_DEBRIS, drawOceanEnvironment, oceanWaterColor } from './ocean-environment.js?v=0985987b2294';
import { GAME_ROUTES, routeCell, routeSpace, routeLightDistance } from './game-route-layouts.js?v=0985987b2294';
import { kitchenSinkGeometry, KITCHEN_SINK } from './kitchen-geometry.js?v=0985987b2294';
// Geometry is specified in world units before rendering/artwork is applied.
export const WORLD_LAYOUTS = Object.freeze({
  'one-last-bird': { mode:'flight', width:1800, height:900, playerSize:72, start:[140,350], color:'#6f9d54', stations:[[160,350],[600,430],[1050,480],[1570,440]] },
  // Room2 source: starting ledge, low shelf, rising stepping stones, right exit.
  // The lethal gaps are bridged for a short, non-punishing portfolio tour.
  'chickens-breakout': { mode:'platform', width:1504, height:768, playerSize:32, playerWidth:32*23/21, start:[100,608], color:'#080808', stations:[[180,608],[560,608],[960,704],[1360,704]], platforms:[[0,736,1504,32],[64,640,608,32],[32,128,96,32],[736,544,96,32],[832,512,96,32],[992,512,64,32],[1056,448,160,32],[928,288,64,32]] },
  'plasteroids': { mode:'descent', width:OCEAN_WORLD.width, height:OCEAN_WORLD.height, playerSize:72, start:[350,260], color:'#216e6c', stations:OCEAN_LEVELS.map(level=>level.point) },
  'five-nights-at-chickens': { mode:'fixed-camera', width:1366, height:768, playerSize:1, start:[0,0], stations:[[0,0],[1,0],[2,0],[3,0]], color:'#080808' },
  'chickens-nightmare-gamemaker': { mode:'fixed-camera', width:1366, height:786, playerSize:1, start:[0,0], stations:[[0,0],[1,0],[2,0],[3,0]], color:'#080808' },
  'chickens-nightmare-ue5': { mode:'first-person', eye:.62, ...GAME_ROUTES['chickens-nightmare-ue5'], orderedRoute:true, palette:['#554234','#4d3326','#14151a'] },
  'cat-eat-rat': { mode:'rat-view', eye:.12, ...GAME_ROUTES['cat-eat-rat'], orderedRoute:true, stations:RAT_OBJECTS.map(item=>item.point), palette:['#335467','#734b31','#aaa295'] }
});

export const ROOM_MAP = GAME_ROUTES['chickens-nightmare-ue5'].map;
export const ROOM_STATIONS = GAME_ROUTES['chickens-nightmare-ue5'].stations;
export function roomFree(x,y,radius=.18,layout=WORLD_LAYOUTS['chickens-nightmare-ue5'],progress=Infinity) {
  return [[-radius,-radius],[radius,-radius],[-radius,radius],[radius,radius]].every(([dx,dy]) => routeCell(x+dx,y+dy,layout,progress) === '0');
}
export function roomPath(start,end,layout=WORLD_LAYOUTS['chickens-nightmare-ue5'],progress=Infinity) {
  const first=[Math.floor(start[0]),Math.floor(start[1])], last=[Math.floor(end[0]),Math.floor(end[1])];
  const queue=[first], seen=new Map([[first.join(','),null]]);
  for (let i=0;i<queue.length;i++) {
    const [x,y]=queue[i];
    if (x===last[0] && y===last[1]) break;
    for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const point=[x+dx,y+dy], key=point.join(',');
      if (!seen.has(key) && roomFree(point[0]+.5,point[1]+.5,.18,layout,progress)) {seen.set(key,[x,y]);queue.push(point);}
    }
  }
  if (!seen.has(last.join(','))) return [];
  const result=[];
  for(let point=last;point;point=seen.get(point.join(','))) result.unshift([point[0]+.5,point[1]+.5]);
  return result.slice(1);
}
export function moveBody(body,dx,dy,layout) {
  const next={...body};
  next.x=Math.max(layout.playerSize/2,Math.min(layout.width-layout.playerSize/2,body.x+dx));
  next.y=Math.max(layout.playerSize/2,Math.min(layout.height-layout.playerSize/2,body.y+dy));
  if(layout.mode==='platform' && dy>=0) {
    for(const [x,y,width] of layout.platforms) {
      const halfWidth=(layout.playerWidth||layout.playerSize)/2;
      if(next.x-halfWidth>=x && next.x+halfWidth<=x+width && body.y+layout.playerSize<=y+.5 && next.y+layout.playerSize>=y) {next.y=y-layout.playerSize;next.vy=0;next.grounded=true;}
    }
  }
  return next;
}

export function createWorldEngine(canvas,id,{onNearby,onArrive,onFrame,assets={},geometryOnly=false}={}) {
  const layout=WORLD_LAYOUTS[id], ctx=canvas.getContext('2d');
  const isRoom=['office','first-person','rat-view'].includes(layout.mode);
  const stations=layout.stations||ROOM_STATIONS;
  let body={x:layout.start?.[0]??4.5,y:layout.start?.[1]??1.5,angle:layout.angle??-Math.PI/2,pitch:0,vy:0,grounded:false};
  let destination=null, path=[], targetIndex=-1, wallFocus=null, raf,previous=0,paused=false, stopped=false, facing=1,lastNearby=-2;
  const keys=new Set(), images={};
  const sprite = createSpritePlayer(id), oceanSprites=layout.mode==='descent'?OCEAN_LEVELS.map(level=>createSpritePlayer(level.player)):[], enemySprite = id === 'chickens-breakout' ? createSpritePlayer('breakout-enemy') : null;
  let sample = null, enemySample = null, swimHeading=Math.PI/2;
  let collected = new Set(), lastFrame = null, routeIndex=0, pendingArrival=-1;
  let floorImage=null,floorPixels=null;
  let oceanGate=OCEAN_WORLD.maxDepth,bossHits=0,bossSample=null,inkFlash=0;
  const bossSprite=layout.mode==='descent'?createSpritePlayer('boss'):null;
  for(const [name,url] of Object.entries(assets)) {if(typeof url==='string'){const image=new Image();image.src=url;images[name]=image;}}
  if(layout.mode==='fixed-camera')assets.frames?.forEach((frame,index)=>{const image=new Image();image.src=frame.src;images['camera'+index]=image;});
  if(layout.mode==='descent')OCEAN_LEVELS.forEach((level,index)=>{const img=new Image();img.src=level.picture;images['ocean'+index]=img;});
  if(layout.mode==='descent')OCEAN_DEBRIS.forEach((asset,index)=>{const image=new Image();image.src=asset.src;images['debris'+index]=image;});
  if(layout.mode==='descent')for(const side of ['Left','Right']){const image=new Image();image.src='/assets/game-source/ocean-animals/Tentacle'+side+'.png';images['boss'+side]=image;}
  if(layout.mode==='rat-view')RAT_OBJECTS.forEach(item=>{const img=new Image();img.src=item.picture;images[item.id]=img;});
  const loaded=image=>image?.complete && image.naturalWidth>0;
  function size() {
    const rect=canvas.getBoundingClientRect();
    canvas.width=Math.max(320,Math.round(rect.width*(isRoom&&layout.mode==='office'?.65:1)));
    canvas.height=Math.max(240,Math.round(rect.height*(isRoom&&layout.mode==='office'?.65:1)));
    if(isRoom){floorImage=ctx.createImageData?.(canvas.width,canvas.height);floorPixels=floorImage?.data?new Uint32Array(floorImage.data.buffer):null;}
  }
  function proximity() {
    const distances=stations.map(([x,y],index)=>layout.orderedRoute&&index>routeIndex?Infinity:Math.hypot(body.x-x,body.y-y));
    const index=distances.indexOf(Math.min(...distances));
    return distances[index]<(layout.mode==='first-person'?1.35:isRoom?.68:160)?index:-1;
  }
  function canWalk(x,y) {
    if(!roomFree(x,y,.18,layout,routeIndex))return false;
    // A camera body may approach but must never occupy a note stand's footprint.
    return layout.mode!=='first-person'||stations.every(([sx,sy])=>Math.abs(x-sx)>.36||Math.abs(y-sy)>.31);
  }
  function camera2d() {
    if(layout.mode==='descent')return oceanCamera(body.y,body.x,canvas.width,canvas.height);
    const scale=layout.mode==='descent'?Math.max(canvas.width/layout.width,canvas.height/850):canvas.height/layout.height;
    const cameraX=Math.max(0,Math.min(Math.max(0,layout.width-canvas.width/scale),body.x-canvas.width/scale*.5));
    const cameraY=0;
    return {scale,cameraX,cameraY};
  }
  function draw2d() {
    const {scale,cameraX:camera,cameraY}=camera2d();
    ctx.fillStyle=layout.mode==='descent'?oceanWaterColor(body.y):layout.color;ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.save();ctx.scale(scale,scale);ctx.translate(-camera,-cameraY);ctx.imageSmoothingEnabled=false;
    if(layout.mode==='descent'){
      if(!geometryOnly)drawOceanEnvironment(ctx,images,{cameraY,scale,height:canvas.height,depth:body.y});
      else OCEAN_LEVELS.forEach((level,index)=>{ctx.fillStyle='#d8eeee';ctx.font='30px monospace';ctx.textAlign='left';ctx.fillText(`LEVEL 0${index+1} · ${level.name}`,50,level.top+160);});
    }
    if(layout.mode==='descent'&&body.y>OCEAN_WORLD.bossTop-250){
      if(!geometryOnly&&bossSample?.ready)drawSprite(ctx,bossSample,350,OCEAN_WORLD.bossTop+160,430,false);
      else {ctx.fillStyle='#564672';ctx.fillRect(230,OCEAN_WORLD.bossTop+180,240,390);}
      for(const part of BOSS_TENTACLES){const image=images['boss'+part.side];if(!geometryOnly&&loaded(image)){const w=part.height*part.crop[2]/part.crop[3];ctx.drawImage(image,...part.crop,part.x-w/2,part.y,w,part.height);}}
      for(let i=0;i<3;i++){ctx.fillStyle=i<bossHits?'#b2fff1':'#df8baf';ctx.beginPath();ctx.arc(280+i*70,OCEAN_WORLD.bossTop+380,12,0,Math.PI*2);ctx.fill();}
      if(inkFlash>0){ctx.strokeStyle='#a9f8f0';ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(body.x,body.y);ctx.lineTo(280+Math.max(0,bossHits-1)*70,OCEAN_WORLD.bossTop+380);ctx.stroke();}
      ctx.fillStyle='#e7defe';ctx.font='24px monospace';ctx.textAlign='center';ctx.fillText(bossHits===3?'ARENA ILLUMINATED':'FINAL ENCOUNTER',350,OCEAN_WORLD.bossTop+120);
      canvas.dataset.bossHits=String(bossHits);
    }
    if(layout.mode!=='descent'&&!geometryOnly&&loaded(images.background)) {
      const img=images.background, tileWidth=img.naturalWidth/img.naturalHeight*layout.height;
      for(let x=0;x<layout.width;x+=tileWidth) ctx.drawImage(img,x,0,tileWidth,layout.height);
    }
    if(layout.platforms) for(const [x,y,w,h] of layout.platforms) {
      ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();
      if(!geometryOnly&&loaded(images.tile)) {for(let px=x;px<x+w;px+=32)for(let py=y;py<y+h;py+=32)ctx.drawImage(images.tile,px,py,32,32);}
      else {ctx.fillStyle='#91859d';ctx.fillRect(x,y,w,h);ctx.fillStyle='#dfcddd';ctx.fillRect(x,y,w,4);}
      ctx.restore();
    }
    // Nest/branch landmarks share the same world scale as the player.
    if(layout.mode==='flight'&&!geometryOnly&&loaded(images.nest)&&loaded(images.tree)) {
      const treeHeight=850,treeWidth=treeHeight*861/1119;
      for(const x of [650,1150])ctx.drawImage(images.tree,13,499,861,1119,x-treeWidth/2,900-treeHeight,treeWidth,treeHeight);
      const landmark=(name,crop,x,y,height)=>{if(loaded(images[name]))ctx.drawImage(images[name],...crop,x-height*crop[2]/crop[3]/2,y-height,height*crop[2]/crop[3],height);};
      landmark('house',[92,65,1113,1702],160,900,840);
      ctx.drawImage(images.nest,0,112,256,136,78,422,164,164*136/256);
      landmark('pond',[96,315,837,620],1030,890,200);
      landmark('truck',[12,0,1514,1024],1610,900,310);
    }
    if(layout.mode!=='descent' && id!=='chickens-breakout')layout.stations.forEach(([x,y],index)=>{
      const nearby=proximity()===index;
      ctx.fillStyle=nearby?'#ffefb7':'#ffefb780';ctx.beginPath();ctx.arc(x,y-26,nearby?9:6,0,Math.PI*2);ctx.fill();
      if(nearby){ctx.font='18px monospace';ctx.textAlign='center';ctx.fillText('E · Explore',x,y-44);}
    });
    if (!geometryOnly && enemySample?.ready) {
      // Original enemy animation, full native base resting on the floor.
      drawSprite(ctx, enemySample, 1020, 736-40, 40, false);
    }
    const image=images.player;
    if(!geometryOnly && sample?.ready) {
      const spriteHeight=layout.mode==='descent'?layout.playerSize*sample.crop[3]/165:layout.playerSize;
      if(layout.mode==='descent'){ctx.save();ctx.translate(body.x,body.y+layout.playerSize/2);ctx.rotate(swimHeading-Math.PI);drawSprite(ctx,sample,0,-spriteHeight/2,spriteHeight,false);ctx.restore();}
      else drawSprite(ctx,sample,body.x,body.y+(layout.playerSize-spriteHeight)/2,spriteHeight);
      canvas.dataset.animationState=sample.state;canvas.dataset.animationFrame=sample.src+':'+sample.time;
    } else if(!geometryOnly&&loaded(image)) {
      let source=assets.crop||[0,0,image.naturalWidth,image.naturalHeight];
      const ratio=source[2]/source[3], height=layout.playerSize,width=height*ratio;
      ctx.save();ctx.translate(body.x,body.y);if(facing!==(assets.facing||1))ctx.scale(-1,1);
      ctx.drawImage(image,...source,-width/2,0,width,height);ctx.restore();
    } else {ctx.fillStyle='#ffdc83';ctx.fillRect(body.x-layout.playerSize/2,body.y,layout.playerSize,layout.playerSize);}
    ctx.restore();
    if(geometryOnly){ctx.strokeStyle='#ffffff66';ctx.strokeRect(1,1,canvas.width-2,canvas.height-2);}
  }
  function drawFixedCamera() {
    const index=Math.round(body.x),frame=assets.frames?.[index],image=images['camera'+index];
    ctx.fillStyle='#080808';ctx.fillRect(0,0,canvas.width,canvas.height);
    if(!geometryOnly&&frame&&loaded(image)){
      // Preserve the original flat view, including its source framing and padding.
      const scale=Math.min(canvas.width/frame.width,canvas.height/frame.height),w=frame.width*scale,h=frame.height*scale;
      const [tx,ty,tw,th]=frame.target||[0,0,frame.crop[2],frame.crop[3]];
      ctx.imageSmoothingEnabled=false;ctx.drawImage(image,...frame.crop,(canvas.width-w)/2+tx*scale,(canvas.height-h)/2+ty*scale,tw*scale,th*scale);
    }
    canvas.dataset.camera=String(index);
    canvas.dataset.sourceReady=String(Boolean(frame&&loaded(image)));
  }
  function cast(angle) {
    // Exact grid-boundary traversal: a handful of cells per ray, not hundreds
    // of tiny marching steps. This also keeps fixture edges on the floor grid.
    const rx=Math.cos(angle),ry=Math.sin(angle),stepX=rx<0?-1:1,stepY=ry<0?-1:1;
    const deltaX=Math.abs(1/rx),deltaY=Math.abs(1/ry);
    let col=Math.floor(body.x),row=Math.floor(body.y),distance=0;
    let sideX=(rx<0?body.x-col:col+1-body.x)*deltaX,sideY=(ry<0?body.y-row:row+1-body.y)*deltaY;
    for(let step=0;step<40;step++){
      if(sideX<sideY){distance=sideX;sideX+=deltaX;col+=stepX;}else{distance=sideY;sideY+=deltaY;row+=stepY;}
      const type=routeCell(col+.5,row+.5,layout,routeIndex);
      if(type!=='0'||distance>=18)return {distance,x:body.x+rx*distance,y:body.y+ry*distance,type,col,row};
    }
    return {distance:18,x:body.x+rx*18,y:body.y+ry*18,type:'1'};
  }
  function drawRoom(left,width,eye,label) {
    const height=canvas.height,horizon=height*(.47+body.pitch), depth=[],wallTops=[];
    ctx.save();ctx.beginPath();ctx.rect(left,0,width,height);ctx.clip();
    ctx.fillStyle=layout.mode==='rat-view'?'#263b43':'#111217';ctx.fillRect(left,0,width,height);
    const floorColors=layout.mode==='rat-view'?[[176,167,148],[156,147,133],[67,64,58]]:layout.mode==='first-person'?[[95,86,77],[75,68,61],[39,37,35]]:[[78,75,72],[32,32,34],[19,19,21]];
    // Floor tiles are projected from the same eye height and world grid as walls.
    // Every wall/fixture base therefore meets the complete floor plane.
    const focal=worldFocal(width,height);
    if(floorPixels)floorPixels.fill(layout.mode==='rat-view'?0xff433b26:0xff171211);
    for(let y=Math.ceil(horizon)+2;y<height;y+=5){const depth=focal*eye/(y-horizon),shade=Math.max(.15,1-depth/18);
      for(let px=0;px<width;px+=8){const angle=body.angle+Math.atan((px-width/2)/focal),rayDepth=depth/Math.max(.3,Math.cos(angle-body.angle)),wx=body.x+Math.cos(angle)*rayDepth,wy=body.y+Math.sin(angle)*rayDepth,fx=wx-Math.floor(wx),fy=wy-Math.floor(wy);
        const line=fx<.035||fy<.035,base=floorColors[line?2:(Math.floor(wx)+Math.floor(wy))%2===0?0:1];
        const lit=layout.orderedRoute&&!line?Math.max(0,1-routeLightDistance(layout,wx,wy)/1.2)*14:0;
        const color=base.map(value=>Math.min(255,Math.round(value*shade+lit)));
        if(floorPixels){const packed=(255<<24)|(color[2]<<16)|(color[1]<<8)|color[0];for(let row=y;row<Math.min(height,y+5);row++)floorPixels.fill(packed,row*canvas.width+left+px,row*canvas.width+left+Math.min(width,px+8));}
        else {ctx.fillStyle=`rgb(${color.join(',')})`;ctx.fillRect(left+px,y,8,5);}
      }
    }
    if(floorPixels)ctx.putImageData(floorImage,0,0);
    const fov=2*Math.atan(width/(2*focal)), slice=Math.max(2,Math.round(width/400));
    for(let px=0;px<width;px+=slice){const angle=body.angle+Math.atan((px-width/2)/focal),hit=cast(angle),d=Math.max(.12,hit.distance*Math.cos(angle-body.angle));depth[px]=d;
      const sinkHit=layout.mode==='rat-view'&&hit.type==='2'&&hit.row===2&&hit.col===Math.floor(KITCHEN_SINK.center[0]);
      const fullHeight=focal/d,wallHeight=fullHeight*(hit.type==='2'?(sinkHit?.34:.45):1),base=horizon+fullHeight*eye,top=base-wallHeight;wallTops[px]=top;
      ctx.fillStyle=sinkHit?'#526879':hit.type==='3'?'#68766d':hit.type==='2'?layout.palette[1]:layout.mode==='first-person'?'#77776f':layout.palette[0];ctx.fillRect(left+px,top,slice+1,wallHeight);
      if(layout.mode==='first-person'&&hit.type==='1'){
        // Neutral restaurant plaster above a timber dado, fitted to the wall plane.
        ctx.fillStyle='#594c3b';ctx.fillRect(left+px,base-fullHeight*.28,slice+1,fullHeight*.28);
        const u=((hit.x+hit.y)%1+1)%1;if(u<.025){ctx.fillStyle='#26302b';ctx.fillRect(left+px,top,slice+1,wallHeight);}
      }
      if(hit.type!=='2'&&hit.type!=='3'&&!geometryOnly&&loaded(images.wall)){const texture=images.wall,u=((hit.x+hit.y)%1+1)%1;ctx.drawImage(texture,Math.floor(u*(texture.naturalWidth-1)),0,1,texture.naturalHeight,left+px,top,slice+1,wallHeight);}
      ctx.fillStyle=`rgba(0,0,0,${Math.min(.8,d/13)})`;ctx.fillRect(left+px,top,slice+1,wallHeight);
      if(hit.type==='2'){ctx.fillStyle='#0005';ctx.fillRect(left+px,base-wallHeight*.05,slice+1,wallHeight*.05);}
    }
    // Counter tops, directional signs and note stands all use the same projection.
    // Their complete bottom footprint remains at z=0; nothing is screen-positioned.
    const surfaces=[];
    function face(points,color,fixture=false){const projected=points.map(p=>projectRatPoint(p,body,width,height,eye));if(projected.some(p=>p.depth<.05))return;
      const center=projected.reduce((sum,p)=>sum+p.x,0)/projected.length,z=projected.reduce((sum,p)=>sum+p.depth,0)/projected.length,ray=depth[Math.floor(center/slice)*slice];
      const slot=Math.floor(center/slice)*slice;
      if(center<0||center>width||ray&&z>ray+.2&&!(fixture&&projected.every(p=>p.y<wallTops[slot])))return;surfaces.push({projected,color,z});}
    for(let y=0;y<layout.map.length;y++)for(let x=0;x<layout.map[y].length;x++)if(layout.map[y][x]==='2'&&!(layout.mode==='rat-view'&&y===2&&x===9))face([[x,y,.45],[x+1,y,.45],[x+1,y+1,.45],[x,y+1,.45]],'#8b684d');
    if(layout.mode==='rat-view')for(const mesh of kitchenSinkGeometry())for(const indices of mesh.faces)face(indices.map(i=>mesh.vertices[i]),mesh.color,true);
    if(layout.mode==='first-person')stations.forEach(([x,y],index)=>{
      const h=.32;
      face([[x-.18,y-.13,0],[x+.18,y-.13,0],[x+.18,y-.13,h],[x-.18,y-.13,h]],'#584636');
      face([[x+.18,y-.13,0],[x+.18,y+.13,0],[x+.18,y+.13,h],[x+.18,y-.13,h]],'#423b32');
      face([[x-.18,y-.13,h],[x+.18,y-.13,h],[x+.18,y+.13,h],[x-.18,y+.13,h]],index<routeIndex?'#8f9b8b':index===routeIndex?'#ead6a3':'#706c63');
    });
    surfaces.sort((a,b)=>b.z-a.z).forEach(({projected,color})=>{ctx.beginPath();projected.forEach((p,i)=>i?ctx.lineTo(left+p.x,p.y):ctx.moveTo(left+p.x,p.y));ctx.closePath();ctx.fillStyle=color;ctx.fill();});
    for(const landmark of layout.landmarks||[]){const p=projectRatPoint([...landmark.point,landmark.height],body,width,height,eye),ray=depth[Math.floor(p.x/slice)*slice];
      if(p.depth<.12||p.x<0||p.x>width||ray&&p.depth>ray+.2)continue;const scale=Math.min(1.2,1.4/p.depth);
      ctx.save();ctx.translate(left+p.x,p.y);ctx.scale(scale,scale);ctx.fillStyle='#25382ee8';ctx.fillRect(-57,-16,114,29);ctx.strokeStyle='#b6c5aa';ctx.strokeRect(-57,-16,114,29);ctx.fillStyle='#eef0d1';ctx.font='12px monospace';ctx.textAlign='center';ctx.fillText(landmark.label,0,3);ctx.restore();}
    const objects=layout.mode==='rat-view'?RAT_OBJECTS.map((item,index)=>({...item,index})):stations.map((point,index)=>({point,index}));
    objects.sort((a,b)=>Math.hypot(...a.point.map((value,i)=>value-[body.x,body.y][i]))-Math.hypot(...b.point.map((value,i)=>value-[body.x,body.y][i]))).reverse().forEach(item=>{
      if(layout.orderedRoute&&item.index>routeIndex)return;
      if(item.id&&collected.has(item.id))return;
      const [x,y]=item.drawPoint||item.point,index=item.index;const dx=x-body.x,dy=y-body.y,d=Math.hypot(dx,dy);let angle=Math.atan2(dy,dx)-body.angle;while(angle>Math.PI)angle-=Math.PI*2;while(angle<-Math.PI)angle+=Math.PI*2;if(Math.abs(angle)>fov*.52||d<.1)return;
      const px=width/2+focal*Math.tan(angle),z=d*Math.cos(angle),ray=depth[Math.floor(px/slice)*slice];if(ray&&z>ray+.1)return;
      const ground=horizon+focal*eye/z;
      if(item.id){const faces=[];
        for(const mesh of ratPropGeometry(item))for(const face of mesh.faces){const world=face.map(i=>mesh.vertices[i]),points=world.map(point=>projectRatPoint(point,body,width,height,eye));if(points.some(point=>point.depth<.03))continue;faces.push({world,points,color:mesh.color,depth:points.reduce((sum,p)=>sum+p.depth,0)/points.length});}
        faces.sort((a,b)=>b.depth-a.depth).forEach((face,faceIndex)=>{ctx.beginPath();face.points.forEach((p,i)=>i?ctx.lineTo(left+p.x,p.y):ctx.moveTo(left+p.x,p.y));ctx.closePath();ctx.fillStyle=face.color;ctx.fill();ctx.fillStyle=`rgba(0,0,0,${(faceIndex%3)*.12})`;ctx.fill();ctx.strokeStyle='#15222b70';ctx.lineWidth=1;ctx.stroke();
          if(item.kind==='cheese'&&face.world.length===4)for(const center of [.3,.72]){const [a,b]=face.world;ctx.beginPath();for(let step=0;step<=16;step++){const angle=step/16*Math.PI*2,u=center+Math.cos(angle)*.055,point=[a[0]+(b[0]-a[0])*u,a[1]+(b[1]-a[1])*u,.044+Math.sin(angle)*.012],p=projectRatPoint(point,body,width,height,eye);if(step)ctx.lineTo(left+p.x,p.y);else ctx.moveTo(left+p.x,p.y);}ctx.fillStyle='#9d692d';ctx.fill();}
        });
        // Contact guides use the same projected plane as the actual floor tiles.
        if(geometryOnly)for(const mesh of ratPropGeometry(item))for(const point of mesh.vertices.filter(vertex=>vertex[2]===0)){const p=projectRatPoint(point,body,width,height,eye);ctx.fillStyle='#fc6790';ctx.fillRect(left+p.x-2,p.y-2,4,4);}
        if(proximity()===index){ctx.fillStyle='#fff4c0';ctx.font='13px monospace';ctx.textAlign='center';ctx.fillText('E · '+item.kind,left+px,ground-focal*item.height/z-12);}return;}
      // The note marker sits on the grounded stand's top, not over the floor.
      const decal=[[x-.2,y-.2,0],[x+.2,y-.2,0],[x+.2,y+.2,0],[x-.2,y+.2,0]].map(point=>projectRatPoint(point,body,width,height,eye));
      if(decal.every(point=>point.depth>.03)){const top=projectRatPoint([x,y,.32],body,width,height,eye);ctx.fillStyle='#17261e';ctx.font='12px monospace';ctx.textAlign='center';ctx.fillText(`0${index+1}`,left+px,top.y);}
    });
    ctx.fillStyle='#fff8';ctx.fillRect(left+width/2-4,horizon,8,1);ctx.fillRect(left+width/2,horizon-4,1,8);
    if(label){ctx.fillStyle='#0e171ce8';ctx.fillRect(left+12,height-72,190,28);ctx.fillStyle='#eee';ctx.font='13px monospace';ctx.fillText(label,left+105,height-53);}
    ctx.restore();
  }
  function render(){if(layout.mode==='fixed-camera')drawFixedCamera();else if(isRoom)drawRoom(0,canvas.width,layout.eye);else draw2d();const nearby=proximity();canvas.dataset.nearby=String(nearby);canvas.dataset.position=`${body.x.toFixed(2)},${body.y.toFixed(2)}`;if(nearby!==lastNearby){lastNearby=nearby;onNearby?.(nearby);}
    lastFrame={...body,...(!isRoom?camera2d():{}),width:canvas.width,height:canvas.height,level:layout.mode==='descent'?oceanLevel(body.y):0};
    canvas.dataset.level=String(lastFrame.level);canvas.dataset.routeStop=String(routeIndex);
    if(layout.orderedRoute){canvas.dataset.angle=body.angle.toFixed(3);canvas.dataset.pitch=body.pitch.toFixed(3);canvas.dataset.space=routeSpace(layout,body.x,body.y);lastFrame.routeIndex=routeIndex;lastFrame.space=canvas.dataset.space;}
    onFrame?.(lastFrame);}
  function update(dt) {
    if(layout.mode==='fixed-camera')return;
    if(isRoom){if(keys.has('left'))body.angle-=dt*1.8;if(keys.has('right'))body.angle+=dt*1.8;
      body.pitch=Math.max(-.28,Math.min(.2,body.pitch+(Number(keys.has('look-up'))-Number(keys.has('look-down')))*dt*.5));
      let dx=0,dy=0;const forward=Number(keys.has('up'))-Number(keys.has('down'));
      dx=Math.cos(body.angle)*forward*dt*2;dy=Math.sin(body.angle)*forward*dt*2;
      if(path.length){const [x,y]=path[0],distance=Math.hypot(x-body.x,y-body.y);if(distance<(path.length===1?(wallFocus ? .06 : layout.mode==='first-person'?1.25:.58):.06))path.shift();else{
        const desired=Math.atan2(y-body.y,x-body.x),turn=Math.atan2(Math.sin(desired-body.angle),Math.cos(desired-body.angle));
        body.angle+=Math.sign(turn)*Math.min(Math.abs(turn),dt*3.2);dx=(x-body.x)/distance*Math.min(distance,dt*2);dy=(y-body.y)/distance*Math.min(distance,dt*2);}}
      if(canWalk(body.x+dx,body.y))body.x+=dx;if(canWalk(body.x,body.y+dy))body.y+=dy;
      if(wallFocus&&!path.length) {
        const [x,y,z]=wallFocus,desired=Math.atan2(y-body.y,x-body.x);
        const turn=Math.atan2(Math.sin(desired-body.angle),Math.cos(desired-body.angle));
        const pitch=Math.max(-.28,Math.min(.2,(z-layout.eye)*worldFocal(canvas.width,canvas.height)/(Math.max(.1,Math.hypot(x-body.x,y-body.y))*canvas.height)));
        body.angle+=Math.sign(turn)*Math.min(Math.abs(turn),dt*2.6);
        body.pitch+=Math.sign(pitch-body.pitch)*Math.min(Math.abs(pitch-body.pitch),dt*.5);
        if(Math.abs(turn)<.005&&Math.abs(pitch-body.pitch)<.005)wallFocus=null;
      }
      if(targetIndex>=0&&!path.length&&proximity()===targetIndex){
        const [x,y]=stations[targetIndex],desired=Math.atan2(y-body.y,x-body.x),turn=Math.atan2(Math.sin(desired-body.angle),Math.cos(desired-body.angle));
        body.angle+=Math.sign(turn)*Math.min(Math.abs(turn),dt*3.2);
        if(layout.mode==='first-person')body.pitch+=Math.sign(-.24-body.pitch)*Math.min(Math.abs(-.24-body.pitch),dt*.8);
        if(Math.abs(turn)<.06&&(layout.mode!=='first-person'||Math.abs(body.pitch+.24)<.015)){const index=targetIndex;targetIndex=-1;keys.clear();pendingArrival=index;}
      }
    } else {
      const verticalSpeed=layout.mode==='descent'?100:240;
      let dx=(Number(keys.has('right'))-Number(keys.has('left')))*dt*300,dy=(Number(keys.has('down'))-Number(keys.has('up')))*dt*verticalSpeed;
      if(destination){const [x,y]=destination;dx=Math.sign(x-body.x)*Math.min(Math.abs(x-body.x),dt*300);if(layout.mode!=='platform')dy=Math.sign(y-body.y)*Math.min(Math.abs(y-body.y),dt*verticalSpeed);else if(body.grounded && y<body.y-25){body.vy=-650;body.grounded=false;}
        if(Math.abs(x-body.x)<(layout.mode==='descent'?.1:8) && Math.abs(y-body.y)<(layout.mode==='platform'?70:layout.mode==='descent'?.1:8)){destination=null;const index=targetIndex;targetIndex=-1;if(index>=0)onArrive?.(index);}}
      if(layout.mode==='platform'){if(keys.has('up')&&body.grounded){body.vy=-650;body.grounded=false;}body.vy+=dt*1050;dy=body.vy*dt;body.grounded=false;}
      if(dx)facing=Math.sign(dx);
      body=moveBody(body,dx,dy,layout);
      if(layout.mode==='descent')body.y=Math.min(body.y,oceanGate);
    }
  }
  function tick(time){if(stopped)return;if(isRoom&&previous&&time-previous<32){raf=requestAnimationFrame(tick);return;}const dt=Math.min(isRoom?.065:.04,(time-(previous||time))/1000);previous=time;if(!paused&&!document.hidden){const oldX=body.x,oldY=body.y;update(dt);const moving=layout.mode==='flight'||Math.hypot(body.x-oldX,body.y-oldY)>.01;if(layout.mode==='descent'&&moving)swimHeading=Math.atan2(body.y-oldY,body.x-oldX);const activeSprite=oceanSprites[oceanLevel(body.y)]||sprite;sample=activeSprite?.advance(dt,moving,facing,isReducedMotion());enemySample=enemySprite?.advance(dt,false,1,isReducedMotion());bossSample=bossSprite?.advance(dt,true,1,isReducedMotion(),true);inkFlash=Math.max(0,inkFlash-dt);render();if(pendingArrival>=0){const index=pendingArrival;pendingArrival=-1;onArrive?.(index);}}raf=requestAnimationFrame(tick);}
  size();render();raf=requestAnimationFrame(tick);
  return {key(key,down){if(down){if(paused)return;wallFocus=null;if(layout.mode==='fixed-camera'&&!keys.has(key)){body.x=Math.max(0,Math.min(3,body.x+(key==='right'?1:key==='left'?-1:0)));render();}destination=null;path=[];targetIndex=-1;keys.add(key);}else keys.delete(key);},clear(){keys.clear();},pause(value){if(value||paused!==value)keys.clear();paused=value;},nearby:proximity,
    visit(index,instant=false){if(!stations[index])return;if(layout.mode==='fixed-camera'){body.x=index;render();onArrive?.(index);return;}
      if(layout.orderedRoute){if(index<routeIndex){onArrive?.(index);return;}index=routeIndex;if(!stations[index])return;}
      wallFocus=null;targetIndex=index;if(isRoom){path=roomPath([body.x,body.y],stations[index],layout,routeIndex);if(!path.length&&proximity()!==index){targetIndex=-1;return;}
        if(instant){const approach=path.length>1?path.at(-2):[body.x,body.y],target=stations[index],d=Math.hypot(target[0]-approach[0],target[1]-approach[1]);
          const angle=Math.atan2(target[1]-approach[1],target[0]-approach[0]);
          const offset=layout.mode==='first-person'?1.22:.56;
          [body.x,body.y]=d>offset?[target[0]-Math.cos(angle)*offset,target[1]-Math.sin(angle)*offset]:approach;body.angle=angle;body.pitch=layout.mode==='first-person'?-.24:0;path=[];targetIndex=-1;render();onArrive?.(index);}}
      else{destination=stations[index];if(instant){body.x=destination[0];body.y=layout.mode==='descent'?Math.min(destination[1],oceanGate):destination[1];destination=null;targetIndex=-1;render();if(layout.mode!=='descent'||body.y===stations[index][1])onArrive?.(index);}}},
    point(x,y){if(isRoom||paused)return;const {scale,cameraX,cameraY}=camera2d();destination=[Math.min(layout.width-60,Math.max(60,x/scale+cameraX)),Math.min(layout.height-100,Math.max(60,y/scale+cameraY))];targetIndex=-1;},
    acknowledgeStop(index){if(layout.orderedRoute&&Number.isInteger(index)&&index===routeIndex){routeIndex=index+1;targetIndex=-1;pendingArrival=-1;path=[];keys.clear();render();}},
    look(delta,pitch=0){if(isRoom&&!paused&&Number.isFinite(delta)&&Number.isFinite(pitch)){wallFocus=null;path=[];targetIndex=-1;body.angle+=Math.max(-.3,Math.min(.3,delta));body.pitch=Math.max(-.28,Math.min(.2,body.pitch+pitch));render();}},
    walkTo(point,lookAt,instant=false){if(layout.mode!=='rat-view'||!point?.every(Number.isFinite)||!lookAt?.every(Number.isFinite)||!canWalk(...point))return false;
      path=roomPath([body.x,body.y],point,layout,routeIndex);const sameCell=Math.floor(body.x)===Math.floor(point[0])&&Math.floor(body.y)===Math.floor(point[1]);
      if(!path.length&&!sameCell)return false;
      path.push([...point]);wallFocus=[...lookAt];targetIndex=-1;pendingArrival=-1;destination=null;keys.clear();
      if(instant){[body.x,body.y]=point;body.angle=Math.atan2(lookAt[1]-body.y,lookAt[0]-body.x);body.pitch=Math.max(-.28,Math.min(.2,(lookAt[2]-layout.eye)*worldFocal(canvas.width,canvas.height)/(Math.max(.1,Math.hypot(lookAt[0]-body.x,lookAt[1]-body.y))*canvas.height)));path=[];wallFocus=null;render();}return true;},
    swimToDepth(value,instant=false,keepX=false){if(layout.mode!=='descent'||!Number.isFinite(value))return;destination=[keepX?body.x:350,Math.max(36,Math.min(oceanGate,value))];targetIndex=-1;if(instant){[body.x,body.y]=destination;destination=null;render();}},
    setOceanGate(value){if(Number.isFinite(value))oceanGate=Math.max(180,Math.min(OCEAN_WORLD.maxDepth,value));},setBossHits(value){bossHits=Math.max(0,Math.min(3,value));inkFlash=.35;render();},
    setCollected(ids){collected=new Set(ids);render();},resetRoute(index=0){routeIndex=Math.max(0,Math.min(stations.length,Number.isInteger(index)?index:0));[body.x,body.y]=routeIndex?stations[routeIndex-1]:layout.start;body.angle=layout.angle??body.angle;body.pitch=0;targetIndex=-1;wallFocus=null;pendingArrival=-1;path=[];destination=null;keys.clear();render();},snapshot(){return lastFrame;},
    resize(){size();render();},destroy(){stopped=true;cancelAnimationFrame(raf);}};
}

/** Looking is an intentional drag on the game canvas, never ambient mouse parallax. */
export function bindWorldLook(canvas,engine,signal,{mouseOnly=false}={}) {
  let drag=null;
  canvas.addEventListener('pointerdown',event=>{if(event.button!==0||(mouseOnly&&event.pointerType==='touch'))return;drag={id:event.pointerId,x:event.clientX,y:event.clientY};canvas.setPointerCapture(event.pointerId);canvas.focus({preventScroll:true});},{signal});
  canvas.addEventListener('pointermove',event=>{if(!drag||drag.id!==event.pointerId)return;const dx=event.clientX-drag.x,dy=event.clientY-drag.y;drag.x=event.clientX;drag.y=event.clientY;engine.look(-dx*.006,-dy*.001);},{signal});
  for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,()=>{drag=null;},{signal});
}
