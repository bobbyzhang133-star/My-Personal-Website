// One slot coordinate system drives the actual film, its HTML hit areas and leader.
export function filmSlots(count, leader=4) {
  return Array.from({length:count+leader*2},(_,i)=>{
    const index=i-leader;
    return {index,projectIndex:index>=0&&index<count?index:null};
  });
}

export function fitFilmCover(sourceWidth,sourceHeight,width,height) {
  const scale=Math.min(width/sourceWidth,height/sourceHeight);
  return {x:(width-sourceWidth*scale)/2,y:(height-sourceHeight*scale)/2,
    width:sourceWidth*scale,height:sourceHeight*scale};
}

export function projectionSample(progress) {
  const p=Math.max(0,Math.min(1,progress));
  const t=Math.max(0,Math.min(1,(p-.18)/.82));
  return {zoom:t*t*(3-2*t),drive:p*6,phase:p<1?'projecting':'registered'};
}
