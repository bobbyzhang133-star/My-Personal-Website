import { createSpritePlayer, drawSprite } from './game-animation.js?v=39bd00589fe9';
import { isReducedMotion } from './utils.js?v=39bd00589fe9';
import { OCEAN_LEVELS, RAT_OBJECTS, oceanLevel, verticalCamera, ratPropGeometry, projectRatPoint } from './experience-state.js?v=39bd00589fe9';
// Geometry is specified in world units before rendering/artwork is applied.
export const WORLD_LAYOUTS = Object.freeze({
  'one-last-bird': { mode:'flight', width:2400, height:900, playerSize:72, start:[260,410], color:'#6f9d54', stations:[[220,410],[800,310],[1480,440],[2140,290]] },
  'chickens-breakout': { mode:'platform', width:2400, height:900, playerSize:48, playerWidth:48*23/21, start:[180,732], color:'#39283f', stations:[[220,732],[820,560],[1470,660],[2160,732]], platforms:[[0,780,2400,120],[520,608,380,28],[1150,708,430,28],[1810,608,280,28]] },
  'plasteroids': { mode:'descent', width:1000, height:4500, playerSize:72, start:[500,240], color:'#216e6c', stations:OCEAN_LEVELS.map(level=>level.point) },
  'five-nights-at-chickens': { mode:'office', eye:.55, palette:['#353334','#7c1717','#181b20'] },
  'chickens-nightmare-gamemaker': { mode:'office', eye:.55, palette:['#222222','#912020','#111111'] },
  'chickens-nightmare-ue5': { mode:'first-person', eye:.62, palette:['#514746','#86552d','#14151a'] },
  'cat-eat-rat': { mode:'rat-view', eye:.12, start:[2.5,6.5], stations:RAT_OBJECTS.map(item=>item.point), palette:['#335467','#734b31','#aaa295'] }
});

// 1=wall, 2=solid fixture. The central loop connects all discovery locations.
export const ROOM_MAP = [
  '111111111111',
  '100000000001',
  '102200022001',
  '100000000001',
  '100100010001',
  '100100010001',
  '100000000001',
  '100220022001',
  '100000000001',
  '111111111111'
];
export const ROOM_STATIONS = [[2.5,1.5],[9.5,1.5],[9.5,8.5],[2.5,8.5]];
export function roomFree(x,y,radius=.18) {
  return [[-radius,-radius],[radius,-radius],[-radius,radius],[radius,radius]].every(([dx,dy]) => ROOM_MAP[Math.floor(y+dy)]?.[Math.floor(x+dx)] === '0');
}
export function roomPath(start,end) {
  const first=[Math.floor(start[0]),Math.floor(start[1])], last=[Math.floor(end[0]),Math.floor(end[1])];
  const queue=[first], seen=new Map([[first.join(','),null]]);
  for (let i=0;i<queue.length;i++) {
    const [x,y]=queue[i];
    if (x===last[0] && y===last[1]) break;
    for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const point=[x+dx,y+dy], key=point.join(',');
      if (!seen.has(key) && roomFree(point[0]+.5,point[1]+.5)) {seen.set(key,[x,y]);queue.push(point);}
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
  let body={x:layout.start?.[0]??5.5,y:layout.start?.[1]??6.5,angle:-Math.PI/2,vy:0,grounded:false};
  let destination=null, path=[], targetIndex=-1, raf,previous=0,paused=false, stopped=false, facing=1,lastNearby=-2;
  const keys=new Set(), images={};
  const sprite = createSpritePlayer(id), oceanSprites=layout.mode==='descent'?OCEAN_LEVELS.map(level=>createSpritePlayer(level.player)):[], enemySprite = id === 'chickens-breakout' ? createSpritePlayer('breakout-enemy') : null;
  let sample = null, enemySample = null, swimHeading=Math.PI/2;
  let collected = new Set(), lastFrame = null;
  for(const [name,url] of Object.entries(assets)) {if(typeof url==='string'){const image=new Image();image.src=url;images[name]=image;}}
  if(layout.mode==='descent')OCEAN_LEVELS.forEach((level,index)=>{const img=new Image();img.src=level.picture;images['ocean'+index]=img;});
  if(layout.mode==='rat-view')RAT_OBJECTS.forEach(item=>{const img=new Image();img.src=item.picture;images[item.id]=img;});
  const loaded=image=>image?.complete && image.naturalWidth>0;
  function size() {
    const rect=canvas.getBoundingClientRect();
    canvas.width=Math.max(320,Math.round(rect.width*(isRoom&&layout.mode==='office'?.65:1)));
    canvas.height=Math.max(240,Math.round(rect.height*(isRoom&&layout.mode==='office'?.65:1)));
  }
  function proximity() {
    const distances=stations.map(([x,y])=>Math.hypot(body.x-x,body.y-y));
    const index=distances.indexOf(Math.min(...distances));
    return distances[index]<(isRoom?.85:160)?index:-1;
  }
  function camera2d() {
    const scale=layout.mode==='descent'?Math.max(canvas.width/layout.width,canvas.height/1100):canvas.height/layout.height;
    const cameraX=Math.max(0,Math.min(Math.max(0,layout.width-canvas.width/scale),body.x-canvas.width/scale*.5));
    const cameraY=layout.mode==='descent'?verticalCamera(body.y,canvas.height/scale,layout.height):0;
    return {scale,cameraX,cameraY};
  }
  function draw2d() {
    const {scale,cameraX:camera,cameraY}=camera2d();
    ctx.fillStyle=layout.color;ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.save();ctx.scale(scale,scale);ctx.translate(-camera,-cameraY);ctx.imageSmoothingEnabled=false;
    if(layout.mode==='descent') OCEAN_LEVELS.forEach((level,index)=>{
      ctx.fillStyle=level.color;ctx.fillRect(0,level.top,layout.width,level.bottom-level.top);
      const img=images['ocean'+index];
      if(!geometryOnly&&loaded(img)){const h=layout.width*img.naturalHeight/img.naturalWidth;ctx.save();ctx.beginPath();ctx.rect(0,level.top,layout.width,level.bottom-level.top);ctx.clip();
        if(index===2){const height=level.bottom-level.top,w=height*img.naturalWidth/img.naturalHeight;ctx.drawImage(img,(layout.width-w)/2,level.top,w,height);}else ctx.drawImage(img,0,level.top,layout.width,h);ctx.restore();}
      if(geometryOnly){ctx.fillStyle='#d8eeee';ctx.font='30px monospace';ctx.textAlign='left';ctx.fillText(`LEVEL 0${index+1} · ${level.name}`,50,level.top+160);}
    });
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
    if(layout.mode==='flight'&&!geometryOnly&&loaded(images.nest)&&loaded(images.tree)) for(const [x,y]of layout.stations){
      const treeHeight=850,treeWidth=treeHeight*861/1119;
      ctx.drawImage(images.tree,13,499,861,1119,x-treeWidth/2,900-treeHeight,treeWidth,treeHeight);
      // Sample the actual opaque nest bounds without stretching its aspect ratio.
      ctx.drawImage(images.nest,0,112,256,136,x-82,y+layout.playerSize,164,164*136/256);
    }
    if(layout.mode!=='descent' && id!=='chickens-breakout')layout.stations.forEach(([x,y],index)=>{
      const nearby=proximity()===index;
      ctx.fillStyle=nearby?'#ffefb7':'#ffefb780';ctx.beginPath();ctx.arc(x,y-26,nearby?9:6,0,Math.PI*2);ctx.fill();
      if(nearby){ctx.font='18px monospace';ctx.textAlign='center';ctx.fillText('E · Explore',x,y-44);}
    });
    if (!geometryOnly && enemySample?.ready) {
      // Original enemy animation, full native base resting on the floor.
      drawSprite(ctx, enemySample, 990, 780-58, 58, false);
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
  function cast(angle) {
    let distance=0,x=body.x,y=body.y;
    while(distance<18) {distance+=.035;x=body.x+Math.cos(angle)*distance;y=body.y+Math.sin(angle)*distance;if(ROOM_MAP[Math.floor(y)]?.[Math.floor(x)]!=='0')break;}
    return {distance,x,y,type:ROOM_MAP[Math.floor(y)]?.[Math.floor(x)]||'1'};
  }
  function drawRoom(left,width,eye,label) {
    const height=canvas.height,horizon=height*.47, depth=[];
    ctx.save();ctx.beginPath();ctx.rect(left,0,width,height);ctx.clip();
    ctx.fillStyle=layout.mode==='rat-view'?'#263b43':'#111217';ctx.fillRect(left,0,width,height);
    const floorColors=layout.mode==='rat-view'?[[176,167,148],[156,147,133],[67,64,58]]:layout.mode==='first-person'?[[95,86,77],[75,68,61],[39,37,35]]:[[78,75,72],[32,32,34],[19,19,21]];
    // Floor tiles are projected from the same eye height and world grid as walls.
    // Every wall/fixture base therefore meets the complete floor plane.
    const focal=height*1.25;
    for(let y=Math.ceil(horizon)+2;y<height;y+=5){const depth=focal*eye/(y-horizon),shade=Math.max(.15,1-depth/18);
      for(let px=0;px<width;px+=8){const angle=body.angle+(px/width-.5)*Math.PI/2.8,rayDepth=depth/Math.max(.3,Math.cos(angle-body.angle)),wx=body.x+Math.cos(angle)*rayDepth,wy=body.y+Math.sin(angle)*rayDepth,fx=wx-Math.floor(wx),fy=wy-Math.floor(wy);
        const line=fx<.035||fy<.035,base=floorColors[line?2:(Math.floor(wx)+Math.floor(wy))%2===0?0:1];ctx.fillStyle=`rgb(${base.map(value=>Math.round(value*shade)).join(',')})`;ctx.fillRect(left+px,y,8,5);
      }
    }
    const fov=Math.PI/2.8, slice=Math.max(2,Math.round(width/400));
    for(let px=0;px<width;px+=slice){const angle=body.angle+(px/width-.5)*fov,hit=cast(angle),d=Math.max(.12,hit.distance*Math.cos(angle-body.angle));depth[px]=d;
      const fullHeight=height*1.25/d,wallHeight=fullHeight*(hit.type==='2'?.45:1),base=horizon+fullHeight*eye,top=base-wallHeight;
      ctx.fillStyle=hit.type==='2'?layout.palette[1]:layout.palette[0];ctx.fillRect(left+px,top,slice+1,wallHeight);
      if(!geometryOnly&&loaded(images.wall)){const texture=images.wall,u=((hit.x+hit.y)%1+1)%1;ctx.drawImage(texture,Math.floor(u*(texture.naturalWidth-1)),0,1,texture.naturalHeight,left+px,top,slice+1,wallHeight);}
      ctx.fillStyle=`rgba(0,0,0,${Math.min(.8,d/13)})`;ctx.fillRect(left+px,top,slice+1,wallHeight);
      if(hit.type==='2'){ctx.fillStyle='#0005';ctx.fillRect(left+px,base-wallHeight*.05,slice+1,wallHeight*.05);}
    }
    const objects=layout.mode==='rat-view'?RAT_OBJECTS.map((item,index)=>({...item,index})):stations.map((point,index)=>({point,index}));
    objects.sort((a,b)=>Math.hypot(...a.point.map((value,i)=>value-[body.x,body.y][i]))-Math.hypot(...b.point.map((value,i)=>value-[body.x,body.y][i]))).reverse().forEach(item=>{
      if(item.id&&collected.has(item.id))return;
      const [x,y]=item.drawPoint||item.point,index=item.index;const dx=x-body.x,dy=y-body.y,d=Math.hypot(dx,dy);let angle=Math.atan2(dy,dx)-body.angle;while(angle>Math.PI)angle-=Math.PI*2;while(angle<-Math.PI)angle+=Math.PI*2;if(Math.abs(angle)>fov*.52||d<.1)return;
      const px=(.5+angle/fov)*width,z=d*Math.cos(angle),ray=depth[Math.floor(px/slice)*slice];if(ray&&z>ray+.1)return;
      const ground=horizon+height*1.25*eye/z,marker=Math.min(50,60/z);
      if(item.id){const faces=[];
        for(const mesh of ratPropGeometry(item))for(const face of mesh.faces){const world=face.map(i=>mesh.vertices[i]),points=world.map(point=>projectRatPoint(point,body,width,height,eye));if(points.some(point=>point.depth<.03))continue;faces.push({world,points,color:mesh.color,depth:points.reduce((sum,p)=>sum+p.depth,0)/points.length});}
        faces.sort((a,b)=>b.depth-a.depth).forEach((face,faceIndex)=>{ctx.beginPath();face.points.forEach((p,i)=>i?ctx.lineTo(left+p.x,p.y):ctx.moveTo(left+p.x,p.y));ctx.closePath();ctx.fillStyle=face.color;ctx.fill();ctx.fillStyle=`rgba(0,0,0,${(faceIndex%3)*.12})`;ctx.fill();ctx.strokeStyle='#15222b70';ctx.lineWidth=1;ctx.stroke();
          if(item.kind==='cheese'&&face.world.length===4)for(const center of [.3,.72]){const [a,b]=face.world;ctx.beginPath();for(let step=0;step<=16;step++){const angle=step/16*Math.PI*2,u=center+Math.cos(angle)*.055,point=[a[0]+(b[0]-a[0])*u,a[1]+(b[1]-a[1])*u,.044+Math.sin(angle)*.012],p=projectRatPoint(point,body,width,height,eye);if(step)ctx.lineTo(left+p.x,p.y);else ctx.moveTo(left+p.x,p.y);}ctx.fillStyle='#9d692d';ctx.fill();}
        });
        // Contact guides use the same projected plane as the actual floor tiles.
        if(geometryOnly)for(const mesh of ratPropGeometry(item))for(const point of mesh.vertices.filter(vertex=>vertex[2]===0)){const p=projectRatPoint(point,body,width,height,eye);ctx.fillStyle='#fc6790';ctx.fillRect(left+p.x-2,p.y-2,4,4);}
        if(proximity()===index){ctx.fillStyle='#fff4c0';ctx.font='13px monospace';ctx.textAlign='center';ctx.fillText('E · '+item.kind,left+px,ground-height*1.25*item.height/z-12);}return;}
      ctx.fillStyle=proximity()===index?'#ffe29a':'#bdcebc';ctx.fillRect(left+px-marker/2,ground-marker*1.6,marker,marker);ctx.font='12px monospace';ctx.textAlign='center';ctx.fillText(`0${index+1}`,left+px,ground-marker*1.8);
    });
    ctx.fillStyle='#fff8';ctx.fillRect(left+width/2-4,horizon,8,1);ctx.fillRect(left+width/2,horizon-4,1,8);
    if(label){ctx.fillStyle='#0e171ce8';ctx.fillRect(left+12,height-72,190,28);ctx.fillStyle='#eee';ctx.font='13px monospace';ctx.fillText(label,left+105,height-53);}
    ctx.restore();
  }
  function render(){if(isRoom)drawRoom(0,canvas.width,layout.eye);else draw2d();const nearby=proximity();canvas.dataset.nearby=String(nearby);canvas.dataset.position=`${body.x.toFixed(2)},${body.y.toFixed(2)}`;if(nearby!==lastNearby){lastNearby=nearby;onNearby?.(nearby);}
    lastFrame={...body,...(!isRoom?camera2d():{}),width:canvas.width,height:canvas.height,level:layout.mode==='descent'?oceanLevel(body.y):0};
    canvas.dataset.level=String(lastFrame.level);onFrame?.(lastFrame);}
  function update(dt) {
    if(isRoom){if(keys.has('left'))body.angle-=dt*1.8;if(keys.has('right'))body.angle+=dt*1.8;
      let dx=0,dy=0;const forward=Number(keys.has('up'))-Number(keys.has('down'));
      dx=Math.cos(body.angle)*forward*dt*2;dy=Math.sin(body.angle)*forward*dt*2;
      if(path.length){const [x,y]=path[0],distance=Math.hypot(x-body.x,y-body.y);if(distance<.06)path.shift();else{body.angle=Math.atan2(y-body.y,x-body.x);dx=(x-body.x)/distance*Math.min(distance,dt*2);dy=(y-body.y)/distance*Math.min(distance,dt*2);}}
      if(roomFree(body.x+dx,body.y))body.x+=dx;if(roomFree(body.x,body.y+dy))body.y+=dy;
      if(targetIndex>=0&&!path.length&&proximity()===targetIndex){const index=targetIndex;targetIndex=-1;onArrive?.(index);}
    } else {
      let dx=(Number(keys.has('right'))-Number(keys.has('left')))*dt*300,dy=(Number(keys.has('down'))-Number(keys.has('up')))*dt*240;
      if(destination){const [x,y]=destination;dx=Math.sign(x-body.x)*Math.min(Math.abs(x-body.x),dt*300);if(layout.mode!=='platform')dy=Math.sign(y-body.y)*Math.min(Math.abs(y-body.y),dt*240);else if(body.grounded && y<body.y-25){body.vy=-650;body.grounded=false;}
        if(Math.abs(x-body.x)<8 && Math.abs(y-body.y)<(layout.mode==='platform'?70:8)){destination=null;const index=targetIndex;targetIndex=-1;if(index>=0)onArrive?.(index);}}
      if(layout.mode==='platform'){if(keys.has('up')&&body.grounded){body.vy=-650;body.grounded=false;}body.vy+=dt*1050;dy=body.vy*dt;body.grounded=false;}
      if(dx)facing=Math.sign(dx);
      body=moveBody(body,dx,dy,layout);
    }
  }
  function tick(time){if(stopped)return;const dt=Math.min(.04,(time-(previous||time))/1000);previous=time;if(!paused&&!document.hidden){const oldX=body.x,oldY=body.y;update(dt);const moving=layout.mode==='flight'||Math.hypot(body.x-oldX,body.y-oldY)>.01;if(layout.mode==='descent'&&moving)swimHeading=Math.atan2(body.y-oldY,body.x-oldX);const activeSprite=oceanSprites[oceanLevel(body.y)]||sprite;sample=activeSprite?.advance(dt,moving,facing,isReducedMotion());enemySample=enemySprite?.advance(dt,false,1,isReducedMotion());render();}raf=requestAnimationFrame(tick);}
  size();render();raf=requestAnimationFrame(tick);
  return {key(key,down){if(down){destination=null;path=[];targetIndex=-1;keys.add(key);}else keys.delete(key);},clear(){keys.clear();},pause(value){paused=value;keys.clear();},nearby:proximity,
    visit(index,instant=false){targetIndex=index;if(isRoom){path=roomPath([body.x,body.y],stations[index]);if(instant){[body.x,body.y]=stations[index];path=[];targetIndex=-1;render();onArrive?.(index);}}else{destination=stations[index];if(instant){[body.x,body.y]=destination;destination=null;targetIndex=-1;render();onArrive?.(index);}}},
    point(x,y){if(isRoom)return;const {scale,cameraX,cameraY}=camera2d();destination=[Math.min(layout.width-60,Math.max(60,x/scale+cameraX)),Math.min(layout.height-100,Math.max(60,y/scale+cameraY))];targetIndex=-1;},
    setCollected(ids){collected=new Set(ids);render();},snapshot(){return lastFrame;},
    resize:size,destroy(){stopped=true;cancelAnimationFrame(raf);}};
}
