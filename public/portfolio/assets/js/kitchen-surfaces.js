import { projectRatPoint, worldFocal } from './experience-state.js?v=5d56ac3eab02';
import { GAME_ROUTES, routeCell } from './game-route-layouts.js?v=5d56ac3eab02';

// Every display is a decal on a real wall face, in the same units as the rat.
// Normals point into the kitchen; .015 clearance avoids coplanar wall flicker.
export const KITCHEN_SURFACES = [
  { center: [3.4, 5.985], normal: [0,-1], width: 1.6, bottom: .03, top: .88 },
  { center: [5.1, 5.985], normal: [0,-1], width: 1.6, bottom: .03, top: .88 },
  { center: [7.015, 5.8], normal: [1,0], width: 1.6, bottom: .03, top: .88 },
  { center: [8.15, 6.985], normal: [0,-1], width: 1.5, bottom: .03, top: .88 },
  { center: [10.5, 11.985], normal: [0,-1], width: 1.6, bottom: .31, top: .95 }
];

export function kitchenSurfaceQuad(surface) {
  const [x,y] = surface.center, [nx,ny] = surface.normal;
  const r = [ny * surface.width / 2, -nx * surface.width / 2];
  return [[x-r[0],y-r[1],surface.top],[x+r[0],y+r[1],surface.top],
    [x+r[0],y+r[1],surface.bottom],[x-r[0],y-r[1],surface.bottom]];
}

export function kitchenSightline(camera, point, progress = Infinity) {
  const route = GAME_ROUTES['cat-eat-rat'], distance = Math.hypot(point[0]-camera.x,point[1]-camera.y);
  const steps = Math.ceil(distance / .025);
  for(let i=1;i<steps;i++) {
    const t=i/steps, z=.12+(point[2]-.12)*t;
    const type=routeCell(camera.x+(point[0]-camera.x)*t,camera.y+(point[1]-camera.y)*t,route,progress);
    if(type!=='0' && z<(type==='2'?.45:1)) return false;
  }
  return true;
}

// Homography maps a DOM rectangle to all four projected world-space corners.
export function kitchenSurfaceMatrix(quad, width, height) {
  const [a,b,c,d]=quad;
  const dx1=b.x-c.x,dx2=d.x-c.x,dx3=a.x-b.x+c.x-d.x;
  const dy1=b.y-c.y,dy2=d.y-c.y,dy3=a.y-b.y+c.y-d.y;
  const denominator=dx1*dy2-dx2*dy1;
  if(Math.abs(denominator)<1e-8) return null;
  const g=(dx3*dy2-dx2*dy3)/denominator,h=(dx1*dy3-dx3*dy1)/denominator;
  return [(b.x-a.x+g*b.x)/width,(b.y-a.y+g*b.y)/width,0,g/width,
    (d.x-a.x+h*d.x)/height,(d.y-a.y+h*d.y)/height,0,h/height,
    0,0,1,0,a.x,a.y,0,1];
}

export function projectKitchenSurface(surface, camera) {
  const [nx,ny]=surface.normal;
  if((camera.x-surface.center[0])*nx+(camera.y-surface.center[1])*ny<=0) return null;
  const world=kitchenSurfaceQuad(surface);
  if(!world.every(point=>kitchenSightline(camera,point,camera.routeIndex))) return null;
  const quad=world.map(point=>projectRatPoint(point,camera,camera.width,camera.height));
  if(quad.some(p=>p.depth<.06)) return null;
  if(Math.max(...quad.map(p=>p.x))<0||Math.min(...quad.map(p=>p.x))>camera.width||Math.max(...quad.map(p=>p.y))<0||Math.min(...quad.map(p=>p.y))>camera.height) return null;
  const height=600*(surface.top-surface.bottom)/surface.width;
  const matrix=kitchenSurfaceMatrix(quad,600,height);
  return matrix?{quad,matrix,height}:null;
}

export function kitchenReadingPoint(surface, camera) {
  const focal=worldFocal(camera.width,camera.height);
  const distance=(camera.width<600?1:1.12)*Math.max(focal*surface.width/Math.max(280,camera.width-48),focal*(surface.top-.12)/Math.max(120,camera.height*.65-72));
  // A small lateral offset makes the wall perspective legible, with enough
  // surrounding kitchen visible to distinguish this from an overlay page.
  return [surface.center[0]+surface.normal[0]*distance+surface.normal[1]*.18,surface.center[1]+surface.normal[1]*distance-surface.normal[0]*.18];
}
