import { esc, isReducedMotion } from './utils.js?v=39bd00589fe9';
import { createWorldEngine } from './world-engine.js?v=39bd00589fe9';
import { BREAKOUT_CHAPTERS, orderedChapters, OCEAN_LEVELS, RAT_OBJECTS, newRatState, validRatState, ratAction } from './experience-state.js?v=39bd00589fe9';

export const CUSTOM_GAMES = new Set(['chickens-breakout','plasteroids','cat-eat-rat']);
const picture=(src,crop,label)=>`<canvas class="deck-picture" width="640" height="260" data-source="${src}" data-crop='${JSON.stringify(crop)}' role="img" aria-label="${esc(label)}"></canvas>`;
const controls=`<div class="world-touch-controls" role="group" aria-label="Movement controls"><button type="button" data-move="left" aria-label="Move left or turn left">←</button><button type="button" data-move="up" aria-label="Move up, forward or jump">↑</button><button type="button" data-move="down" aria-label="Move down or backward">↓</button><button type="button" data-move="right" aria-label="Move right or turn right">→</button></div>`;
const journal=`<dialog class="world-journal" aria-labelledby="journal-title"><button class="journal-close game-control" type="button" aria-label="Close discovery">×</button><p class="eyebrow">Field note</p><h2 id="journal-title"></h2><div class="journal-body"></div></dialog>`;

export function renderExperience(project,records) {
  const bird=project.id==='chickens-breakout',ocean=project.id==='plasteroids';
  const labels=bird?['The game','Movement & danger','Making it together','Build archive']:ocean?OCEAN_LEVELS.map((level,index)=>`Level ${index+1} · ${level.name}`):RAT_OBJECTS.map(item=>item.label);
  const help=bird?'Move right to reveal the story · ↑ / Space to jump':ocean?'Swim down through three depths · WASD / arrows · Tap water to swim':'Rat view · W/S walk · A/D turn · E collect / deposit';
  let scene='';
  if(bird) {
    const chapters=[records[0],{title:'Movement & danger',body:'<p>Move horizontally, jump between platforms, and watch the monster chickens. The original GameMaker source includes gravity, wall and chicken collisions, checkpoints, and dangerous enemies.</p>'},records[1],records[3]];
    scene=`<div class="breakout-story-world" aria-label="Information along the background">${chapters.map((record,index)=>`<article class="background-chapter" data-chapter="${index}" hidden><p class="eyebrow">0${index+1} / 04</p><h2>${esc(record.title)}</h2><div class="chapter-body">${record.body}</div></article>`).join('')}</div>`;
  } else if(ocean) {
    const pages=[records[0],records[1],{title:'The deep ocean',body:records[2].body+records[3].body}];
    scene=`<div class="depth-status" aria-live="polite"></div>${OCEAN_LEVELS.map((level,index)=>`<section class="ocean-delivery" data-level-page="${index}" hidden aria-labelledby="depth-title-${index}">
      <div class="fish-messenger">${picture(level.fish,level.crop,['Swordfish','Manta ray','Electric eel'][index]+' from the game presentation')}<span>LEVEL 0${index+1} · ${['Swordfish','Manta ray','Electric eel'][index]}</span></div>
      <article class="ocean-page"><button class="game-control page-fold" type="button" aria-expanded="true" aria-controls="depth-body-${index}">Fold page</button><h2 id="depth-title-${index}">${esc(pages[index].title)}</h2><div id="depth-body-${index}" class="ocean-page-body">
      ${index===0?`<img class="ocean-source-strip" src="${level.picture}" alt="Original surface-water pixel art from slide 10">`:index===1?picture(level.picture,[119,140,1268,1145],'Original trash artwork from slide 11'):picture(level.fish,level.crop,'Original deep-water enemy artwork from slide 12')}
      ${pages[index].body}</div></article></section>`).join('')}`;
  } else scene=`<div class="rat-inventory" aria-live="polite"></div><p class="rat-message" role="status">Collect cheese and water guns. Take the cheese home to the mouse hole.</p><button class="world-inspect game-control" data-interact type="button" disabled>Move closer to an object</button><button class="rat-reset game-control" type="button">Restart collection</button>`;
  return `<main id="main" class="game-world bespoke-world world-${bird?'platform':ocean?'ocean':'kitchen'}" data-game-world="${project.id}" data-experience="${bird?'background-trail':ocean?'vertical-ocean':'rat-collection'}" tabindex="-1" aria-labelledby="world-title">
    <header class="world-hud"><a class="game-control" href="/games/">← Characters</a><a class="game-control" href="/">↙ Room</a><button class="game-control menu-button" type="button" aria-expanded="false" aria-controls="player-menu">Menu</button><button class="game-control sound-button" type="button" aria-pressed="false"></button></header>
    <div class="world-caption"><p>${bird?'A story along the route':ocean?'Dive into the project':'One kitchen · Rat’s eye level'}</p><h1 id="world-title">${esc(project.title)}</h1></div>
    <canvas class="world-canvas" tabindex="0" aria-label="${esc(help)}. Use the destination list for accessible navigation."></canvas>${scene}
    <div class="world-bottom"><p class="world-help">${help}</p><button class="world-progress game-control" type="button" aria-expanded="false" aria-controls="world-discoveries">${bird?'Chapters':ocean?'Depths':'Objects'} · 0 / ${labels.length}</button><span>Browser portfolio interpretation</span></div>
    <nav id="world-discoveries" class="world-discovery-list" aria-label="Discovery destinations" hidden>${labels.map((label,index)=>`<button type="button" data-discovery="${index}">0${index+1} · ${esc(label)}<span>Go →</span></button>`).join('')}</nav>${controls}${journal}
  </main>`;
}

function drawPictures(root,signal) {
  root.querySelectorAll('canvas[data-source]').forEach(canvas=>{
    const image=new Image();
    image.onload=()=>{if(signal.aborted)return;const crop=JSON.parse(canvas.dataset.crop),ctx=canvas.getContext('2d'),scale=Math.min(canvas.width/crop[2],canvas.height/crop[3]);
      ctx.imageSmoothingEnabled=false;ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,...crop,(canvas.width-crop[2]*scale)/2,(canvas.height-crop[3]*scale)/2,crop[2]*scale,crop[3]*scale);canvas.dataset.sourceReady='true';};
    image.src=canvas.dataset.source;
  });
}

export function mountExperience(root,project,records,assets) {
  const controller=new AbortController(),{signal}=controller,id=project.id;
  const canvas=root.querySelector('.world-canvas'),list=root.querySelector('.world-discovery-list'),progress=root.querySelector('.world-progress'),journal=root.querySelector('.world-journal'),inspect=root.querySelector('[data-interact]');
  let engine,nearby=-1,revealed=0,level=-1,previousFocus=null,rat=newRatState();
  const reached=new Set();
  try { const saved=JSON.parse(sessionStorage.getItem('portfolio-rat-collection'));if(validRatState(saved))rat=saved; } catch { /* Storage optional. */ }
  function saveRat(){try {sessionStorage.setItem('portfolio-rat-collection',JSON.stringify(rat));}catch { /* Storage optional. */ }}
  function inventory(){root.querySelector('.rat-inventory').textContent=`Cheese carried ${rat.carried} / 2 · Water guns ${rat.guns} / 2 · Delivered ${rat.delivered} / 2`;progress.textContent=`Objects · ${rat.collected.length+Number(rat.deposits>0)} / 5`;}
  function openNote(record){if(journal.open)return;engine.pause(true);previousFocus=document.activeElement;root.querySelector('#journal-title').textContent=record.title;root.querySelector('.journal-body').innerHTML=record.body;journal.showModal();journal.querySelector('button').focus();}
  function interact(){if(id!=='cat-eat-rat'||nearby<0)return;const object=RAT_OBJECTS[nearby],result=ratAction(rat,object.id);root.querySelector('.rat-message').textContent=result.message;
    if(object.kind==='hole'&&!result.changed)return;
    rat=result.state;saveRat();inventory();engine.setCollected(rat.collected);
    const notes=[records[0],{title:'The rat’s toolkit',body:'<p>In this portfolio kitchen, walk at rat height, collect cheese, and find water guns. Each pickup opens a different project note. Carry cheese to the mouse hole for the final note.</p><p>The original supplied game uses separate cat and rat viewpoints. This version follows only the rat, as requested.</p>'},records[1],records[3],{title:'Home, with cheese',body:`<p>You have delivered ${rat.delivered} piece${rat.delivered===1?'':'s'} of cheese.</p>${records[2].body}<p>This collection loop is an interactive portfolio interpretation of the supplied kitchen game.</p>`}];
    openNote(notes[nearby]);
  }
  function frame(model){
    if(id==='chickens-breakout') {
      const world=root.querySelector('.breakout-story-world'),width=Math.min(500,model.width/model.scale-32);
      world.style.transform=`translate(${-model.cameraX*model.scale}px,0) scale(${model.scale})`;
      revealed=orderedChapters(model.x,revealed);progress.textContent=`Chapters · ${revealed} / 4`;root.dataset.chapters=String(revealed);
      root.querySelectorAll('[data-chapter]').forEach((article,index)=>{article.hidden=index>=revealed;article.style.left=`${Math.max(8,BREAKOUT_CHAPTERS[index]-width/2)}px`;article.style.width=`${width}px`;});
    } else if(id==='plasteroids') {
      root.querySelector('.depth-status').textContent=`Level 0${model.level+1} · ${OCEAN_LEVELS[model.level].name} · Depth ${Math.round(model.y)}`;
      if(level!==model.level){level=model.level;reached.add(level);root.dataset.activeLevel=String(level);progress.textContent=`Depths · ${reached.size} / 3`;
        root.querySelectorAll('[data-level-page]').forEach((page,index)=>{page.hidden=index!==level;page.querySelector('video')?.pause();if(index===level){page.getAnimations().forEach(animation=>animation.cancel());if(!isReducedMotion())page.animate([{transform:'translateX(calc(100vw + 200px))'},{transform:'translateX(0)'}],{duration:1400,easing:'cubic-bezier(.2,.65,.25,1)'});}});
      }
    }
  }
  engine=createWorldEngine(canvas,id,{assets,geometryOnly:new URLSearchParams(location.search).has('geometry'),onFrame:frame,onNearby(index){nearby=index;if(inspect){inspect.disabled=index<0;inspect.textContent=index<0?'Move closer to an object':`E · ${RAT_OBJECTS[index].label}`;}},onArrive(){if(id==='cat-eat-rat')interact();}});
  if(id==='cat-eat-rat'){inventory();engine.setCollected(rat.collected);inspect.addEventListener('click',interact,{signal});root.querySelector('.rat-reset').addEventListener('click',()=>{rat=newRatState();saveRat();inventory();engine.setCollected([]);root.querySelector('.rat-message').textContent='Collection restarted. Find the cheese and water guns.';},{signal});}
  progress.addEventListener('click',()=>{list.hidden=!list.hidden;progress.setAttribute('aria-expanded',String(!list.hidden));},{signal});
  root.querySelectorAll('[data-discovery]').forEach(button=>button.addEventListener('click',()=>{list.hidden=true;progress.setAttribute('aria-expanded','false');canvas.focus();engine.visit(Number(button.dataset.discovery),isReducedMotion());},{signal}));
  root.querySelectorAll('.page-fold').forEach(button=>button.addEventListener('click',()=>{const body=root.querySelector('#'+button.getAttribute('aria-controls'));body.hidden=!body.hidden;button.textContent=body.hidden?'Read page':'Fold page';button.setAttribute('aria-expanded',String(!body.hidden));},{signal}));
  const keys={a:'left',arrowleft:'left',d:'right',arrowright:'right',w:'up',arrowup:'up',s:'down',arrowdown:'down',' ':'up'};
  window.addEventListener('keydown',event=>{if(journal.open||!document.querySelector('.player-menu')?.hidden||event.target.closest('input,textarea,dialog'))return;const key=event.key.toLowerCase();if(keys[key]){event.preventDefault();engine.key(keys[key],true);}else if(key==='e'&&!event.repeat)interact();},{signal});
  window.addEventListener('keyup',event=>{if(keys[event.key.toLowerCase()])engine.key(keys[event.key.toLowerCase()],false);},{signal});
  root.querySelectorAll('[data-move]').forEach(button=>{button.addEventListener('pointerdown',event=>{event.preventDefault();button.setPointerCapture(event.pointerId);engine.key(button.dataset.move,true);},{signal});for(const type of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(type,()=>engine.key(button.dataset.move,false),{signal});button.addEventListener('keydown',event=>{if(event.key==='Enter')engine.key(button.dataset.move,true);},{signal});button.addEventListener('keyup',()=>engine.key(button.dataset.move,false),{signal});});
  canvas.addEventListener('click',event=>{const rect=canvas.getBoundingClientRect();engine.point((event.clientX-rect.left)*canvas.width/rect.width,(event.clientY-rect.top)*canvas.height/rect.height);},{signal});
  root.querySelector('.journal-close').addEventListener('click',()=>journal.close(),{signal});journal.addEventListener('close',()=>{journal.querySelector('video')?.pause();engine.pause(false);previousFocus?.focus?.({preventScroll:true});},{signal});
  window.addEventListener('blur',()=>engine.clear(),{signal});window.addEventListener('resize',()=>engine.resize(),{signal});
  const menu=document.querySelector('.player-menu');
  function syncPause(){const paused=document.hidden||!menu.hidden||journal.open;root.dataset.paused=String(paused);engine.pause(paused);root.querySelectorAll('.ocean-delivery').forEach(page=>page.getAnimations().forEach(animation=>paused?animation.pause():animation.play()));}
  document.addEventListener('visibilitychange',syncPause,{signal});
  const observer=new MutationObserver(syncPause);
  if(menu)observer.observe(menu,{attributes:true,attributeFilter:['hidden']});
  drawPictures(root,signal);root.focus({preventScroll:true});
  const cleanup=()=>{engine.destroy();observer.disconnect();controller.abort();root.querySelectorAll('video').forEach(video=>video.pause());root.querySelectorAll('.ocean-delivery').forEach(page=>page.getAnimations().forEach(animation=>animation.cancel()));};
  window.addEventListener('pagehide',cleanup,{once:true});return cleanup;
}
