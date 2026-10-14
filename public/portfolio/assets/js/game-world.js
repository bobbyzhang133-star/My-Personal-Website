import { projects } from './content.js?v=39bd00589fe9';
import { esc, isReducedMotion } from './utils.js?v=39bd00589fe9';
import { createWorldEngine, WORLD_LAYOUTS } from './world-engine.js?v=39bd00589fe9';
import { CUSTOM_GAMES, renderExperience, mountExperience } from './game-experiences.js?v=39bd00589fe9';

const assetRoot='/assets/game-source/';
export const GAME_WORLDS=Object.freeze({
  'one-last-bird':{name:'The last woodland',style:'woodland',assets:{background:assetRoot+'bird-forest.png',player:assetRoot+'bird-flight.png',crop:[0,55,187,86],nest:assetRoot+'bird-nest.png',tree:assetRoot+'bird-tree.png'},stops:['The nest','Field journal','The clearing','Original game']},
  'chickens-breakout':{name:'Chicken’s Breakout',style:'platform',assets:{player:assetRoot+'breakout-player.png',crop:[6,6,23,21],tile:assetRoot+'breakout-wall.png'},stops:['Starting point','Jam notebook','Build record','Original game']},
  'plasteroids':{name:'The polluted ocean',style:'ocean',assets:{background:assetRoot+'plasteroids-ocean.png',player:assetRoot+'plasteroids-squishy.png',crop:[40,70,245,215],facing:-1},stops:['Squishy','Team log','Dive record','Gameplay archive']},
  'five-nights-at-chickens':{name:'Kun’s night shift',style:'security',assets:{wall:assetRoot+'night-wall.png'},stops:['Security log','Production terminal','Shift record','Camera archive']},
  'chickens-nightmare-gamemaker':{name:'The original chicken store',style:'pixel-horror',assets:{wall:assetRoot+'night-wall.png'},stops:['Night watch','Workbench','First build','Security footage']},
  'chickens-nightmare-ue5':{name:'The rebuilt corridor',style:'unreal',assets:{wall:assetRoot+'unreal-wall.png'},stops:['Corridor briefing','Engineering console','Remake record','Original evidence']},
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
  const help=['office','first-person','split-view'].includes(layout.mode)?'W/S to walk · A/D to turn · E to inspect':'WASD / arrows to move · E to inspect';
  return `<main id="main" class="game-world world-${config.style}" data-game-world="${project.id}" data-movement="${layout.mode}" tabindex="-1" aria-labelledby="world-title">
    <header class="world-hud"><a class="game-control" href="/games/">← Characters</a><a class="game-control" href="/">↙ Room</a><button class="game-control menu-button" type="button" aria-expanded="false" aria-controls="player-menu">Menu</button><button class="game-control sound-button" type="button" aria-pressed="false"></button></header>
    <div class="world-caption"><p>${esc(config.name)}</p><h1 id="world-title">${esc(project.title)}</h1></div>
    <canvas class="world-canvas" tabindex="0" aria-label="Explore ${esc(config.name)}. ${help}. Use Discoveries to reach any information point."></canvas>
    <div class="world-bottom"><p class="world-help">${help}</p><button class="world-progress game-control" type="button" aria-expanded="false" aria-controls="world-discoveries">Discoveries · 0 / 4</button><span>Browser portfolio interpretation</span></div>
    <nav id="world-discoveries" class="world-discovery-list" aria-label="Discovery destinations" hidden>${config.stops.map((label,index)=>`<button type="button" data-discovery="${index}">0${index+1} · ${esc(label)}<span>Go →</span></button>`).join('')}</nav>
    <button class="world-inspect game-control" type="button" data-interact disabled>Move closer to discover</button>
    <div class="world-touch-controls" role="group" aria-label="Movement controls"><button type="button" data-move="left" aria-label="Move left or turn left">←</button><button type="button" data-move="up" aria-label="Move up, forward or jump">↑</button><button type="button" data-move="down" aria-label="Move down or backward">↓</button><button type="button" data-move="right" aria-label="Move right or turn right">→</button></div>
    <dialog class="world-journal" aria-labelledby="journal-title"><button class="journal-close game-control" type="button" aria-label="Close discovery">×</button><p class="eyebrow">Discovered</p><h2 id="journal-title"></h2><div class="journal-body"></div></dialog>
  </main>`;
}

export function mountGameWorld(root,project){
  if(CUSTOM_GAMES.has(project.id))return mountExperience(root,project,entries(project),GAME_WORLDS[project.id].assets);
  const controller=new AbortController(),{signal}=controller;
  const config=GAME_WORLDS[project.id],journal=root.querySelector('.world-journal'),canvas=root.querySelector('canvas'),list=root.querySelector('.world-discovery-list'),progress=root.querySelector('.world-progress'),inspect=root.querySelector('[data-interact]'),visited=new Set(),records=entries(project);
  let returnFocus=null,nearby=-1,engine;
  function show(index){if(index<0||journal.open)return;engine.pause(true);returnFocus=document.activeElement;visited.add(index);progress.textContent=`Discoveries · ${visited.size} / 4`;root.querySelector('#journal-title').textContent=records[index].title;root.querySelector('.journal-body').innerHTML=records[index].body;journal.showModal();journal.querySelector('button').focus();}
  engine=createWorldEngine(canvas,project.id,{assets:config.assets,geometryOnly:new URLSearchParams(location.search).has('geometry'),onNearby(index){nearby=index;inspect.disabled=index<0;inspect.textContent=index<0?'Move closer to discover':`E · ${config.stops[index]}`;},onArrive:show});
  progress.addEventListener('click',()=>{list.hidden=!list.hidden;progress.setAttribute('aria-expanded',String(!list.hidden));},{signal});
  root.querySelectorAll('[data-discovery]').forEach(button=>button.addEventListener('click',()=>{list.hidden=true;progress.setAttribute('aria-expanded','false');canvas.focus();engine.visit(Number(button.dataset.discovery),isReducedMotion());},{signal}));
  inspect.addEventListener('click',()=>show(nearby),{signal});
  const keyMap={a:'left',arrowleft:'left',d:'right',arrowright:'right',w:'up',arrowup:'up',s:'down',arrowdown:'down',' ':'up'};
  window.addEventListener('keydown',event=>{if(journal.open||!document.querySelector('.player-menu')?.hidden||event.target.closest('input,textarea,dialog'))return;const key=event.key.toLowerCase();if(keyMap[key]){event.preventDefault();engine.key(keyMap[key],true);}else if(key==='e'&&!event.repeat)show(nearby);},{signal});
  window.addEventListener('keyup',event=>{const key=keyMap[event.key.toLowerCase()];if(key)engine.key(key,false);},{signal});
  root.querySelectorAll('[data-move]').forEach(button=>{button.addEventListener('pointerdown',event=>{event.preventDefault();button.setPointerCapture(event.pointerId);engine.key(button.dataset.move,true);},{signal});for(const type of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(type,()=>engine.key(button.dataset.move,false),{signal});button.addEventListener('keydown',event=>{if(event.key==='Enter')engine.key(button.dataset.move,true);},{signal});button.addEventListener('keyup',()=>engine.key(button.dataset.move,false),{signal});});
  canvas.addEventListener('click',event=>{const rect=canvas.getBoundingClientRect();engine.point((event.clientX-rect.left)*canvas.width/rect.width,(event.clientY-rect.top)*canvas.height/rect.height);},{signal});
  root.querySelector('.journal-close').addEventListener('click',()=>journal.close(),{signal});
  journal.addEventListener('close',()=>{journal.querySelector('video')?.pause();engine.pause(false);returnFocus?.focus?.({preventScroll:true});},{signal});
  window.addEventListener('blur',()=>engine.clear(),{signal});document.addEventListener('visibilitychange',()=>engine.clear(),{signal});window.addEventListener('resize',()=>engine.resize(),{signal});
  const menu=document.querySelector('.player-menu');const observer=new MutationObserver(()=>engine.pause(!menu.hidden||journal.open));if(menu)observer.observe(menu,{attributes:true,attributeFilter:['hidden']});
  window.addEventListener('pagehide',()=>{engine.destroy();observer.disconnect();controller.abort();},{once:true});root.focus({preventScroll:true});
  return()=>{engine.destroy();observer.disconnect();controller.abort();};
}
