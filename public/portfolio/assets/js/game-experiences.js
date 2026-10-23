import { esc, isReducedMotion } from './utils.js?v=1935067ad971';
import { createWorldEngine, bindWorldLook } from './world-engine.js?v=1935067ad971';
import { BREAKOUT_CHAPTERS, orderedChapters, OCEAN_LEVELS, RAT_OBJECTS, newRatState, validRatState, ratAction } from './experience-state.js?v=1935067ad971';
import { renderFieldGuide, renderRatInventory, mountWorldUI, closeFieldGuide, worldInputBlocked, worldUIBlocked, bindRatTouch } from './game-ui.js?v=1935067ad971';
import { renderOceanExpedition, mountOceanExpedition, oceanCards } from './ocean-expedition.js?v=1935067ad971';
import { renderKitchenReveal, mountKitchenReveal } from './kitchen-reveal.js?v=1935067ad971';

export const CUSTOM_GAMES = new Set(['chickens-breakout','plasteroids','cat-eat-rat']);
const controls=`<div class="world-touch-controls" role="group" aria-label="Movement controls"><button type="button" data-move="left" aria-label="Move left or turn left">←</button><button type="button" data-move="up" aria-label="Move up, forward or jump">↑</button><button type="button" data-move="down" aria-label="Move down or backward">↓</button><button type="button" data-move="right" aria-label="Move right or turn right">→</button></div>`;
const discoveryJournal=`<dialog class="world-journal" aria-labelledby="journal-title"><button class="journal-close game-control" type="button" aria-label="Close discovery">×</button><p class="eyebrow">Field note</p><h2 id="journal-title"></h2><div class="journal-body"></div></dialog>`;

export function renderExperience(project,records) {
  const bird=project.id==='chickens-breakout',ocean=project.id==='plasteroids';
  const journal=bird||ocean?discoveryJournal:'';
  const labels=bird?['The game','Movement & danger','Making it together','Build archive']:ocean?OCEAN_LEVELS.map((level,index)=>`Level ${index+1} · ${level.name}`):RAT_OBJECTS.map(item=>item.label);
  const help=bird?'Move right to reveal the story · ↑ / Space to jump':ocean?'WASD / arrows, touch arrows or scroll to swim · Stop to read; dive farther to meet the next animal · E sends ink in the boss arena':'W / S walk · A / D turn · Mouse drag to look · E collect · Touch: drag up/down to walk, sideways to turn, tap to collect · Open inventory for help and guided travel';
  let scene='';
  if(bird) {
    const chapters=[records[0],{title:'Movement & danger',body:'<p>Move horizontally, jump between platforms, and watch the monster chickens. The original GameMaker source includes gravity, wall and chicken collisions, checkpoints, and dangerous enemies.</p>'},records[1],records[3]];
    scene=`<div class="breakout-story-world" aria-label="Information along the background">${chapters.map((record,index)=>`<article class="background-chapter" data-chapter="${index}" hidden><p class="eyebrow">0${index+1} / 04</p><h2>${esc(record.title)}</h2><div class="chapter-body">${record.body}</div></article>`).join('')}</div>`;
  } else if(ocean) {
    scene=renderOceanExpedition(project);
  } else scene=`<button class="rat-pack" type="button" aria-label="Inventory and exploration controls" aria-expanded="false" aria-controls="world-discoveries"><span class="rat-inventory" aria-live="polite"></span></button><p class="rat-message visually-hidden" role="status">Collect cheese and water guns. Take the cheese home to the mouse hole.</p><button class="world-inspect game-control" data-interact type="button" disabled hidden>Move closer to an object</button><p class="world-objective visually-hidden" data-world-objective>Find the cheese</p>${renderKitchenReveal(project)}`;
  return `<main id="main" class="game-world bespoke-world world-${bird?'platform':ocean?'ocean':'kitchen'}" data-game-world="${project.id}" data-experience="${bird?'background-trail':ocean?'vertical-ocean':'rat-collection'}" tabindex="-1" aria-labelledby="world-title">
    <header class="world-hud">${!bird&&!ocean?'<a class="game-control" href="/games/">← Return to characters</a>':'<a class="game-control" href="/games/">← Characters</a><a class="game-control" href="/">↙ Room</a><button class="game-control menu-button" type="button" aria-expanded="false" aria-controls="player-menu">Menu</button><button class="game-control sound-button" type="button" aria-pressed="false"></button>'}</header>
    <div class="${!bird&&!ocean?'visually-hidden':'world-caption'}"><h1 id="world-title">${esc(project.title)}</h1></div>
    <canvas class="world-canvas" tabindex="0" aria-label="${esc(help)}. Use the destination list for accessible navigation."></canvas>${scene}
    ${renderFieldGuide({help,label:bird?'Chapters':'Guide',count:ocean?oceanCards(project).length:labels.length,coach:ocean?'<aside class="route-coach"><h3>Optional dive assistance</h3><button class="game-control" data-ocean-guide type="button">Swim to the next messenger ↓</button></aside>':!bird?'<aside class="route-coach"><h3>Next discovery</h3><span data-route-prompt>Find the cheese under the preparation counter.</span><small data-route-space>Under the preparation counter</small><button class="game-control" data-next-object type="button">Guide me to the next object →</button></aside>':'',extra:ocean?'<details class="ocean-encounter-log"><summary>Revisit encountered notes</summary><nav data-ocean-log aria-label="Encountered notes"></nav></details>':!bird?'<details class="world-restart"><summary>Restart this exploration</summary><p>This clears collected objects in this local session.</p><button class="rat-reset game-control" type="button">Restart collection</button></details>':'',destinations:labels.map((label,index)=>`<button type="button" data-discovery="${index}">0${index+1} · ${esc(label)}<span>Go →</span></button>`).join('')})}${controls}${journal}
  </main>`;
}

export function mountExperience(root,project,records,assets) {
  const controller=new AbortController(),{signal}=controller,id=project.id;
  const canvas=root.querySelector('.world-canvas'),progress=root.querySelector('.world-progress'),journal=root.querySelector('.world-journal'),inspect=root.querySelector('[data-interact]');
  let engine,nearby=-1,revealed=0,rat=newRatState(),oceanUI=null,kitchenUI=null;
  function updateInspect(){if(!inspect)return;const object=RAT_OBJECTS[nearby],done=object&&(object.kind==='hole'?rat.deposits>0:rat.collected.includes(object.id));inspect.disabled=nearby<0||done;inspect.hidden=nearby<0||done;inspect.textContent=nearby<0?'Move closer to an object':`E · ${object.label}`;}
  try { const saved=JSON.parse(sessionStorage.getItem('portfolio-rat-collection-v2'));if(validRatState(saved))rat=saved; } catch { /* Storage optional. */ }
  function saveRat(){try {sessionStorage.setItem('portfolio-rat-collection-v2',JSON.stringify(rat));}catch { /* Storage optional. */ }}
  function inventory(){kitchenUI?.restore(rat);updateInspect();root.querySelector('.rat-inventory').innerHTML=renderRatInventory(rat);const done=rat.collected.length+Number(rat.deposits>0);progress.textContent=`Guide · ${done} / 5`;root.querySelector('[data-route-prompt]').textContent=done===5?'Cheese home. All five displays restored.':`Next ${done+1} / 5 · ${RAT_OBJECTS[done].label}`;root.querySelector('[data-world-objective]').textContent=done===5?'All displays restored':`${done+1} / 5 · ${RAT_OBJECTS[done].label}`;root.querySelector('[data-next-object]').disabled=done===5;root.querySelectorAll('[data-discovery]').forEach(button=>{button.disabled=Number(button.dataset.discovery)>done;});}
  function interact(index=nearby){if(id!=='cat-eat-rat'||index<0)return;const object=RAT_OBJECTS[index],result=ratAction(rat,object.id);root.querySelector('.rat-message').textContent=result.message;
    if(index>rat.collected.length)return;
    if(object.kind==='hole'&&!result.changed&&!rat.deposits)return;
    rat=result.state;saveRat();inventory();engine.acknowledgeStop(index);engine.setCollected(rat.collected);
    kitchenUI.open(index,rat.delivered);
  }
  function frame(model){
    if(id==='cat-eat-rat'){const label=root.querySelector('[data-route-space]');if(label&&label.textContent!==model.space)label.textContent=model.space;kitchenUI?.frame(model);}
    if(id==='chickens-breakout') {
      const world=root.querySelector('.breakout-story-world'),width=Math.min(350,model.width/model.scale-32);
      world.style.transform=`translate(${-model.cameraX*model.scale}px,0) scale(${model.scale})`;
      revealed=orderedChapters(model.x,revealed);progress.textContent=`Chapters · ${revealed} / 4`;root.dataset.chapters=String(revealed);
      root.querySelectorAll('[data-chapter]').forEach((article,index)=>{article.hidden=index>=revealed;article.style.left=`${Math.max(8,BREAKOUT_CHAPTERS[index]-width/2)}px`;article.style.width=`${width}px`;});
    } else if(id==='plasteroids') {
      oceanUI?.frame(model);
    }
  }
  engine=createWorldEngine(canvas,id,{assets,geometryOnly:new URLSearchParams(location.search).has('geometry'),onFrame:frame,onNearby(index){nearby=index;updateInspect();},onArrive(index){if(id==='cat-eat-rat')interact(index);}});
  const syncPause=mountWorldUI(root,engine,signal);
  if(id==='plasteroids')oceanUI=mountOceanExpedition(root,project,engine,syncPause,signal);
  if(id==='cat-eat-rat')kitchenUI=mountKitchenReveal(root,project,engine,signal);
  if(id==='cat-eat-rat'){inventory();bindWorldLook(canvas,engine,signal,{mouseOnly:true});bindRatTouch(canvas,engine,()=>{if(!worldUIBlocked(root))interact();},signal);engine.setCollected(rat.collected);engine.resetRoute(rat.collected.length+Number(rat.deposits>0));inspect.addEventListener('click',()=>interact(),{signal});root.querySelector('[data-next-object]').addEventListener('click',()=>{closeFieldGuide(root);syncPause();canvas.focus();engine.visit(rat.collected.length,isReducedMotion());},{signal});root.querySelector('.rat-reset').addEventListener('click',()=>{rat=newRatState();saveRat();inventory();engine.setCollected([]);engine.resetRoute();root.querySelector('.rat-message').textContent='Collection restarted. Find the cheese and water guns.';closeFieldGuide(root);syncPause();canvas.focus();},{signal});}
  root.querySelectorAll('[data-discovery]').forEach(button=>button.addEventListener('click',()=>{closeFieldGuide(root);syncPause();canvas.focus();engine.visit(Number(button.dataset.discovery),isReducedMotion());},{signal}));
  const keys={a:'left',arrowleft:'left',d:'right',arrowright:'right',w:'up',arrowup:'up',s:'down',arrowdown:'down',pageup:'look-up',pagedown:'look-down',' ':'up'};
  window.addEventListener('keydown',event=>{if(worldInputBlocked(root,event))return;const key=event.key.toLowerCase();if(keys[key]){event.preventDefault();engine.key(keys[key],true);}else if(key==='e'&&!event.repeat){if(oceanUI)oceanUI.fire();else interact();}},{signal});
  window.addEventListener('keyup',event=>{if(keys[event.key.toLowerCase()])engine.key(keys[event.key.toLowerCase()],false);},{signal});
  root.querySelectorAll('[data-move]').forEach(button=>{button.addEventListener('pointerdown',event=>{event.preventDefault();button.setPointerCapture(event.pointerId);engine.key(button.dataset.move,true);},{signal});for(const type of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(type,()=>engine.key(button.dataset.move,false),{signal});button.addEventListener('keydown',event=>{if(event.key==='Enter')engine.key(button.dataset.move,true);},{signal});button.addEventListener('keyup',()=>engine.key(button.dataset.move,false),{signal});});
  canvas.addEventListener('click',event=>{const rect=canvas.getBoundingClientRect();engine.point((event.clientX-rect.left)*canvas.width/rect.width,(event.clientY-rect.top)*canvas.height/rect.height);},{signal});
  // Notes are passive scenery: wheel input over their artwork must still swim.
  // Open menus/guide retain their own native scrolling and pause the world.
  if(id==='plasteroids')root.addEventListener('wheel',event=>{if(worldUIBlocked(root)||event.ctrlKey||!event.deltaY)return;event.preventDefault();engine.swimToDepth(engine.snapshot().y+Math.sign(event.deltaY)*Math.min(260,Math.abs(event.deltaY)*.65),false,true);},{signal,passive:false});
  root.querySelector('.journal-close')?.addEventListener('click',()=>journal.close(),{signal});journal?.addEventListener('close',()=>{journal.querySelector('video')?.pause();syncPause();canvas.focus();},{signal});
  window.addEventListener('blur',()=>engine.clear(),{signal});window.addEventListener('resize',()=>engine.resize(),{signal});
  root.focus({preventScroll:true});
  const cleanup=()=>{controller.abort();engine.destroy();root.querySelectorAll('video').forEach(video=>video.pause());root.querySelectorAll('.ocean-delivery').forEach(page=>page.getAnimations().forEach(animation=>animation.cancel()));};
  window.addEventListener('pagehide',cleanup,{once:true});return cleanup;
}
