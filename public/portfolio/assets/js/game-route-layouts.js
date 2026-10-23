// Compact, source-inspired portfolio layouts, not exports of the original maps.
// One ordered discovery route can bend; the camera and player remain locally free.
function grid(rooms,connections,fixtures) {
  const map=Array.from({length:13},()=>Array(14).fill('1'));
  for(const [x,y,w,h] of [...rooms,...connections])for(let row=y;row<y+h;row++)for(let col=x;col<x+w;col++)map[row][col]='0';
  for(const [x,y,w,h] of fixtures)for(let row=y;row<y+h;row++)for(let col=x;col<x+w;col++)map[row][col]='2';
  return map.map(row=>row.join(''));
}

export const GAME_ROUTES=Object.freeze({
  'chickens-nightmare-ue5': {
    map:grid([[1,1,4,4],[6,2,6,5],[8,8,4,4],[2,8,5,4]],[[5,3,1,2],[9,7,2,1],[7,9,1,2]],[[1,1,1,2],[7,2,4,1],[11,4,1,3],[11,8,1,3],[2,8,3,1]]),
    start:[2.5,2.5],angle:Math.PI/4,
    stations:[[3.5,3.5],[8.5,4.5],[9.5,9.5],[4.5,10.5]],
    gates:[{cells:[[5,3],[5,4]],after:1},{cells:[[9,7],[10,7]],after:2},{cells:[[7,9],[7,10]],after:3}],
    spine:[[2.5,2.5],[3.5,3.5],[5.5,3.5],[8.5,4.5],[9.5,6.5],[9.5,9.5],[7.5,9.5],[4.5,10.5]],
    spaces:[{name:'Service entrance',point:[3.5,3.5]},{name:'Kitchen counter',point:[8.5,4.5]},{name:'Service passage',point:[9.5,9.5]},{name:'Security station',point:[4.5,10.5]}],
    landmarks:[{point:[4.7,3.5],label:'KITCHEN',height:.72},{point:[9.5,6.7],label:'SERVICE',height:.65},{point:[7.3,9.5],label:'NIGHT WATCH',height:.65},{point:[3.5,9.1],label:'SECURITY',height:.7}],
    scaleKey:'One tile = one compact restaurant floor unit; counter height .45, seated-note stand .32, eye .62.',
  },
  'cat-eat-rat': {
    map:grid([[1,1,5,5],[7,2,5,5],[8,8,4,4]],[[6,3,1,2],[9,7,2,1]],[[1,1,1,4],[3,1,3,1],[8,2,4,1],[11,3,1,4],[8,10,1,2]]),
    start:[3.5,2.5],angle:Math.PI/2,
    stations:[[3.5,3.5],[4.5,4.5],[8.5,4.5],[10.5,5.5],[10.5,10.5]],
    gates:[{cells:[[6,3],[6,4]],after:2},{cells:[[9,7],[10,7]],after:4}],
    spine:[[3.5,2.5],[3.5,3.5],[4.5,4.5],[5.5,3.5],[7.5,3.5],[8.5,4.5],[10.5,5.5],[9.5,6.5],[9.5,8.5],[10.5,10.5]],
    spaces:[{name:'Under the preparation counter',point:[3.5,3.5]},{name:'The sink corner',point:[9.5,4.5]},{name:'The pantry and mouse hole',point:[10.5,10.5]}],
    landmarks:[{point:[5.7,3.5],label:'SINK',height:.2},{point:[9.5,6.7],label:'PANTRY',height:.2}],
    scaleKey:'Same floor-unit projection as fixtures; rat eye .12, cheese .09, water gun .10, mouse hole .28.',
  },
});

export function routeCell(x,y,route,progress=Infinity) {
  const col=Math.floor(x),row=Math.floor(y);
  if(route?.gates.some(gate=>progress<gate.after&&gate.cells.some(([gx,gy])=>gx===col&&gy===row)))return '3';
  return route?.map[row]?.[col]||'1';
}
export function routeSpace(route,x,y) {
  return route.spaces.reduce((nearest,space)=>Math.hypot(x-space.point[0],y-space.point[1])<Math.hypot(x-nearest.point[0],y-nearest.point[1])?space:nearest).name;
}
export function routeLightDistance(route,x,y) {
  let distance=Infinity;
  for(let i=1;i<route.spine.length;i++){
    const [ax,ay]=route.spine[i-1],[bx,by]=route.spine[i],dx=bx-ax,dy=by-ay;
    const t=Math.max(0,Math.min(1,((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy)));
    distance=Math.min(distance,(x-ax-t*dx)**2+(y-ay-t*dy)**2);
  }
  return Math.sqrt(distance);
}
