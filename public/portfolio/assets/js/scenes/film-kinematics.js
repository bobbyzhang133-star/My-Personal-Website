const dot=(a,b)=>a.reduce((n,v,i)=>n+v*b[i],0);
const normalize=a=>{const length=Math.hypot(...a)||1;return a.map(v=>v/length);};
const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];

export function sampleFilmPath(path,distance,closed=false) {
  const length=path[path.length-1].s;
  const s=closed?((distance%length)+length)%length:Math.max(0,Math.min(length,distance));
  let low=0,high=path.length-1;
  while(high-low>1){const middle=(low+high)>>1;if(path[middle].s<=s)low=middle;else high=middle;}
  const a=path[low],b=path[high],f=(s-a.s)/(b.s-a.s||1);
  const tangent=normalize(mix(a.t,b.t,f));
  const raw=mix(a.w,b.w,f),along=dot(raw,tangent);
  const width=normalize(raw.map((v,i)=>v-along*tangent[i]));
  return {point:mix(a.p,b.p,f),tangent,width,normal:normalize(cross(width,tangent))};
}

export function filmSurface(path,distance,lateral,offset=0,closed=false) {
  const sample=sampleFilmPath(path,distance,closed);
  return {...sample,point:sample.point.map((v,i)=>v+sample.width[i]*lateral+sample.normal[i]*offset)};
}

export function transportPose(transport,distance) {
  const angles=Object.fromEntries(Object.entries(transport.drives).map(([part,ratio])=>[part,ratio*distance]));
  const crank=transport.crank,phase=crank.phase-angles.cam,e=crank.eccentricity,L=crank.rodLength;
  const pin=[crank.center[0]+e*Math.cos(phase),crank.center[1]+e*Math.sin(phase)];
  const slider=[crank.center[0],pin[1]+Math.sqrt(L*L-e*e*Math.cos(phase)**2)];
  return {angles,pin,slider,beltDistance:distance*transport.belt.factor};
}
