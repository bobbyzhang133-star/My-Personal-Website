import { projects } from '../content.js?v=3fe186ecf43b';
import { $$, esc, isReducedMotion } from '../utils.js?v=3fe186ecf43b';
import { sceneController } from './shared.js?v=3fe186ecf43b';
import { sourceLinks } from '../project-sources.js?v=3fe186ecf43b';
import { FILM_GATE } from './film-gate-geometry.js?v=3fe186ecf43b';
import { LiveCameraView, loadLiveCamera } from './camera-live.js?v=3fe186ecf43b';
import { filmSlots, projectionSample } from './film-strip.js?v=3fe186ecf43b';

const films = projects.filter(project => project.category === 'films');
const [width, height] = FILM_GATE.size;
const [gateX, gateY, gateWidth, gateHeight] = FILM_GATE.gate;
const pitch = FILM_GATE.pitch;

export function filmPlaybackUrl(project) {
  const link=project.externalLinks.find(link=>/^https:\/\/drive\.google\.com\/file\/d\/[^/]+\/preview(?:\?|$)/.test(link.url));
  if (!link) return null;
  const url=new URL(link.url);url.searchParams.set('autoplay','1');
  return url.href;
}

export function filmOverview(w,h) {
  const portrait=w<700;
  const scale=Math.max(w/width,h/height);
  const readingCenter=(h-(portrait?192:135))/2;
  const y=Math.max(h-height*scale,Math.min(0,readingCenter-(gateY+gateHeight/2)*scale));
  return {x:(w-width*scale)/2,y,scale};
}

export function filmGateRect(w,h) {
  const {x,y,scale}=filmOverview(w,h);
  return {left:x+gateX*scale,top:y+gateY*scale,width:gateWidth*scale,height:gateHeight*scale};
}

export function placeFilmOverview(root,w,h) {
  const {x,y,scale}=filmOverview(w,h);
  root.querySelector('.film-gate-world').style.transform=`translate(${x}px,${y}px) scale(${scale})`;
}

export function filmCopy(project, index) {
  return `<p class="eyebrow">Frame ${String(index+1).padStart(2,'0')} / ${films.length} · ${esc(project.yearStatus)}</p><h2>${esc(project.title)}</h2><p class="film-description">${esc(project.description)}</p><p class="role-line">${project.roles.map(esc).join(' · ')}</p><div class="film-source-actions">${sourceLinks(project)}<a class="text-link" href="${project.detailRoute}">Film project ↗</a></div>`;
}

export function filmTransportSample(progress, from, to) {
  const p = Math.max(0, Math.min(1, progress));
  const travel = Math.max(0, Math.min(1, (p-.16)/.65));
  const eased = travel * travel * (3-2*travel);
  const release=Math.min(1,p/.16),registration=Math.max(0,Math.min(1,(p-.81)/.13));
  return {
    position: from+(to-from)*eased,
    phase: p < .16 ? 'release' : p < .81 ? 'transport' : p < .94 ? 'register' : 'registered',
    slack: Math.sin(travel*Math.PI)*Math.sign(to-from),
    grip:p<.16?1-release*release*(3-2*release):registration*registration*(3-2*registration),
  };
}

function filmFrame(project,index) {
  return `<div class="film-gate-frame-item" data-film-frame style="top:${400+gateY-index*pitch}px">
    <img src="${esc(project.artwork)}" alt="">
    <span class="gate-frame-number" aria-hidden="true">${String(index+1).padStart(2,'0')}</span>
    <button class="gate-frame-button" type="button" role="option" aria-label="${esc(project.title)}" aria-selected="${index===0}" tabindex="${index===0?0:-1}"></button>
  </div>`;
}

function leaderFrame(index) {
  return `<div class="film-gate-frame-item film-leader" data-film-leader aria-hidden="true" style="top:${400+gateY-index*pitch}px"><span>UNEXPOSED / LEADER</span><i>＋</i></div>`;
}

function loopPath(slack=0) {
  return FILM_GATE.loops.map(([start,...curves],i)=>
    `M${start.join(' ')} ${curves.map(([x,y,endX,endY],n)=>
      `Q${x} ${n===0?y+slack*8*(i?-1:1):y} ${endX} ${endY}`).join(' ')}`).join(' ');
}

function driveOverlay() {
  const spindles = [...FILM_GATE.reels,...FILM_GATE.guides];
  return `<svg class="gate-drive-overlay" viewBox="0 0 ${width} ${height}" aria-hidden="true">
    <path class="film-loop-edge" d="${loopPath()}"/>
    <path class="film-loop-stock" d="${loopPath()}"/>
    <path class="film-loop-holes" d="${loopPath()}"/>
    ${spindles.map(([x,y,r],index) => `<g class="gate-spindle" data-spindle="${index}" style="transform-origin:${x}px ${y}px">
      ${[0,120,240].map(angle=>`<path d="M${x} ${y-r+8} V${y-(index<2?20:8)}" stroke="${index<2?'#ad8e6b':'#e1ae70'}" stroke-width="${index<2?8:3}" stroke-linecap="round" transform="rotate(${angle} ${x} ${y})"/>`).join('')}
    </g>`).join('')}
    <text x="208" y="42" text-anchor="middle">01 / SUPPLY</text>
    <text x="751" y="637" text-anchor="middle">02 / TAKE-UP</text>
  </svg>`;
}

export function renderFilms({preview=false}={}) {
  return `<main${preview?'':' id="main"'} class="game-scene object-scene films-scene film-gate-scene" data-scene="films" tabindex="-1" aria-labelledby="films-title">
    <h1 id="films-title" class="visually-hidden">Film Archive</h1>
    <section class="film-gate-session" data-object-interface="camera" data-film-browser data-category-interface aria-label="Studio 65 film transport" data-phase="registered">
      <div class="film-gate-viewport">
        <canvas class="film-mechanism-model" data-film-model aria-hidden="true"></canvas>
        <div class="film-gate-world" style="width:${width}px;height:${height}px;--gate-x:${gateX}px;--gate-y:${gateY}px;--gate-width:${gateWidth}px;--gate-height:${gateHeight}px;--frame-pitch:${pitch}px">
          ${driveOverlay()}
          <div class="film-stock-channel">
            <div class="film-stock" role="listbox" aria-label="Film projects" aria-orientation="vertical">${filmSlots(films.length).map(slot=>slot.projectIndex===null?leaderFrame(slot.index):filmFrame(films[slot.projectIndex],slot.index)).join('')}</div>
          </div>
          <div class="fixed-film-gate" aria-hidden="true"><span class="gate-registration"></span></div>
        </div>
      </div>
      <div class="gate-deck">
        <div class="gate-control-strip">
          <button class="gate-prev" type="button" aria-label="Previous film" disabled>←</button>
          <span class="gate-state" aria-hidden="true">GATE REGISTERED</span>
          <button class="gate-next" type="button" aria-label="Next film">→</button>
          <button class="gate-open" type="button">Play selected film ↗</button>
        </div>
        <div class="film-copy" aria-live="polite">${filmCopy(films[0],0)}</div>
      </div>
      <button class="gate-close" type="button" hidden>← Back to gate</button>
      <a class="gate-playback-source text-link" target="_blank" rel="noopener noreferrer" hidden>Open original ↗</a>
    </section>
  </main>`;
}

export function mountFilms(root) {
  const lifecycle = sceneController();
  const {signal} = lifecycle;
  const surface = root.querySelector('[data-film-browser]');
  const world = surface.querySelector('.film-gate-world');
  const viewport = surface.querySelector('.film-gate-viewport');
  const stock = surface.querySelector('.film-stock');
  const frames = $$('[data-film-frame]',surface);
  const buttons = $$('.gate-frame-button',surface);
  const spindles = $$('.gate-spindle',surface);
  const holes = surface.querySelector('.film-loop-holes');
  const loops = $$('.film-loop-stock,.film-loop-holes,.film-loop-edge',surface);
  const previous = surface.querySelector('.gate-prev');
  const next = surface.querySelector('.gate-next');
  const open = surface.querySelector('.gate-open');
  const close = surface.querySelector('.gate-close');
  const source = surface.querySelector('.gate-playback-source');
  const deck = surface.querySelector('.gate-deck');
  const output = surface.querySelector('.film-copy');
  const label = surface.querySelector('.gate-state');
  let index = 0;
  let state = 'overview';
  let raf;
  let media;
  let zoomAnimation;
  let swipe;
  let ignoreClickUntil = 0;
  let nativeView;
  let nativeFollowFrame;
  let nativePosition=0;
  let nativePhase='registered';
  let nativeDrive=0;
  let nativeGrip=1;
  let nativeProjectionKey;
  let finishProjection;

  function syncNative() {
    if (!nativeView||nativeView.disposed) return;
    const transform=getComputedStyle(world).transform;
    const key=[transform,viewport.clientWidth,viewport.clientHeight,nativePosition,nativePhase,nativeDrive,nativeGrip].join('/');
    if (key===nativeProjectionKey) return;
    nativeProjectionKey=key;
    const matrix=new DOMMatrix(transform);
    nativeView.resize(viewport.clientWidth,viewport.clientHeight);
    nativeView.frontProjection({x:matrix.e,y:matrix.f,scale:matrix.a});
    nativeView.cover(1);
    nativeView.transport(nativePosition,nativePhase,nativeDrive,nativeGrip);
    nativeView.render();
  }
  loadLiveCamera().then(async asset=>{
    if (signal.aborted) return;
    nativeView=new LiveCameraView(surface.querySelector('[data-film-model]'),asset);
    await nativeView.prepareFilms(films);
    if (signal.aborted) {nativeView.dispose();return;}
    // A resize can paint the bare mechanism while textures load. Repaint once
    // after the film meshes arrive even when the camera pose has not changed.
    nativeProjectionKey=undefined;
    syncNative();
    surface.classList.add('film-native-ready');
  }).catch(error=>console.warn('Live film mechanism could not load.',error));

  const format = (x,y,s) => `translate(${x}px,${y}px) scale(${s})`;
  function projection(playback=false) {
    const w=viewport.clientWidth, h=viewport.clientHeight;
    if (playback) {
      const scale=Math.min(w/gateWidth,h/gateHeight);
      return format(w/2-(gateX+gateWidth/2)*scale,h/2-(gateY+gateHeight/2)*scale,scale);
    }
    const {x,y,scale}=filmOverview(w,h);
    return format(x,y,scale);
  }

  function layout() {
    zoomAnimation?.cancel();
    world.style.transform=projection(state==='playback'||state==='opening');
    syncNative();
  }
  const observer=new ResizeObserver(layout);
  observer.observe(viewport);
  layout();

  function paint(sample) {
    nativePosition=sample.position;
    nativePhase=sample.phase;
    nativeGrip=sample.grip??(sample.phase==='registered'?1:0);
    if(sample.drive!==undefined)nativeDrive=sample.drive;
    const px=sample.position*pitch;
    stock.style.transform=`translateY(${px}px)`;
    holes.style.strokeDashoffset=String(px);
    loops.forEach(loop=>loop.setAttribute('d',loopPath(sample.slack)));
    spindles.forEach((part,i)=>{part.style.transform=`rotate(${px*(i<2?.74:2.3)*(i===1||i===4?-1:1)}deg)`;});
    surface.dataset.phase=sample.phase;
    surface.dataset.drive=String(nativeDrive);
    label.textContent=sample.phase==='registered'?'GATE REGISTERED':sample.phase==='projecting'?'PROJECTOR RUNNING':sample.phase==='transport'?'ADVANCING FILM':sample.phase==='register'?'REGISTERING FRAME':'RELEASING FRAME';
    syncNative();
  }

  function commit(selected, focus) {
    index=selected;
    paint(filmTransportSample(1,index,index));
    buttons.forEach((button,i)=>{
      button.tabIndex=i===index?0:-1;
      button.setAttribute('aria-selected',String(i===index));
    });
    previous.disabled=index===0;
    next.disabled=index===films.length-1;
    open.disabled=!filmPlaybackUrl(films[index]);
    open.textContent=open.disabled?'Video coming soon':'Play selected film ↗';
    output.innerHTML=filmCopy(films[index],index);
    if(focus && !document.body.classList.contains('menu-open'))buttons[index].focus({preventScroll:true});
  }

  function select(target,focus=false) {
    if(state!=='overview')return;
    target=Math.max(0,Math.min(films.length-1,target));
    if(target===index)return;
    if(isReducedMotion()){commit(target,focus);return;}
    state='transport';
    open.disabled=true;
    const from=index;
    let elapsed=0,last;
    const duration=850*Math.abs(target-from);
    function tick(now){
      if(signal.aborted)return;
      if(isReducedMotion()||elapsed>=duration){
        state='overview';
        commit(target,focus);
        return;
      }
      if(last!==undefined&&!document.hidden&&!document.body.classList.contains('menu-open')){
        elapsed+=Math.min(40,now-last);
      }
      last=now;
      paint(filmTransportSample(elapsed/duration,from,target));
      raf=requestAnimationFrame(tick);
    }
    raf=requestAnimationFrame(tick);
  }

  async function zoom(toPlayback) {
    const start=getComputedStyle(world).transform;
    const end=projection(toPlayback);
    world.style.transform=end;
    if(isReducedMotion()||!world.animate){syncNative();return;}
    const animation=world.animate([{transform:start},{transform:end}],{
      duration:toPlayback?710:630,easing:'cubic-bezier(.42,0,.19,1)'
    });
    zoomAnimation=animation;
    syncMotion();
    const follow=()=>{
      syncNative();
      if (zoomAnimation===animation&&!signal.aborted) nativeFollowFrame=requestAnimationFrame(follow);
    };
    follow();
    await animation.finished.catch(()=>{});
    if(zoomAnimation===animation)zoomAnimation=undefined;
    cancelAnimationFrame(nativeFollowFrame);
    syncNative();
  }

  async function runProjector() {
    const start=new DOMMatrix(getComputedStyle(world).transform);
    const initialWidth=viewport.clientWidth,initialHeight=viewport.clientHeight;
    const initialDrive=nativeDrive;
    let elapsed=0,last;
    const settle=()=>{
      world.style.transform=projection(true);
      paint({position:index,phase:'registered',drive:initialDrive+6,slack:0});
    };
    if(isReducedMotion()){settle();return;}
    const pause=document.createElement('button'),pauseEvents=new AbortController();
    pause.type='button';pause.className='game-control film-projector-pause';
    pause.textContent='Pause';pause.setAttribute('aria-label','Pause projector');pause.setAttribute('aria-pressed','false');
    root.closest('[data-game-shell]')?.querySelector('.game-hud-group')?.append(pause);
    let paused=false;
    pause.addEventListener('click',()=>{
      paused=!paused;pause.textContent=paused?'Resume':'Pause';
      pause.setAttribute('aria-label',paused?'Resume projector':'Pause projector');pause.setAttribute('aria-pressed',String(paused));
    },{signal:pauseEvents.signal});
    try {await new Promise(resolve=>{
      finishProjection=()=>{cancelAnimationFrame(raf);resolve();};
      const tick=now=>{
        if(signal.aborted){finishProjection();return;}
        if(last!==undefined&&!paused&&!document.hidden&&!document.body.classList.contains('menu-open'))elapsed+=Math.min(40,now-last);
        last=now;
        if(isReducedMotion()||viewport.clientWidth!==initialWidth||viewport.clientHeight!==initialHeight||elapsed>=1450){settle();finishProjection();return;}
        const sample=projectionSample(elapsed/1450),end=new DOMMatrix(projection(true));
        const blend=(a,b)=>a+(b-a)*sample.zoom;
        world.style.transform=format(blend(start.e,end.e),blend(start.f,end.f),blend(start.a,end.a));
        paint({position:index,phase:sample.phase,drive:initialDrive+sample.drive,slack:0});
        raf=requestAnimationFrame(tick);
      };
      raf=requestAnimationFrame(tick);
    });}finally{finishProjection=undefined;pauseEvents.abort();pause.remove();}
  }

  function syncMotion(){
    if(!zoomAnimation)return;
    if(isReducedMotion())zoomAnimation.cancel();
    else if(document.hidden||document.body.classList.contains('menu-open'))zoomAnimation.pause();
    else if(zoomAnimation.playState==='paused')zoomAnimation.play();
  }
  const motionObserver=new MutationObserver(syncMotion);
  motionObserver.observe(document.body,{attributes:true,attributeFilter:['class']});
  motionObserver.observe(document.documentElement,{attributes:true,attributeFilter:['data-motion']});
  document.addEventListener('visibilitychange',syncMotion,{signal});
  matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',syncMotion,{signal});

  async function enterPlayback(){
    if(state!=='overview'||!filmPlaybackUrl(films[index]))return;
    state='opening';
    surface.dataset.zooming='true';
    surface.dataset.phase='exposure';
    deck.inert=true;
    stock.inert=true;
    await runProjector();
    if(signal.aborted)return;
    state='playback';
    surface.dataset.playback='true';
    surface.dataset.phase='registered';
    const project=films[index];
    const drive=project.externalLinks.find(link=>/^https:\/\/drive\.google\.com\/file\/d\/[^/]+\/preview(?:\?|$)/.test(link.url));
    if(drive){
      media=document.createElement('iframe');
      media.className='gate-film-player';
      media.title=project.title;
      media.allow='autoplay; fullscreen';
      media.allowFullscreen=true;
      media.addEventListener('load',()=>{if(media)media.dataset.ready='true';},{once:true,signal});
      media.src=filmPlaybackUrl(project);
      frames[index].append(media);
      source.href=drive.url.replace('/preview','/view');
      source.target='_blank';
      source.textContent='Open original ↗';
    }else{
      source.href=project.detailRoute;
      source.removeAttribute('target');
      source.textContent='Open project ↗';
    }
    source.hidden=false;
    close.hidden=false;
    close.focus({preventScroll:true});
  }

  async function returnToGate(){
    if(state!=='playback')return;
    state='closing';
    close.hidden=true;
    source.hidden=true;
    delete surface.dataset.playback;
    // The iframe stays on the same frame during the return and is then unloaded.
    await zoom(false);
    if(signal.aborted)return;
    media?.remove();
    media=undefined;
    deck.inert=false;
    stock.inert=false;
    state='overview';
    delete surface.dataset.zooming;
    buttons[index].focus({preventScroll:true});
  }

  previous.addEventListener('click',()=>select(index-1,true),{signal});
  next.addEventListener('click',()=>select(index+1,true),{signal});
  open.addEventListener('click',enterPlayback,{signal});
  close.addEventListener('click',returnToGate,{signal});
  buttons.forEach((button,i)=>button.addEventListener('click',event=>{
    if(event.detail&&performance.now()<ignoreClickUntil)return;
    if(i===index)enterPlayback();
    else select(i,true);
  },{signal}));
  viewport.addEventListener('click',event=>{
    if(state!=='overview'||performance.now()<ignoreClickUntil||event.target.closest('button,a'))return;
    const rect=viewport.getBoundingClientRect(),target=nativeView?.hitProject(event.clientX-rect.left,event.clientY-rect.top);
    if(target===null||target===undefined)return;
    if(target===index)enterPlayback();else select(target,true);
  },{signal});
  surface.addEventListener('keydown',event=>{
    if(event.altKey||event.ctrlKey||event.metaKey||state!=='overview')return;
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key))return;
    event.preventDefault();
    const target=event.key==='Home'?0:event.key==='End'?films.length-1:
      index+(['ArrowLeft','ArrowUp'].includes(event.key)?-1:1);
    select(target,true);
  },{signal});
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&state==='playback'&&!document.body.classList.contains('menu-open')){
      event.preventDefault();
      event.stopImmediatePropagation();
      returnToGate();
    }
  },{capture:true,signal});
  viewport.addEventListener('pointerdown',event=>{
    if(event.pointerType==='touch'&&state==='overview')swipe={id:event.pointerId,x:event.clientX,y:event.clientY};
  },{signal});
  viewport.addEventListener('pointercancel',()=>{swipe=undefined;},{signal});
  viewport.addEventListener('pointerup',event=>{
    if(!swipe||swipe.id!==event.pointerId)return;
    const dx=event.clientX-swipe.x,dy=event.clientY-swipe.y;
    const delta=Math.abs(dy)>Math.abs(dx)?dy:dx;
    swipe=undefined;
    if(Math.abs(delta)<42)return;
    ignoreClickUntil=performance.now()+400;
    select(index+(Math.abs(dy)>Math.abs(dx)?(dy>0?1:-1):(dx<0?1:-1)),true);
  },{signal});
  signal.addEventListener('abort',()=>{
    observer.disconnect();
    motionObserver.disconnect();
    cancelAnimationFrame(raf);
    finishProjection?.();
    cancelAnimationFrame(nativeFollowFrame);
    nativeView?.dispose();
    zoomAnimation?.cancel();
    media?.remove();
  },{once:true});
  return lifecycle;
}
