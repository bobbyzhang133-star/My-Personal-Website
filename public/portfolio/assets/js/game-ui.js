/* Shared exploration chrome: the world stays primary; secondary tasks are on demand. */
export function renderRatInventory(state) {
  return [
    ['cheese',state.carried,'Cheese','cheese.svg'],
    ['guns',state.guns,'Water guns','water-gun.svg'],
    ['home',state.delivered,'Home','mouse-hole.svg'],
  ].map(([key,count,label,icon])=>`<span class="inventory-slot" data-inventory="${key}"><img src="/assets/game-props/${icon}" alt="" aria-hidden="true"><span><b>${count}/2</b><small>${label}</small></span></span>`).join('');
}

export function renderFieldGuide({ help, label, count, coach = '', extra = '', destinations }) {
  return `<details class="world-field-guide" id="world-discoveries">
    <summary class="world-progress game-control" aria-expanded="false" aria-controls="world-guide-body">${label} · 0 / ${count}</summary>
    <div class="world-guide-body" id="world-guide-body" tabindex="-1">
      <h2>Field guide</h2>${coach}${extra}
      <section class="world-controls-help"><h3>Controls</h3><p class="world-help">${help}</p></section>
      <nav class="world-discovery-list" aria-label="Discovery destinations">${destinations}</nav>
      <p class="world-source-note">Browser portfolio interpretation, not the original executable.</p>
      <button type="button" class="game-control" data-guide-close>Return to exploring</button>
    </div>
  </details>`;
}

export function worldUIBlocked(root) {
  return document.hidden || !!root.querySelector('.world-field-guide[open], .world-journal[open]') || document.querySelector('.player-menu')?.hidden === false;
}

export function closeFieldGuide(root) {
  const guide = root.querySelector('.world-field-guide');
  if (guide) guide.open = false;
  root.querySelector('.world-progress')?.setAttribute('aria-expanded', 'false');
}

export function mountWorldUI(root, engine, signal) {
  const guide = root.querySelector('.world-field-guide');
  const summary = root.querySelector('.world-progress');
  const pack = root.querySelector('.rat-pack');
  const sync = () => {
    const paused = worldUIBlocked(root);
    root.dataset.paused = String(paused);
    engine.pause(paused);
    summary.setAttribute('aria-expanded', String(guide.open));
    pack?.setAttribute('aria-expanded',String(guide.open));
    const overlayPaused=document.hidden||guide.open||!!root.querySelector('.world-journal[open]')||document.querySelector('.player-menu')?.hidden===false;
    root.dataset.overlayPaused=String(overlayPaused);
    if(overlayPaused)root.querySelectorAll('.kitchen-wall-display video').forEach(video=>video.pause());
    root.querySelectorAll('.ocean-delivery').forEach(page => page.getAnimations().forEach(animation => overlayPaused ? animation.pause() : animation.play()));
  };
  guide.addEventListener('toggle', sync, { signal });
  pack?.addEventListener('click',()=>{guide.open=!guide.open;sync();if(guide.open)root.querySelector('.world-guide-body').focus();},{signal});
  // Pause synchronously, before the native details toggle event is queued.
  summary.addEventListener('click', () => { engine.clear(); engine.pause(true); }, { signal });
  root.querySelector('[data-guide-close]').addEventListener('click', () => { closeFieldGuide(root); sync(); (pack||summary).focus(); }, { signal });
  root.querySelector('.world-journal')?.addEventListener('close', sync, { signal });
  window.addEventListener('keydown', event => {
    if (event.key === 'Escape' && guide.open) { event.preventDefault(); event.stopImmediatePropagation(); closeFieldGuide(root); sync(); (pack||summary).focus(); }
  }, { signal, capture: true });
  document.addEventListener('visibilitychange', sync, { signal });
  const observer = new MutationObserver(sync);
  const menu = document.querySelector('.player-menu');
  if (menu) observer.observe(menu, { attributes: true, attributeFilter: ['hidden'] });
  observer.observe(root, { attributes: true, subtree: true, attributeFilter: ['open', 'hidden'] });
  signal.addEventListener('abort', () => observer.disconnect(), { once: true });
  sync();
  return sync;
}

export function worldInputBlocked(root, event) {
  return worldUIBlocked(root) || !!event.target.closest('input,textarea,dialog,button,a,summary');
}

// Touch travel without a permanent joystick HUD: drag vertically to walk,
// horizontally to turn; a deliberate tap inspects the nearby world object.
export function bindRatTouch(canvas,engine,interact,signal) {
  let gesture=null;
  const stop=()=>{engine.key('up',false);engine.key('down',false);gesture=null;};
  canvas.addEventListener('pointerdown',event=>{
    if(event.pointerType!=='touch'||gesture)return;
    gesture={id:event.pointerId,x:event.clientX,y:event.clientY,startX:event.clientX,startY:event.clientY,moved:false};
    canvas.setPointerCapture(event.pointerId);canvas.focus({preventScroll:true});
  },{signal});
  canvas.addEventListener('pointermove',event=>{
    if(!gesture||event.pointerId!==gesture.id)return;
    const dx=event.clientX-gesture.x,dy=event.clientY-gesture.startY;
    if(Math.hypot(event.clientX-gesture.startX,dy)>10)gesture.moved=true;
    if(gesture.moved){engine.look(-dx*.006);engine.key('up',dy<-18);engine.key('down',dy>18);}
    gesture.x=event.clientX;gesture.y=event.clientY;
  },{signal});
  canvas.addEventListener('pointerup',event=>{if(gesture?.id!==event.pointerId)return;const tap=!gesture.moved;stop();if(tap)interact();},{signal});
  for(const type of ['pointercancel','lostpointercapture'])canvas.addEventListener(type,event=>{if(gesture?.id===event.pointerId)stop();},{signal});
  signal.addEventListener('abort',stop,{once:true});
}
