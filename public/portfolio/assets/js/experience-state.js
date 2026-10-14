// World geometry and interaction rules are declared before artwork is fitted.
export const BREAKOUT_CHAPTERS = [220, 820, 1470, 2160];
export function orderedChapters(x, previous = 0) {
  return Math.max(previous, BREAKOUT_CHAPTERS.filter(position => x >= position - 160).length);
}

const deck = '/assets/game-source/plasteroids-deck/';
export const OCEAN_LEVELS = [
  { name:'Sunlit water', top:0, bottom:1500, color:'#216e6c', fish:deck+'fish-swordfish.png', crop:[77,77,665,259], picture:deck+'level-one.png',
    player:'plasteroids', point:[500,620] },
  { name:'The twilight zone', top:1500, bottom:3000, color:'#153c63', fish:deck+'fish-manta.png', crop:[266,218,513,561], picture:deck+'level-two.png',
    player:'plasteroids-level-two', point:[500,2100] },
  { name:'The abyss', top:3000, bottom:4500, color:'#160c45', fish:deck+'fish-eel.png', crop:[25,50,765,295], picture:deck+'level-three.png',
    player:'plasteroids-level-three', point:[500,3600] },
];
export function oceanLevel(y) { return Math.max(0,Math.min(2,Math.floor(y/1500))); }
export function verticalCamera(y, viewportHeight, worldHeight = 4500) { return Math.max(0, Math.min(worldHeight-viewportHeight, y-viewportHeight*.4)); }

export const RAT_OBJECTS = [
  { id:'cheese-a', kind:'cheese', label:'Cheese · The game', point:[2.5,3.5], picture:'/assets/game-props/cheese.svg', height:.09 },
  { id:'water-a', kind:'water', label:'Water gun · How to play', point:[9.5,1.5], picture:'/assets/game-props/water-gun.svg', height:.12 },
  { id:'cheese-b', kind:'cheese', label:'Cheese · Behind the build', point:[9.5,8.5], picture:'/assets/game-props/cheese.svg', height:.09 },
  { id:'water-b', kind:'water', label:'Water gun · Gameplay archive', point:[2.5,8.5], picture:'/assets/game-props/water-gun.svg', height:.12 },
  { id:'home', kind:'hole', label:'Mouse hole · Bring cheese home', point:[1.5,8.5], drawPoint:[.995,8.5], picture:'/assets/game-props/mouse-hole.svg', height:.28 },
];
export function newRatState() { return { collected:[], carried:0, delivered:0, guns:0, deposits:0 }; }
export function validRatState(state) {
  if(!state||!Array.isArray(state.collected)||new Set(state.collected).size!==state.collected.length)return false;
  if(!state.collected.every(id=>RAT_OBJECTS.some(item=>item.id===id&&item.kind!=='hole')))return false;
  if(![state.carried,state.delivered,state.guns,state.deposits].every(value=>Number.isInteger(value)&&value>=0&&value<=2))return false;
  const cheese=state.collected.filter(id=>RAT_OBJECTS.find(item=>item.id===id).kind==='cheese').length;
  return state.carried+state.delivered===cheese&&state.guns===state.collected.length-cheese&&state.deposits<=state.delivered;
}
export function ratAction(state, id) {
  const object=RAT_OBJECTS.find(item=>item.id===id);
  if(!object) return { state, changed:false, message:'Unknown object' };
  if(object.kind==='hole') {
    if(!state.carried) return { state, changed:false, message:'Collect some cheese before returning to the hole.' };
    return { state:{...state,delivered:state.delivered+state.carried,carried:0,deposits:state.deposits+1},changed:true,message:'Cheese delivered. A new note is waiting at home.' };
  }
  if(state.collected.includes(id)) return { state,changed:false,message:'Already collected. Read its note again.' };
  return { state:{...state,collected:[...state.collected,id],carried:state.carried+Number(object.kind==='cheese'),guns:state.guns+Number(object.kind==='water')},changed:true,message:object.kind==='cheese'?'Cheese collected. Carry it back to the mouse hole.':'Water gun collected.' };
}

export function projectRatPoint(point,camera,width,height,eye=.12) {
  const dx=point[0]-camera.x,dy=point[1]-camera.y,distance=Math.hypot(dx,dy);
  let angle=Math.atan2(dy,dx)-camera.angle;
  while(angle>Math.PI)angle-=Math.PI*2;while(angle<-Math.PI)angle+=Math.PI*2;
  const depth=distance*Math.cos(angle);
  return {x:(.5+angle/(Math.PI/2.8))*width,y:height*.47+height*1.25*(eye-point[2])/Math.max(.02,depth),depth};
}
export function ratPropGeometry(object) {
  const [x,y]=object.drawPoint||object.point;
  if(object.kind==='hole') return [{color:'#101719',vertices:[[x,y-.12,0],[x,y-.12,.18],[x,y-.08,.25],[x,y,.28],[x,y+.08,.25],[x,y+.12,.18],[x,y+.12,0]],faces:[[0,1,2,3,4,5,6]]}];
  if(object.kind==='cheese')return [{color:'#efc25f',vertices:[[-.12,-.07,0],[.12,-.07,0],[.1,.07,0],[-.12,-.07,.09],[.12,-.07,.09],[.1,.07,.09]].map(([dx,dy,h])=>[x+dx,y+dy,h]),faces:[[3,4,5],[0,1,4,3],[1,2,5,4],[2,0,3,5]]}];
  const box=(dx,dy,w,d,h,color)=>({color,vertices:[[-w/2,-d/2,0],[w/2,-d/2,0],[w/2,d/2,0],[-w/2,d/2,0],[-w/2,-d/2,h],[w/2,-d/2,h],[w/2,d/2,h],[-w/2,d/2,h]].map(([a,b,c])=>[x+dx+a,y+dy+b,c]),faces:[[4,5,6,7],[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7]]});
  return [box(0,0,.22,.09,.06,'#df7438'),box(.16,0,.13,.05,.045,'#164859'),box(-.05,.08,.07,.12,.04,'#176e7e'),box(-.04,-.035,.11,.05,.10,'#60c8d1')];
}
