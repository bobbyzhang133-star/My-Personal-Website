import { isReducedMotion } from '../utils.js?v=8273376a5e68';
import { filmOverview } from './films.js?v=8273376a5e68';
import { projects } from '../content.js?v=8273376a5e68';
import { getRoomCamera, prepareRoomCamera } from './camera-live.js?v=8273376a5e68';

const ease=value=>{
  const t=Math.max(0,Math.min(1,value));
  return t*t*(3-2*t);
};
const between=(value,from,to)=>ease((value-from)/(to-from));

export function filmOpeningSample(progress,opening=true) {
  const p=Math.max(0,Math.min(1,opening?progress:1-progress));
  return {
    progress:p,approach:between(p,0,.15),turn:between(p,.15,.42),
    cover:between(p,.44,.66),zoom:between(p,.70,1),
    phase:p<.15?'approach':p<.42?'turn':p<.70?'uncover':'gate',
  };
}

export async function moveFilmTransport(source,layer,{opening,signal,preview}) {
  if (!source||!layer||signal.aborted||isReducedMotion()) return;
  const room=source.closest('[data-scene="home"]');
  await prepareRoomCamera(room,{signal});
  const view=getRoomCamera(source);
  if (!view||signal.aborted||view.disposed) return;
  await view.prepareFilms(projects.filter(project=>project.category==='films'));
  if (signal.aborted||view.disposed||isReducedMotion()) return;
  const rect=source.getBoundingClientRect();
  if (!rect.width||!rect.height) return;
  const width=innerWidth,height=innerHeight,destination=filmOverview(width,height);
  const canvas=view.canvas,parent=canvas.parentNode,next=canvas.nextSibling;
  const originalStyle=canvas.style.cssText,originalClass=canvas.className;
  const world=preview.querySelector('.film-gate-world');
  const deck=preview.querySelector('.gate-deck');
  const stock=preview.querySelector('.film-stock');
  const position=Number(stock.style.transform.match(/translateY\(([-\d.]+)/)?.[1]||0)/view.asset.model.gate.pitch;
  const drive=Number(preview.querySelector('[data-film-browser]')?.dataset.drive||0);
  view.transport(position,'registered',drive);
  preview.classList.add('film-machine-preview','film-native-ready');
  canvas.classList.add('film-machine-assembly','camera-live-transition');
  Object.assign(canvas.style,{position:'absolute',left:'0',top:'0',width:'100%',height:'100%',transform:'none'});
  view.resize(width,height);
  layer.append(canvas,preview);
  layer.style.display='block';
  const visibility=source.style.visibility;
  source.style.visibility='hidden';
  const shell=room.closest('[data-game-shell]');
  const hud=shell.querySelector('.game-hud'),hudWasInert=hud.inert;
  hud.inert=false;
  const local=new AbortController();
  const pause=document.createElement('button');
  pause.type='button';
  pause.className='game-control film-machine-pause';
  pause.textContent='Pause';
  pause.setAttribute('aria-pressed','false');
  const action=opening?'camera opening':'camera return';
  pause.setAttribute('aria-label','Pause '+action);
  hud.querySelector('.game-hud-group').append(pause);
  let paused=false;
  pause.addEventListener('click',()=>{
    paused=!paused;
    pause.textContent=paused?'Resume':'Pause';
    pause.setAttribute('aria-pressed',String(paused));
    pause.setAttribute('aria-label',(paused?'Resume ':'Pause ')+action);
  },{signal:local.signal});
  let elapsed=0,last,raf,resolveMotion;
  const duration=opening?3600:2900;
  const paint=sample=>{
    if (canvas.dataset.progress===sample.progress.toFixed(4)) return;
    canvas.dataset.phase=sample.phase;
    canvas.dataset.progress=sample.progress.toFixed(4);
    const projected=view.opening(sample,rect,destination);
    world.style.transform=`translate(${projected.x}px,${projected.y}px) scale(${projected.scale})`;
    // Project artwork is already textured onto the actual film meshes.
    preview.style.visibility=sample.progress<.70?'hidden':'visible';
    deck.style.opacity=String(between(sample.progress,.95,1));
  };
  const finish=()=>{
    cancelAnimationFrame(raf);
    resolveMotion?.();
  };
  const tick=now=>{
    if (signal.aborted||isReducedMotion()||view.disposed) {finish();return;}
    if (last!==undefined&&!paused&&!document.hidden&&!document.body.classList.contains('menu-open')) elapsed+=Math.min(50,now-last);
    last=now;
    paint(filmOpeningSample(elapsed/duration,opening));
    if (elapsed>=duration) finish();
    else raf=requestAnimationFrame(tick);
  };
  const preference=matchMedia('(prefers-reduced-motion: reduce)');
  const observer=new MutationObserver(()=>{if(isReducedMotion())finish();});
  observer.observe(document.documentElement,{attributes:true,attributeFilter:['data-motion']});
  signal.addEventListener('abort',finish,{once:true});
  window.addEventListener('resize',finish,{signal:local.signal});
  preference.addEventListener('change',finish,{signal:local.signal});
  try {
    paint(filmOpeningSample(0,opening));
    await new Promise(resolve=>{resolveMotion=resolve;raf=requestAnimationFrame(tick);});
  } finally {
    cancelAnimationFrame(raf);
    observer.disconnect();
    local.abort();
    signal.removeEventListener('abort',finish);
    parent.insertBefore(canvas,next);
    canvas.style.cssText=originalStyle;
    canvas.className=originalClass;
    delete canvas.dataset.phase;delete canvas.dataset.progress;
    if (!view.disposed) view.room();
    source.style.visibility=visibility;
    if (shell.getAttribute('aria-busy')==='true') hud.inert=hudWasInert;
    if (document.activeElement===pause) hud.querySelector('.menu-button').focus({preventScroll:true});
    pause.remove();preview.remove();
    if (!layer.childElementCount) layer.style.removeProperty('display');
  }
}
