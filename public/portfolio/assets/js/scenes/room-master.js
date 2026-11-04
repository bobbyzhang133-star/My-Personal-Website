import { ROOM_GUITAR } from './room-guitar-registration.js?v=8273376a5e68';
import { CINEMA_CAMERA } from './cinema-camera-registration.js?v=8273376a5e68';

// Measured source coordinates in Bobby's approved master, not independent viewport placements.
export const MASTER_ROOM=Object.freeze({width:1672,height:941,approved:'2026-10-24',artRevision:'diegetic-forms-2026-10-29',source:'/assets/room/master/studio-environment-v2.webp',objectSource:'/assets/room/master/studio-objects-v3.webp',floorPatch:'/assets/room/master/floor-clean-patch.svg',horizon:{y:210,uncertainty:80},vanishingRegion:[850,130,250,170],desk:[[448,418],[1672,418],[1672,521],[284,521]],floor:[[0,716],[1672,716],[1672,941],[0,941]],birdLane:[480,900],birdFeetY:879});
export const MASTER_OBJECTS=Object.freeze({
  games:{box:[509,711,202,176],support:'floor',contacts:[[585,879],[650,879]],path:'M603 714H650V720H675V729H692V738H706V750H671V758H655V774H647V781H658V790H661V821H655V832H642V842H632V868H651V882H618V846H598V868H614V882H584V846H573V840H563V830H555V820H514V799H556V791H589V783H623V775H632V763H620V756H612V746H605V734H600V722H603Z'},
  films:CINEMA_CAMERA,
  research:{box:[497,414,354,112],support:'desk',contacts:[[521,452],[737,427],[823,494],[577,516]],path:'M521 438L730 414H748L821 467L825 472V479L819 482V487L826 490V495L581 518H571L563 511L518 459L514 451V444L517 440Z'},
  music:ROOM_GUITAR,
  ai:{box:[837,259,406,257],support:'desk',contacts:[[871,440],[1202,440],[1230,501],[849,501]],screen:[891,281,293,147],path:'M897 264H1185V267H1191V273H1196V279H1201V431H1195V438H1201V444H1205V451H1210V458H1216V465H1221V472H1227V479H1233V485H1236V499H1231V505H1224V511H853V508H846V503H841V498H838V484H845V476H850V469H855V463H860V456H865V449H871V442H878V437H874V431H873V287H876V278H882V272H888V268H897Z'}
});
export function masterContains([x,y],polygon){let inside=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const[a,b]=polygon[j],[c,d]=polygon[i];const cross=(x-a)*(d-b)-(y-b)*(c-a);if(Math.abs(cross)<.01&&x>=Math.min(a,c)&&x<=Math.max(a,c)&&y>=Math.min(b,d)&&y<=Math.max(b,d))return true;if((d>y)!==(b>y)&&x<(a-c)*(y-d)/(b-d)+c)inside=!inside;}return inside;}
export function masterSupportReport(){return Object.entries(MASTER_OBJECTS).map(([name,o])=>({name,type:o.support,contacts:o.contacts,valid:o.contacts.every(p=>masterContains(p,MASTER_ROOM[o.support])),footprintContained:o.contacts.every(p=>masterContains(p,MASTER_ROOM[o.support]))}));}
export function masterBoxStyle([x,y,w,h]){return `left:${x/1672*100}%;top:${y/941*100}%;width:${w/1672*100}%;height:${h/941*100}%`;}
export function masterPanForObject(name,width,height,sourceX){const[baseX,,w]=MASTER_OBJECTS[name].box,x=sourceX??baseX,world=height*1672/941;return Math.max(0,Math.min(1,((x+w/2)*world/1672-width/2)/Math.max(1,world-width)));}
export function masterPanFromDrag(start,delta,width,height){return Math.max(0,Math.min(1,start-delta/Math.max(1,height*1672/941-width)));}
export function alignMasterRoom(root){const scene=root?.matches?.('.master-room')?root:root?.querySelector?.('.master-room');if(!scene)return[];const report=masterSupportReport(),frame=scene.querySelector('.master-composition')?.getBoundingClientRect(),aspectOK=!frame||!frame.width||Math.abs(frame.width/frame.height-1672/941)<.01;scene.dataset.groundingFailures=String(report.filter(o=>!o.valid).length+(aspectOK?0:1));scene.dataset.groundingReady=String(aspectOK&&report.every(o=>o.valid));return report;}
