import {categories} from '../content.js?v=8273376a5e68';
import {$$,esc,isReducedMotion} from '../utils.js?v=8273376a5e68';
import {MASTER_ROOM,MASTER_OBJECTS,masterBoxStyle,alignMasterRoom,masterPanForObject,masterPanFromDrag} from './room-master.js?v=8273376a5e68';
import {createRoomDiscovery} from './room-discovery.js?v=8273376a5e68';
import { loadJournalModel, getLoadedJournalModel } from './journal-model.js?v=8273376a5e68';
import { prepareRoomJournal, copyRoomJournal, paintRoomJournal } from './journal-room.js?v=8273376a5e68';
import { createJournalIdle } from './journal-idle.js?v=8273376a5e68';
import { prepareRoomCamera, copyRoomCamera } from './camera-live.js?v=8273376a5e68';
export { prepareRoomJournal, copyRoomJournal };
export function prepareRoomArtwork(root,options) {
  return Promise.all([prepareRoomJournal(root,options),prepareRoomCamera(root,options)]);
}
export function copyRoomArtwork(source,target) {
  copyRoomJournal(source,target);
  copyRoomCamera(source,target);
}
export function alignRoomGeometry(root){const scene=root?.matches?.('.master-room')?root:root?.querySelector?.('.master-room');if(scene)scene.style.setProperty('--room-pan',roomState.pan);return alignMasterRoom(root);}
const assetRoot='/assets/room/master/',discoveryKey='bz-room-discovery-v3',roomState={activeIndex:0,birdX:509,birdFacing:'right',pan:.65,panned:false,discoverySeen:false};
function discoveryWasSeen(){try{return roomState.discoverySeen||sessionStorage.getItem(discoveryKey)==='seen';}catch{return roomState.discoverySeen;}}
function rememberDiscovery(){roomState.discoverySeen=true;try{sessionStorage.setItem(discoveryKey,'seen');}catch{/* In-memory state still covers scene returns when storage is unavailable. */}}
function objectOutline(o,bird){return `<svg class="master-object-outline${bird?' bird-outline':''}" viewBox="${o.box.join(' ')}" aria-hidden="true" focusable="false">${o===MASTER_OBJECTS.films?`<path class="cinema-camera-hit" d="${o.path}"/>`: ''}<path class="outline-keyline" d="${o.path}"/><path class="outline-rim" d="${o.path}"/></svg>`;}
function categoryMark(slug,o){if(['research','films','games','music'].includes(slug))return '';return `<img class="object-category-mark" src="${assetRoot}${slug}-mark.svg" width="${o.box[2]}" height="${o.box[3]}" alt="" aria-hidden="true">`;}

function objectImage(slug,o,bird) {
  if(bird)return `<span class="master-object-image bird-sprite" aria-hidden="true">${['body','near-foot','far-foot'].map(part=>`<img class="bird-part bird-${part}" src="${assetRoot}games.svg" width="202" height="176" alt="">`).join('')}<svg class="bird-part bird-near-foot bird-leg-band" viewBox="0 0 202 176" aria-hidden="true"><path fill="#13292e" d="M75 144h15v10H75z"/><path fill="#548888" d="M76 146h13v6H76z"/><path fill="#eed9a2" d="M77 146h2v5h-2z"/></svg></span>`;
  if(slug==='films')return `<span class="master-object-image cinema-camera-image"><canvas data-room-camera width="930" height="693" aria-hidden="true"></canvas><img class="camera-webgl-fallback" src="/assets/room/cinema-camera/studio-65.png" width="${o.box[2]}" height="${o.box[3]}" alt="" aria-hidden="true"></span>`;
  if (slug === 'music') return `<span class="master-object-image room-guitar-model" aria-hidden="true">
    <img class="guitar-rest-render" src="/assets/room/guitar-model/guitar-rest.webp" width="${o.box[2]}" height="${o.box[3]}" alt="">
    <img class="guitar-facing-render" src="/assets/room/guitar-model/guitar-facing.webp" width="${o.box[2]}" height="${o.box[3]}" alt="">
    <span class="guitar-turn-frames" style="--guitar-frame-count:${o.poseCount}"></span>
  </span>`;
  if(slug==='research')return '<canvas class="master-object-image room-journal-model" data-room-journal data-category-mark="baked-in-3d" width="1062" height="336" aria-hidden="true"></canvas>';
  return `<img class="master-object-image" src="${assetRoot}${slug}.svg" width="${o.box[2]}" height="${o.box[3]}" alt="" aria-hidden="true">`;
}
function roomObjects(){return categories.map(({slug,title},index)=>{
  const o=MASTER_OBJECTS[slug],bird=slug==='games';
  return `<a class="room-object object-${slug}" style="${masterBoxStyle(bird?[roomState.birdX,...o.box.slice(1)]:o.box)};--discovery-order:${index}" href="/${slug}/" data-scene-link="${slug}" data-transition-target="${slug}" data-room-object data-route-index="${index}" aria-label="${esc(title)}"${slug==='research'?' data-book-source="loading"':''}${bird?` data-bird-route data-asset-status="master-derived-native-reference" data-state="idle" data-facing="${roomState.birdFacing}"`:''}><span class="object-art">${bird?'<svg class="bird-contact-shadow" viewBox="0 0 202 176" aria-hidden="true"><ellipse cx="108" cy="171" rx="40" ry="4" fill="#241c22" opacity=".28"/></svg>':''}${objectImage(slug,o,bird)}${slug==='music'?'<span class="music-neck-anchor" data-music-room-neck aria-hidden="true"></span>':''}<span class="transition-anchor anchor-${slug}" data-transition-anchor="${slug}" aria-hidden="true"></span>${slug==='research'?'':'<span class="object-idle-cue" aria-hidden="true"></span>'}${categoryMark(slug,o)}${objectOutline(o,bird)}</span></a>`;
}).join('');}
export function renderRoom({preview=false}={}){return `<main${preview?'':' id="main"'} class="game-scene room-scene master-room" data-scene="home" data-master-room="approved-2026-10-24" tabindex="-1" aria-label="Bobby Zhang's interactive creative studio"><span id="room-navigation-help" class="visually-hidden">Five clickable objects: Bird for Games, Camera for Films, Book for Research, Guitar for Music, Computer for AI. Use Tab and Enter, or click or tap an object. The question-mark button briefly highlights all five.</span><div class="room-camera" data-camera-viewport><section class="room-world" data-room-world data-room-stage aria-label="Interactive studio" aria-describedby="room-navigation-help"><div class="room-composition master-composition">
<div class="room-layer room-background master-background" aria-hidden="true"><img src="${MASTER_ROOM.source}" width="1672" height="941" alt="" fetchpriority="high"></div><div class="room-layer room-furniture master-workstation" aria-hidden="true"><img src="${MASTER_ROOM.source}" width="1672" height="941" alt=""></div><img class="master-floor-patch" style="${masterBoxStyle([480,700,240,207])}" src="${MASTER_ROOM.floorPatch}" width="240" height="207" alt="" aria-hidden="true"><nav class="room-objects" aria-label="Creative studio objects">${roomObjects()}</nav><div class="room-layer room-foreground master-foreground" aria-hidden="true"><img src="${MASTER_ROOM.source}" width="1672" height="941" alt=""></div><div class="room-layer room-lighting master-lighting" aria-hidden="true"></div><div class="room-support-anchors" aria-hidden="true"><span data-support-anchor="ai" style="${masterBoxStyle([448,501,1224,0])}"></span></div><svg class="master-geometry-guides" viewBox="0 0 1672 941" aria-hidden="true"><path d="M0 210H1672M448 418H1672V521H284ZM0 716H1672V941H0Z"/><path d="M480 879H1102"/><rect x="850" y="130" width="250" height="170"/>${Object.values(MASTER_OBJECTS).flatMap(o=>o.contacts.map(([x,y])=>`<circle cx="${x}" cy="${y}" r="5"/>`)).join('')}</svg></div></section></div><svg class="room-edge-peek room-edge-left" viewBox="0 0 10 20" aria-hidden="true"><path d="M10 0H7V4H4V7H1V13H4V16H7V20H10V15H7V12H4V8H7V5H10Z"/></svg><svg class="room-edge-peek room-edge-right" viewBox="0 0 10 20" aria-hidden="true"><path d="M10 0H7V4H4V7H1V13H4V16H7V20H10V15H7V12H4V8H7V5H10Z"/></svg><button class="room-discovery-control" type="button" data-reveal-room aria-label="Show interactive objects" aria-describedby="room-discovery-tooltip room-discovery-status">?<span class="room-discovery-tooltip" id="room-discovery-tooltip" role="tooltip">Show interactive objects</span></button><span class="visually-hidden" id="room-discovery-status" role="status" aria-live="polite"></span></main>`;}
export function mountRoom(root){
  const controller=new AbortController(),{signal}=controller,stage=root.querySelector('[data-room-stage]'),objects=$$('[data-room-object]',stage),bird=stage.querySelector('[data-bird-route]');
  let birdTimer,point=0,paused=false,panStart=null,didPan=false,restoringFocus=false,keyboardFocus=false,imagesReady=false,bookReady=!root.querySelector('[data-room-journal]'),readyFrame,bookHeld=false;
  const bookCanvas=root.querySelector('[data-room-journal]');
  const journalIdle=createJournalIdle({paint(cornerLift){const data=getLoadedJournalModel();if(bookCanvas&&data&&root.isConnected!==false)paintRoomJournal(bookCanvas,data,{cornerLift});}});
  const discovery=createRoomDiscovery({seen:discoveryWasSeen(),onSeen:rememberDiscovery,reduced:isReducedMotion,
    show(mode){root.dataset.revealInteractables='true';root.dataset.revealMode=mode;if(mode==='manual')root.querySelector('[role="status"]').textContent='Highlighted: Bird — Games; Camera — Films; Book — Research; Guitar — Music; Computer — AI.';},
    hide(){delete root.dataset.revealInteractables;delete root.dataset.revealMode;}
  });
  const updateDiscovery=()=>{const available=imagesReady&&bookReady&&!document.hidden&&!document.body.classList.contains('menu-open')&&!root.closest('[aria-busy="true"]');discovery.setAvailable(available);journalIdle.setAvailable(available&&!!bookCanvas&&!bookHeld&&!isReducedMotion());};
  prepareRoomJournal(root,{signal}).then(()=>{if(signal.aborted)return;bookReady=true;updateDiscovery();});
  prepareRoomCamera(root,{signal}).catch(error=>console.warn('Camera loading failed.',error));
  const portrait=()=>matchMedia('(max-width:700px) and (orientation:portrait)').matches;
  const setPan=value=>{roomState.pan=value;root.style.setProperty('--room-pan',value);root.dataset.panBefore=String(value>.02);root.dataset.panAfter=String(value<.98);};setPan(roomState.pan);
  const notePan=()=>{roomState.panned=true;root.dataset.roomPanned='true';};root.dataset.roomPanned=String(roomState.panned);
  document.addEventListener('keydown',event=>{if(['Tab','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))keyboardFocus=true;},{signal,capture:true});
  root.addEventListener('pointerdown',()=>{keyboardFocus=false;},{signal,capture:true});
  root.querySelector('#room-navigation-help').textContent+=' In a narrow portrait view, drag sideways to look around; keyboard focus brings objects into view.';
  const media=matchMedia('(prefers-reduced-motion: reduce)'),align=()=>alignMasterRoom(root);
  const book=objects.find(o=>o.dataset.sceneLink==='research');
  for(const event of ['pointerenter','focus'])book?.addEventListener(event,()=>{bookHeld=true;updateDiscovery();},{signal});
  for(const event of ['pointerleave','blur'])book?.addEventListener(event,()=>{bookHeld=false;updateDiscovery();},{signal});
  root.classList.toggle('show-grounding-guides',new URLSearchParams(location.search).has('grounding-guides'));align();window.addEventListener('resize',align,{signal});root.querySelectorAll('img').forEach(img=>img.addEventListener('load',align,{signal}));
  root.querySelector('[data-reveal-room]').addEventListener('click',()=>discovery.manual(),{signal});
  const settleImages=()=>{if(signal.aborted||imagesReady||!Array.from(root.querySelectorAll('img')).every(img=>img.complete))return;cancelAnimationFrame(readyFrame);readyFrame=requestAnimationFrame(()=>{if(signal.aborted)return;imagesReady=true;align();updateDiscovery();loadJournalModel();});};
  root.querySelectorAll('img').forEach(img=>{img.addEventListener('load',settleImages,{signal});img.addEventListener('error',settleImages,{signal});});settleImages();
  const stop=()=>{clearTimeout(birdTimer);bird.dataset.state='idle';};
  const blocked=()=>paused||document.hidden||isReducedMotion()||document.body.classList.contains('menu-open')||root.closest('[aria-busy="true"]');
  const setBird=x=>{roomState.birdX=Math.min(MASTER_ROOM.birdLane[1],Math.max(MASTER_ROOM.birdLane[0],x));bird.style.left=`${roomState.birdX/1672*100}%`;};setBird(roomState.birdX);bird.dataset.facing=roomState.birdFacing;
  const schedule=()=>{clearTimeout(birdTimer);if(blocked())return;bird.style.removeProperty('transition');birdTimer=setTimeout(()=>{if(blocked())return;const x=[700,850,620,509][point++%4];bird.style.setProperty('--bird-stride',`${Math.abs(x-roomState.birdX)*.48/1.8/202*100}%`);roomState.birdFacing=x<roomState.birdX?'left':'right';bird.dataset.facing=roomState.birdFacing;bird.dataset.state=`walk-${roomState.birdFacing}`;setBird(x);birdTimer=setTimeout(()=>{bird.dataset.state='idle';schedule();},1800);},4000);};
  bird.addEventListener('pointerenter',()=>{paused=true;freezeBird();},{signal});bird.addEventListener('pointerleave',()=>{paused=false;schedule();},{signal});bird.addEventListener('focus',()=>{paused=true;freezeBird();},{signal});bird.addEventListener('blur',()=>{paused=false;schedule();},{signal});
  const freezeBird=()=>{const frame=root.querySelector('.master-composition').getBoundingClientRect(),rect=bird.getBoundingClientRect();if(frame.width)setBird((rect.left-frame.left)/frame.width*1672);bird.style.transition='none';stop();};
  stage.addEventListener('pointerdown',event=>{didPan=false;if(event.pointerType==='touch'&&portrait())panStart={id:event.pointerId,x:event.clientX,pan:roomState.pan};},{signal});
  stage.addEventListener('pointermove',event=>{if(!panStart||event.pointerType!=='touch'||!portrait())return;const dx=event.clientX-panStart.x;if(Math.abs(dx)<10&&!didPan)return;didPan=true;notePan();event.preventDefault();stage.setPointerCapture(event.pointerId);setPan(masterPanFromDrag(panStart.pan,dx,innerWidth,innerHeight));},{signal});
  const endPan=()=>{panStart=null;};stage.addEventListener('pointerup',endPan,{signal});stage.addEventListener('pointercancel',endPan,{signal});
  stage.addEventListener('click',event=>{if(didPan){event.preventDefault();event.stopImmediatePropagation();didPan=false;return;}if(!event.target.closest('[data-room-object]'))return;if(event.target.closest('[data-room-object]').dataset.sceneLink==='research')loadJournalModel();discovery.acknowledge();journalIdle.setAvailable(false);freezeBird();},{signal,capture:true});
  root.addEventListener('focusin',event=>{const index=objects.indexOf(event.target.closest('[data-room-object]'));if(index>=0){roomState.activeIndex=index;const name=objects[index].dataset.sceneLink;if(keyboardFocus&&!restoringFocus)discovery.visitObject(name);if(name==='games')freezeBird();if(portrait()&&keyboardFocus&&!restoringFocus)setPan(masterPanForObject(name,innerWidth,innerHeight,name==='games'?roomState.birdX:undefined));}},{signal});
  stage.addEventListener('keydown',event=>{if(!event.target.closest('[data-room-object]'))return;const direction=({ArrowRight:1,ArrowDown:1,ArrowLeft:-1,ArrowUp:-1})[event.key];if(direction){event.preventDefault();objects[(roomState.activeIndex+direction+objects.length)%objects.length].focus({preventScroll:true});}},{signal});
  const resume=()=>{root.dataset.idlePaused=String(document.hidden);root.dataset.roomMotion=isReducedMotion()?'reduced':'full';stop();if(!document.hidden)schedule();updateDiscovery();};document.addEventListener('visibilitychange',resume,{signal});media.addEventListener('change',resume,{signal});
  const observer=new MutationObserver(resume);observer.observe(document.body,{attributes:true,attributeFilter:['class']});observer.observe(document.documentElement,{attributes:true,attributeFilter:['data-motion']});const shell=root.closest('.game-shell');if(shell)observer.observe(shell,{attributes:true,attributeFilter:['aria-busy']});resume();
  return{cleanup(){controller.abort();observer.disconnect();stop();cancelAnimationFrame(readyFrame);discovery.destroy();journalIdle.destroy();},focusObject(route){restoringFocus=true;(objects.find(o=>o.dataset.sceneLink===route)||root).focus({preventScroll:true});restoringFocus=false;}};
}
