import { gameSources } from './project-sources.js?v=43292090dc3e';
import { projects } from './content.js?v=43292090dc3e';
import { esc, isReducedMotion } from './utils.js?v=43292090dc3e';
import { createWorldEngine, WORLD_LAYOUTS, bindWorldLook } from './world-engine.js?v=43292090dc3e';
import { CUSTOM_GAMES, renderExperience, mountExperience } from './game-experiences.js?v=43292090dc3e';
import { renderFieldGuide, mountWorldUI, closeFieldGuide, worldInputBlocked } from './game-ui.js?v=43292090dc3e';

const assetRoot='/assets/game-source/';
const nativeFrame=(page,crop,target=[0,0,...crop.slice(2)],width=1366,height=768)=>({src:assetRoot+`security-cameras/atlas-${page}.png`,crop,target,width,height});
export const GAME_WORLDS=Object.freeze({
  'one-last-bird':{name:'The last woodland',style:'woodland',assets:{background:assetRoot+'bird-forest.png',player:assetRoot+'bird-flight.png',crop:[0,55,187,86],nest:assetRoot+'bird-nest.png',tree:assetRoot+'bird-tree.png',house:assetRoot+'bird-house-tree.png',pond:assetRoot+'bird-pond.png',truck:assetRoot+'bird-truck.png'},stops:['The nest','Field journal','The pond','Forest edge']},
  'chickens-breakout':{name:'Chicken’s Breakout',style:'platform',assets:{player:assetRoot+'breakout-player.png',crop:[6,6,23,21],tile:assetRoot+'breakout-wall.png'},stops:['Starting point','Jam notebook','Build record','Original game']},
  'plasteroids':{name:'The polluted ocean',style:'ocean',assets:{background:assetRoot+'plasteroids-ocean.png',player:assetRoot+'plasteroids-squishy.png',crop:[40,70,245,215],facing:-1},stops:['Squishy','Team log','Dive record','Gameplay archive']},
  'five-nights-at-chickens':{name:'Kun’s fixed-camera night shift',style:'security',assets:{frames:[nativeFrame(4,[2,774,1366,768]),nativeFrame(1,[2,2,1366,768]),nativeFrame(2,[2,2,1366,768]),nativeFrame(7,[2,2,1366,767])]},stops:['Office briefing','Camera 01 · Production','Camera 03 · Shift record','Camera 05 · Archive']},
  'chickens-nightmare-gamemaker':{name:'The original 2D chicken store',style:'pixel-horror',assets:{frames:[nativeFrame(4,[2,774,1366,768]),nativeFrame(3,[2,774,1366,768]),nativeFrame(9,[2,2,1365,767],[1,1,1365,767]),nativeFrame(10,[2,2,768,768],[0,0,768,768],768,768)]},stops:['Office · Night watch','Left window · Build','Right window · Record','Vent · Archive']},
  'chickens-nightmare-ue5':{name:'Restaurant night-watch route',style:'unreal',assets:{},stops:['Service entrance','Kitchen counter','Service passage','Security station']},
  'cat-eat-rat':{name:'The rat’s kitchen',style:'kitchen',assets:{wall:assetRoot+'kitchen-wall.png'},stops:['Kitchen briefing','Build notebook','Project record','Gameplay recording']}
});
export function gameWorldProject(id){return projects.find(project=>project.id===id&&project.category==='games'&&GAME_WORLDS[id]);}
export const DISCOVERY_POSITIONS=[.14,.37,.62,.86];
export function clampWorldPosition(value){return Number.isFinite(value)?Math.max(.06,Math.min(.94,value)):.24;}
export function nearestDiscovery(position){const distances=DISCOVERY_POSITIONS.map(point=>Math.abs(point-position));const index=distances.indexOf(Math.min(...distances));return distances[index]<=.085?index:-1;}
function detailNotes(notes=[]){return notes.map(note=>`<h3>${esc(note.title)}</h3><p>${esc(note.text)}</p>`).join('');}
export function entries(project){const details=project.gameDetails;const source=details?.source?`<p class="world-source-note">Source: supplied ${esc(details.source.label)} presentation, slides ${esc(details.source.slides)}.</p>`:'';return [
  {title:'The game',body:`<p>${esc(project.description)}</p>${detailNotes(details?.mechanics)}${source}`},
  {title:'Behind the build',body:`<p>Roles: ${project.roles.map(esc).join(' · ')}</p><p>Built with ${project.technologies.map(esc).join(' · ')}.</p>${project.credits?`<p>${esc(project.credits)}</p>`:''}${detailNotes(details?.production)}${source}`},
  {title:'Project record',body:`<p>${esc(project.yearStatus)}</p>${detailNotes(details?.progression)}${project.externalLinks.length?project.externalLinks.map(link=>`<a class="select-button" href="${link.url}" target="_blank" rel="noreferrer">${esc(link.label)} ↗</a>`).join(''):'<p>No public download URL has been supplied. The portfolio exploration is not the compiled game.</p>'}${source}`},
  {title:'Original game evidence',body:`${project.demoVideo?`<video class="world-evidence" controls playsinline preload="none" poster="${project.artwork}"><source src="${project.demoVideo}" type="video/mp4"></video>`:`<img class="world-evidence" src="${project.artwork}" alt="${esc(project.title)} original portfolio artwork">`}<p>${project.demoVideo?'Supplied gameplay demonstration.':'Supplied portfolio artwork.'} This explorable scene is a browser portfolio interpretation, not a port of the original executable.</p>`}
];}

export function renderGameWorld(project){
  if(CUSTOM_GAMES.has(project.id))return renderExperience(project,entries(project));
  const config=GAME_WORLDS[project.id],layout=WORLD_LAYOUTS[project.id];
  const fixed=layout.mode==='fixed-camera';
  const help=fixed?'← / → switch fixed views · E read · No free walking':layout.orderedRoute?'W / S walk · A / D turn · Drag / PgUp / PgDn look · E inspect':'WASD / arrows to move · E to inspect';
  return `<main id="main" class="game-world world-${config.style}" data-game-world="${project.id}" data-movement="${layout.mode}" tabindex="-1" aria-labelledby="world-title">
    <header class="world-hud"><a class="game-control" href="/games/">← Characters</a><a class="game-control" href="/">↙ Room</a><button class="game-control menu-button" type="button" aria-expanded="false" aria-controls="player-menu">Menu</button><button class="game-control sound-button" type="button" aria-pressed="false"></button></header>
    <div class="world-caption"><h1 id="world-title">${esc(project.title)}</h1></div>
    <canvas class="world-canvas" tabindex="0" aria-label="Explore ${esc(config.name)}. ${help}. Use the field guide for controls and information destinations."></canvas>
    <p class="world-objective" data-world-objective aria-live="polite">Find the first note</p>
    ${renderFieldGuide({sources:gameSources(project),help,label:'Guide',count:4,coach:`<aside class="route-coach"><h3>Next discovery</h3><span data-route-prompt>${fixed?'Start at the office. Read its log, then switch cameras.':layout.orderedRoute?'Approach the note stand and press E. Drag to look around.':'Fly toward the nest and press E to read.'}</span>${layout.orderedRoute?'<small data-route-space>Service entrance</small><button class="game-control" data-next-stop type="button">Guide me to the next note →</button>':''}${project.id==='five-nights-at-chickens'?'<small>Original GameMaker camera art reference; Unity camera exports not supplied.</small>':''}</aside>`,destinations:config.stops.map((label,index)=>`<button type="button" data-discovery="${index}">0${index+1} · ${esc(label)}<span>Go →</span></button>`).join('')})}
    <button class="world-inspect game-control" type="button" data-interact disabled>Move closer to discover</button>
    <div class="world-touch-controls" role="group" aria-label="Movement controls"><button type="button" data-move="left" aria-label="${fixed?'Previous view':layout.orderedRoute?'Turn left':'Move left'}">←</button><button type="button" data-move="up" aria-label="Move forward" ${fixed?'disabled':''}>↑</button><button type="button" data-move="down" aria-label="Move backward" ${fixed?'disabled':''}>↓</button><button type="button" data-move="right" aria-label="${fixed?'Next view':layout.orderedRoute?'Turn right':'Move right'}">→</button></div>
    <dialog class="world-journal" aria-labelledby="journal-title"><button class="journal-close game-control" type="button" aria-label="Close discovery">×</button><p class="eyebrow">Discovered</p><h2 id="journal-title"></h2><div class="journal-body"></div></dialog>
  </main>`;
}

export function mountGameWorld(root,project){
  if(CUSTOM_GAMES.has(project.id))return mountExperience(root,project,entries(project),GAME_WORLDS[project.id].assets);
  const controller=new AbortController(),{signal}=controller;
  const config=GAME_WORLDS[project.id],journal=root.querySelector('.world-journal'),canvas=root.querySelector('canvas'),progress=root.querySelector('.world-progress'),inspect=root.querySelector('[data-interact]'),visited=new Set(),records=entries(project);
  let returnFocus=null,nearby=-1,engine;
  const layout=WORLD_LAYOUTS[project.id],nextButton=root.querySelector('[data-next-stop]');
  function guidance(){const next=[0,1,2,3].find(index=>!visited.has(index));root.querySelector('[data-route-prompt]').textContent=next===undefined?'All four notes read. Look around, or return to Characters / Room.':layout.mode==='fixed-camera'?`View ${next+1} / 4 · ${config.stops[next]}`:layout.orderedRoute?`Next ${next+1} / 4 · ${config.stops[next]} · Investigate before the next doorway opens.`:`Next ${next+1} / 4 · ${config.stops[next]}`;
    root.querySelector('[data-world-objective]').textContent=next===undefined?'All notes discovered':`${next+1} / 4 · ${config.stops[next]}`;
    if(nextButton)nextButton.disabled=next===undefined;
    if(layout.orderedRoute)root.querySelectorAll('[data-discovery]').forEach(button=>{button.disabled=Number(button.dataset.discovery)>(next??3);});}
  function show(index){if(index<0||journal.open)return;engine.pause(true);engine.acknowledgeStop(index);returnFocus=document.activeElement;visited.add(index);guidance();progress.textContent=`Guide · ${visited.size} / 4`;root.querySelector('#journal-title').textContent=records[index].title;root.querySelector('.journal-body').innerHTML=records[index].body;journal.showModal();journal.querySelector('button').focus();}
  engine=createWorldEngine(canvas,project.id,{assets:config.assets,geometryOnly:new URLSearchParams(location.search).has('geometry'),onNearby(index){nearby=index;inspect.disabled=index<0;inspect.hidden=index<0;inspect.textContent=index<0?'Move closer to discover':`E · ${config.stops[index]}`;},onFrame(frame){const label=root.querySelector('[data-route-space]');if(label&&label.textContent!==frame.space)label.textContent=frame.space;},onArrive:show});
  inspect.hidden=true;
  const syncPause=mountWorldUI(root,engine,signal);
  if(layout.orderedRoute)bindWorldLook(canvas,engine,signal);
  root.querySelectorAll('[data-discovery]').forEach(button=>button.addEventListener('click',()=>{closeFieldGuide(root);syncPause();canvas.focus();engine.visit(Number(button.dataset.discovery),isReducedMotion());},{signal}));
  inspect.addEventListener('click',()=>show(nearby),{signal});
  nextButton?.addEventListener('click',()=>{closeFieldGuide(root);syncPause();canvas.focus();engine.visit([0,1,2,3].find(index=>!visited.has(index)),isReducedMotion());},{signal});
  const keyMap={a:'left',arrowleft:'left',d:'right',arrowright:'right',w:'up',arrowup:'up',s:'down',arrowdown:'down',pageup:'look-up',pagedown:'look-down',' ':'up'};
  window.addEventListener('keydown',event=>{if(worldInputBlocked(root,event))return;const key=event.key.toLowerCase();if(keyMap[key]){event.preventDefault();engine.key(keyMap[key],true);}else if(key==='e'&&!event.repeat)show(nearby);},{signal});
  window.addEventListener('keyup',event=>{const key=keyMap[event.key.toLowerCase()];if(key)engine.key(key,false);},{signal});
  root.querySelectorAll('[data-move]').forEach(button=>{button.addEventListener('pointerdown',event=>{event.preventDefault();button.setPointerCapture(event.pointerId);engine.key(button.dataset.move,true);},{signal});for(const type of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(type,()=>engine.key(button.dataset.move,false),{signal});button.addEventListener('keydown',event=>{if(event.key==='Enter')engine.key(button.dataset.move,true);},{signal});button.addEventListener('keyup',()=>engine.key(button.dataset.move,false),{signal});});
  canvas.addEventListener('click',event=>{const rect=canvas.getBoundingClientRect();engine.point((event.clientX-rect.left)*canvas.width/rect.width,(event.clientY-rect.top)*canvas.height/rect.height);},{signal});
  root.querySelector('.journal-close').addEventListener('click',()=>journal.close(),{signal});
  journal.addEventListener('close',()=>{journal.querySelector('video')?.pause();syncPause();returnFocus?.focus?.({preventScroll:true});},{signal});
  window.addEventListener('blur',()=>engine.clear(),{signal});document.addEventListener('visibilitychange',()=>engine.clear(),{signal});window.addEventListener('resize',()=>engine.resize(),{signal});
  window.addEventListener('pagehide',()=>{controller.abort();engine.destroy();},{once:true});guidance();root.focus({preventScroll:true});
  return()=>{controller.abort();engine.destroy();};
}
