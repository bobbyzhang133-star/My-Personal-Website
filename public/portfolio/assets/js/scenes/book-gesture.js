// Gesture samples use one monotonic event clock, including pointerdown/up.
// A short purposeful flick can turn a sheet; jitter or a paused drag cannot.
export function addPageSample(samples,x,time) {
  if(!Number.isFinite(x)||!Number.isFinite(time))return;
  const last=samples.at(-1);
  if(last&&time<last.time)return;
  samples.push({x,time});
  while(samples.length>2&&samples[1].time<time-120)samples.shift();
  if(samples.length>32)samples.splice(0,samples.length-32);
}

export function pageReleaseIntent(samples,{direction,progress,width,now,cancelled=false}) {
  if(cancelled)return {commit:false,velocity:0,flick:false};
  let last=-1;
  // Ignore stationary pointerup samples, but keep their elapsed release time.
  for(let i=samples.length-1;i>0;i--)if(Math.abs(samples[i].x-samples[i-1].x)>.5){last=i;break;}
  let velocity=0,flick=false;
  if(last>0&&now-samples[last].time<=90){
    const sign=Math.sign(samples[last].x-samples[last-1].x);
    let start=last-1;
    for(let i=last-1;i>0;i--){
      const dx=samples[i].x-samples[i-1].x;
      if(samples[i-1].time<now-100||(Math.abs(dx)>.5&&Math.sign(dx)!==sign))break;
      start=i-1;
    }
    const distance=(samples[start].x-samples[last].x)*direction;
    velocity=distance/Math.max(12,now-samples[start].time);
    const minimum=Math.max(12,Math.min(20,width*.025));
    flick=Math.abs(distance)>=minimum&&Math.abs(velocity)>=.6;
  }
  return {commit:flick?velocity>0:progress>=.5,velocity,flick};
}
