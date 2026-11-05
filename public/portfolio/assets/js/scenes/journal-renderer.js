import { journalProjection } from './journal-geometry.js?v=3fe186ecf43b';
const clamp=value=>Math.max(0,Math.min(1,value));
const mix=(a,b,t)=>a+(b-a)*t;

function rotate(point,angle) {
  const [x,y,z]=point,c=Math.cos(angle),s=Math.sin(angle);
  return [c*x+s*z,y,-s*x+c*z];
}
function textureTriangle(ctx,image,points,uv) {
  const source=uv.map(([u,v])=>[u*image.width,(1-v)*image.height]);
  const [[x0,y0],[x1,y1],[x2,y2]]=source,[[u0,v0],[u1,v1],[u2,v2]]=points;
  const denominator=x0*(y1-y2)+x1*(y2-y0)+x2*(y0-y1);
  if(Math.abs(denominator)<1e-7)return;
  const a=(u0*(y1-y2)+u1*(y2-y0)+u2*(y0-y1))/denominator;
  const c=(u0*(x2-x1)+u1*(x0-x2)+u2*(x1-x0))/denominator;
  const e=(u0*(x1*y2-x2*y1)+u1*(x2*y0-x0*y2)+u2*(x0*y1-x1*y0))/denominator;
  const b=(v0*(y1-y2)+v1*(y2-y0)+v2*(y0-y1))/denominator;
  const d=(v0*(x2-x1)+v1*(x0-x2)+v2*(x1-x0))/denominator;
  const f=(v0*(x1*y2-x2*y1)+v1*(x2*y0-x0*y2)+v2*(x0*y1-x1*y0))/denominator;
  const center=[(u0+u1+u2)/3,(v0+v1+v2)/3];
  ctx.save();ctx.beginPath();points.forEach(([x,y],i)=>{const dx=x-center[0],dy=y-center[1],length=Math.hypot(dx,dy)||1;const px=x+dx/length*.45,py=y+dy/length*.45;if(i)ctx.lineTo(px,py);else ctx.moveTo(px,py);});ctx.closePath();ctx.clip();
  ctx.transform(a,b,c,d,e,f);ctx.drawImage(image,0,0);ctx.restore();
}

export function projectJournalPoint(matrix,point,zAxis=[0,0]) {
  const [x,y,z]=point,depth=matrix[3]*x+matrix[7]*y+1;
  return [(matrix[0]*x+matrix[4]*y+matrix[12]+z*zAxis[0])/depth,(matrix[1]*x+matrix[5]*y+matrix[13]+z*zAxis[1])/depth];
}
// Fit thickness to the native base contacts so the side profile does not pop.
export function journalRestDepth(model) {
  const {width:W,height:H,thickness:T}=model.dimensions;
  const [x0,y0,x1,y1]=model.coverBounds||[0,0,W,H];
  const corners=[[x0,y0],[x1,y0],[x1,y1],[x0,y1]];
  const matrix=journalProjection(corners,model.coverQuad);
  if(!matrix||!model.restBaseQuad)return [0,-700];
  return [0,1].map(axis=>corners.reduce((sum,[x,y],i)=>{
    const denominator=matrix[3]*x+matrix[7]*y+1;
    return sum+(model.restBaseQuad[i][axis]-model.coverQuad[i][axis])*denominator/-T;
  },0)/4);
}
export function journalModelPose(model,table,held,restDepth,action) {
  const {width:W,height:H}=model.dimensions;
  const p=clamp(action.pickup),lift=Math.sin(p*Math.PI)*-30;
  const quad=table.map(([x,y],i)=>[mix(x,held[i][0],p),mix(y,held[i][1],p)+lift]);
  const [x0,y0,x1,y1]=model.coverBounds||[0,0,W,H];
  const projection=journalProjection([[x0,y0],[x1,y0],[x1,y1],[x0,y1]],quad);
  if(!projection)return null;
  const zAxis=restDepth.map(value=>value*(1-p));
  return {p,projection,zAxis};
}

const readingSurfaces=new WeakMap();
function journalReadingSurfaces(model) {
  if(readingSurfaces.has(model))return readingSurfaces.get(model);
  const result={};
  for(const [side,name] of [['left','JournalInsideCover'],['right','JournalRightReadingLeaf']]){
    const mesh=model.meshes.find(mesh=>mesh.name===name);
    if(!mesh)continue;
    const axis=n=>mesh.positions.filter((_,i)=>i%3===n),xs=axis(0),ys=axis(1),z=axis(2)[0];
    const x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys);
    // Inside-cover text reads left-to-right after its board opens around x=0.
    result[side]={name,front:mesh.part==='front',points:side==='left'?[[x1,y0,z],[x0,y0,z],[x0,y1,z],[x1,y1,z]]:[[x0,y0,z],[x1,y0,z],[x1,y1,z],[x0,y1,z]]};
  }
  readingSurfaces.set(model,result);return result;
}

export function journalReadingQuads(model,table,held,restDepth,action) {
  const pose=journalModelPose(model,table,held,restDepth,action);
  if(!pose)return {};
  return Object.fromEntries(Object.entries(journalReadingSurfaces(model)).map(([side,surface])=>{
    const quad=surface.points.map(point=>projectJournalPoint(pose.projection,surface.front?rotate(point,action.hinge):point,pose.zAxis));
    const area=quad.reduce((sum,[x,y],i)=>{const next=quad[(i+1)%4];return sum+x*next[1]-next[0]*y;},0)/2;
    return [side,{quad,visible:area>.5,name:surface.name}];
  }));
}

export function drawJournalModel(ctx,model,texture,table,held,restDepth,action,viewport,{part=null}={}) {
  const pose=journalModelPose(model,table,held,restDepth,action);
  if(!pose)return;
  const {p,projection,zAxis}=pose;
  const eye=[-.2*(1-p),.9*(1-p),.4+.6*p],triangles=[];
  for(const mesh of model.meshes){if(part&&mesh.part!==part)continue;for(let i=0;i<mesh.positions.length;i+=9) {
    const vertices=[],uv=[];let normal=mesh.normals.slice(i,i+3);
    if(mesh.part==='front')normal=rotate(normal,action.hinge);
    let depth=0;
    for(let j=0;j<3;j++) {
      let point=mesh.positions.slice(i+j*3,i+j*3+3);
      if(mesh.heldPositions)point=point.map((value,axis)=>mix(value,mesh.heldPositions[i+j*3+axis],p));
      if(mesh.part==='front')point=rotate(point,action.hinge);
      vertices.push(projectJournalPoint(projection,point,zAxis));depth+=point[0]*eye[0]+point[1]*eye[1]+point[2]*eye[2];uv.push(mesh.uv.slice(i/3*2+j*2,i/3*2+j*2+2));
    }
    if(vertices.some(v=>!Number.isFinite(v[0])||!Number.isFinite(v[1])))continue;
    // The painted source camera is calibrated projectively. An approximate
    // view-vector test incorrectly discards the rounded spine and red headband.
    const [a,b,c]=vertices;
    if((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])<=.000001)continue;
    if(vertices.every(v=>v[0]<-30)||vertices.every(v=>v[0]>viewport.width+30)||vertices.every(v=>v[1]<-30)||vertices.every(v=>v[1]>viewport.height+30))continue;
    const layer=mesh.part==='front'?(mesh.name==='JournalNativeCover'?13:mesh.name.includes('Inside')?12:mesh.texture?11:10):(mesh.name.includes('ReadingLeaf')?3:mesh.texture?1:0);
    triangles.push({vertices,uv,depth,layer,color:mesh.color,texture:mesh.texture,normal,name:mesh.name});
  }}
  ctx.clearRect(0,0,viewport.width,viewport.height);
  if(part!=='front'&&p<.7){ctx.save();ctx.filter=`blur(${3+p*9}px)`;ctx.fillStyle=`rgba(14,15,25,${.19*(1-p)})`;ctx.beginPath();table.forEach(([x,y],i)=>i?ctx.lineTo(x,y+4):ctx.moveTo(x,y+4));ctx.closePath();ctx.fill();ctx.restore();}
  triangles.sort((a,b)=>a.layer-b.layer||a.depth-b.depth);
  for(const triangle of triangles) {
    if(triangle.texture){textureTriangle(ctx,texture,triangle.vertices,triangle.uv);continue;}
    const light=triangle.name.includes('Leaf')||triangle.name.includes('Inside')?1:.8+.2*Math.max(0,triangle.normal[2]);
    const color=`rgb(${triangle.color.map(value=>Math.round(value*light)).join(',')})`;
    ctx.fillStyle=color;ctx.strokeStyle=color;ctx.lineWidth=.6;ctx.beginPath();triangle.vertices.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill();ctx.stroke();
  }
}
