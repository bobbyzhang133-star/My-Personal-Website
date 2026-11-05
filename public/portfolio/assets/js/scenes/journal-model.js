import { isReducedMotion } from '../utils.js?v=3fe186ecf43b';
import { JOURNAL_COVER_QUAD } from './journal-geometry.js?v=3fe186ecf43b';

import { drawJournalModel, journalRestDepth, journalReadingQuads } from './journal-renderer.js?v=3fe186ecf43b';
import { mountJournalReadingPages } from './journal-pages.js?v=3fe186ecf43b';
export { projectJournalPoint, journalRestDepth } from './journal-renderer.js?v=3fe186ecf43b';

export const JOURNAL_MODEL_ASSET='/assets/room/journal-3d/approved-v1/';
export const JOURNAL_MODEL_ID=`blender-journal-${JOURNAL_MODEL_ASSET.split('/').at(-2)}`;
const ASSET=JOURNAL_MODEL_ASSET;
let assets,loadedAssets,dimensions={width:.28,height:.32};
export const getLoadedJournalModel=()=>loadedAssets||null;
const clamp=value=>Math.max(0,Math.min(1,value));
const mix=(a,b,t)=>a+(b-a)*t;
export function sampleJournalAction(samples,time) {
  const t=clamp(time)*(samples.length-1),index=Math.min(samples.length-2,Math.floor(t)),fraction=t-index;
  const a=samples[index],b=samples[index+1];
  return {pickup:mix(a.pickup,b.pickup,fraction),hinge:mix(a.hinge,b.hinge,fraction),lift:mix(a.lift,b.lift,fraction)};
}
export function loadJournalModel() {
  if(typeof Image==='undefined')return Promise.resolve(null);
  if(!assets)assets=(async()=>{
    const response=await fetch(`${ASSET}journal.mesh.json`);
    if(!response.ok)throw new Error('Journal model unavailable');
    const model=await response.json();
    if(!model.meshes?.length||!model.animation||model.animation.length<2||!model.dimensions?.width||!model.dimensions?.height)throw new Error('Invalid journal model');
    const texture=new Image();texture.src=`${ASSET}cover-source.png`;await texture.decode();
    dimensions=model.dimensions;loadedAssets={model,texture};return loadedAssets;
  })().catch(()=>{assets=null;loadedAssets=null;return null;});
  return assets;
}

// Fit one unchanged physical book aspect, rather than stretching its geometry
// to the previous webpage-sized panel. Page contents retain their own scroll.
export function fitJournalModelReader(root) {
  const shell=root?.querySelector('.book-object-shell'),viewport=root?.querySelector('[data-book-viewport]');
  if(!shell||!viewport||['opening','closing'].includes(shell.dataset.journalPose))return;
  for(const key of ['width','height','left','right','top','bottom'])shell.style.removeProperty(key);
  const scene=root.getBoundingClientRect(),available=shell.getBoundingClientRect(),paper=viewport.getBoundingClientRect();
  if(!paper.width||!paper.height)return;
  const single=root.querySelector('[data-book]')?.dataset.bookMode==='single';
  const horizontal=available.width-paper.width,footer=available.height-paper.height,ratio=(single?1:2)*dimensions.width/dimensions.height;
  const height=Math.min(paper.height,paper.width/ratio),width=height*ratio;
  Object.assign(shell.style,{width:`${width+horizontal}px`,height:`${height+footer}px`,left:`${(scene.width-width-horizontal)/2}px`,right:'auto',top:`${available.top-scene.top+(available.height-height-footer)/2}px`,bottom:'auto'});
  shell.style.setProperty('--journal-board-bottom',`${footer-8}px`);
}

export async function animateBlenderJournal(root,backdrop,{opening}) {
  const waitingBody=root.querySelector('.journal-body'),waitingSource=backdrop?.querySelector('.object-research');
  if(opening){root.dataset.bookModelLoading='true';if(waitingBody)waitingBody.style.opacity='0';if(waitingSource)delete waitingSource.dataset.bookLifted;}
  const data=await loadJournalModel();delete root.dataset.bookModelLoading;
  const restoreWaiting=()=>waitingBody?.style.removeProperty('opacity');
  if(!root.isConnected){restoreWaiting();return true;}
  if(isReducedMotion()){restoreWaiting();if(waitingSource)waitingSource.dataset.bookLifted='true';return true;}
  if(!data){restoreWaiting();return false;}
  fitJournalModelReader(root);
  const source=backdrop?.querySelector('.object-research .master-object-image'),shell=root.querySelector('.book-object-shell'),paper=root.querySelector('[data-book-viewport]');
  if(!source||!shell||!paper){restoreWaiting();return false;}
  const area=root.getBoundingClientRect(),art=source.getBoundingClientRect(),leaf=paper.getBoundingClientRect();
  const single=root.querySelector('[data-book]')?.dataset.bookMode==='single',width=leaf.width/(single?1:2),x=leaf.left-area.left+(single?0:width),y=leaf.top-area.top;
  const table=(data.model.coverQuad||JOURNAL_COVER_QUAD).map(([u,v])=>[art.left-area.left+u/data.texture.width*art.width,art.top-area.top+v/data.texture.height*art.height]);
  const {width:W,height:H}=data.model.dimensions,[x0,y0,x1,y1]=data.model.coverBounds||[0,0,W,H];
  const held=[[x0,y0],[x1,y0],[x1,y1],[x0,y1]].map(([u,v])=>[x+u/W*width,y+v/H*leaf.height]);
  const restDepth=journalRestDepth(data.model).map((value,axis)=>value*(axis?art.height/data.texture.height:art.width/data.texture.width));
  const canvas=document.createElement('canvas');canvas.className='journal-model-canvas';canvas.setAttribute('aria-hidden','true');
  const coverCanvas=document.createElement('canvas');coverCanvas.className='journal-model-canvas journal-model-cover-canvas';coverCanvas.setAttribute('aria-hidden','true');
  const dpr=Math.min(devicePixelRatio||1,1.5);canvas.width=Math.round(area.width*dpr);canvas.height=Math.round(area.height*dpr);
  coverCanvas.width=canvas.width;coverCanvas.height=canvas.height;
  const ctx=canvas.getContext('2d',{alpha:true}),coverCtx=coverCanvas.getContext('2d',{alpha:true});
  if(!ctx||!coverCtx){restoreWaiting();return false;}
  for(const context of [ctx,coverCtx]){context.scale(dpr,dpr);context.imageSmoothingEnabled=false;}
  const reading=mountJournalReadingPages(root,{width,height:leaf.height,single});
  root.append(canvas,coverCanvas);root.dataset.bookRenderer='blender';root.dataset.bookModel=JOURNAL_MODEL_ID;root.dataset.bookModelTriangles=String(data.model.meshes.reduce((sum,mesh)=>sum+mesh.positions.length/9,0));
  root.dataset.bookTextMode='surface-attached';
  delete root.dataset.bookMotionStop;
  shell.dataset.journalPose=opening?'opening':'closing';source.closest('[data-room-object]').dataset.bookLifted='true';
  const body=root.querySelector('.journal-body'),controller=new AbortController();let frame=0,elapsed=0,last=null,drawTime=0,drawCount=0;
  body.style.opacity='0';
  const duration=opening?2050:1800;
  const paint=time=>{
    const action=sampleJournalAction(data.model.animation,time),start=performance.now();
    drawJournalModel(ctx,data.model,data.texture,table,held,restDepth,action,area,{part:'body'});
    drawJournalModel(coverCtx,data.model,data.texture,table,held,restDepth,action,area,{part:'front'});
    reading.update(journalReadingQuads(data.model,table,held,restDepth,action));
    drawTime+=performance.now()-start;drawCount++;root.dataset.bookMotionProgress=time.toFixed(3);
  };
  paint(opening?0:1);
  await new Promise(resolve=>{
    const finish=(reason='complete')=>{root.dataset.bookMotionStop=reason;cancelAnimationFrame(frame);controller.abort();canvas.remove();coverCanvas.remove();reading.remove();body.style.removeProperty('opacity');shell.dataset.journalPose=opening?'open':'closed';root.dataset.bookTextMode='reader';root.dataset.bookRenderMs=(drawTime/Math.max(1,drawCount)).toFixed(2);root.dataset.bookRenderFrames=String(drawCount);resolve();};
    window.addEventListener('resize',()=>{const rect=root.getBoundingClientRect();if(Math.abs(rect.width-area.width)>.5||Math.abs(rect.height-area.height)>.5)finish('resize');},{signal:controller.signal});
    document.addEventListener('visibilitychange',()=>{last=null;root.dataset.bookMotionPaused=String(document.hidden);},{signal:controller.signal});
    const tick=now=>{
      if(!root.isConnected||isReducedMotion()){finish(!root.isConnected?'detached':'reduced-motion');return;}
      const paused=document.hidden||document.body.classList.contains('menu-open');root.dataset.bookMotionPaused=String(paused);
      if(last!==null&&!paused)elapsed+=Math.min(now-last,80);last=now;
      const progress=clamp(elapsed/duration);if(!paused)paint(opening?progress:1-progress);
      if(progress>=1)finish();else frame=requestAnimationFrame(tick);
    };frame=requestAnimationFrame(tick);
  });
  fitJournalModelReader(root);return true;
}
