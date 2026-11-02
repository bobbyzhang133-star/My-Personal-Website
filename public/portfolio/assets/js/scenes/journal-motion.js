import { isReducedMotion, nextFrame } from '../utils.js?v=260ff82f01eb';

import { JOURNAL_COVER_QUAD, journalProjection, journalMatrix } from './journal-geometry.js?v=260ff82f01eb';
import { animateBlenderJournal, fitJournalModelReader } from './journal-model.js?v=260ff82f01eb';
export { JOURNAL_COVER_QUAD, journalProjection, journalMatrix } from './journal-geometry.js?v=260ff82f01eb';
const rectangle = (x,y,w,h) => [[x,y],[x+w,y],[x+w,y+h],[x,y+h]];

function sourcePlane(face = false) {
  return `<span class="journal-source-plane" data-journal-plane${face?' data-journal-face':''} aria-hidden="true"><img src="/assets/room/master/research.svg" width="354" height="112" alt=""><img src="/assets/room/master/research-mark.svg" width="354" height="112" alt=""></span>`;
}
export function journalMechanism(backPage) {
  return `<div class="journal-closed-edges" data-journal-edges aria-hidden="true">${sourcePlane()}</div><div class="journal-front-cover" data-journal-cover aria-hidden="true" inert><div class="journal-cover-front">${sourcePlane(true)}</div><div class="journal-cover-inside flipbook" data-journal-inside>${backPage}</div></div>`;
}

export function layoutJournal(root) {
  const shell=root?.querySelector('.book-object-shell'),viewport=root?.querySelector('[data-book-viewport]');
  if(!shell||!viewport||['opening','closing'].includes(shell.dataset.journalPose)) return null;
  fitJournalModelReader(root);
  const box=shell.getBoundingClientRect(),paper=viewport.getBoundingClientRect();
  if(!box.width||!paper.width||!paper.height) return null;
  const single=root.querySelector('[data-book]')?.dataset.bookMode==='single';
  const width=paper.width/(single?1:2),height=paper.height;
  const x=paper.left-box.left+(single?0:width),y=paper.top-box.top;
  root.querySelectorAll('[data-journal-cover],[data-journal-edges]').forEach(element=>Object.assign(element.style,{left:`${x}px`,top:`${y}px`,width:`${width}px`,height:`${height}px`}));
  const normalized=journalMatrix(journalProjection(JOURNAL_COVER_QUAD,rectangle(0,0,width,height)));
  root.querySelectorAll('[data-journal-plane]').forEach(element=>{element.style.transform=normalized;});
  return {shell,box,leaf:rectangle(x,y,width,height),single};
}

export async function moveJournal(root, backdrop, { opening, play, track }) {
  if(isReducedMotion()) return;
  const geometry=layoutJournal(root),source=backdrop?.querySelector('.object-research .master-object-image');
  if(!geometry||!source) return;
  if(await animateBlenderJournal(root,backdrop,{opening}))return;
  const {shell,box,leaf,single}=geometry;
  const cover=root.querySelector('[data-journal-cover]'),edges=root.querySelector('[data-journal-edges]');
  const body=root.querySelector('.journal-body'),controls=root.querySelector('.book-reader-controls'),help=root.querySelector('.book-help');
  const art=source.getBoundingClientRect();
  if(!art.width||!art.height) return;
  const table=JOURNAL_COVER_QUAD.map(([x,y])=>[art.left-box.left+x/354*art.width,art.top-box.top+y/112*art.height]);
  const lift=table.map(([x,y],i)=>[x+(leaf[i][0]-x)*.52,y+(leaf[i][1]-y)*.52-28]);
  const transform=quad=>journalMatrix(journalProjection(leaf,quad));
  const tablePose=transform(table),liftPose=transform(lift);
  const openPose='matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1)';
  const closedClip=single?'inset(0 0 0 0)':'inset(0 0 0 50%)';
  const inside=root.querySelector('[data-journal-inside]'),leftPage=root.querySelector('[data-book-pages]')?.firstElementChild;
  if(leftPage&&inside) {
    inside.innerHTML=leftPage.outerHTML;
    const originalText=leftPage.querySelector('.book-page-content'),flyleafText=inside.querySelector('.book-page-content');
    if(originalText&&flyleafText)flyleafText.scrollTop=originalText.scrollTop;
  }
  shell.dataset.journalPose=opening?'opening':'closing';
  source.closest('[data-room-object]').dataset.bookLifted='true';
  for(const element of [shell,cover,edges,body,controls,help]) track(element);
  Object.assign(shell.style,{transform:opening?tablePose:openPose,transformOrigin:'0 0',willChange:'transform'});
  cover.style.transform=opening?'rotateY(0deg)':'rotateY(-180deg)';
  edges.style.opacity=opening?'1':'0';
  body.style.clipPath=opening?closedClip:'inset(0 0 0 0)';
  controls.style.opacity=opening?'0':'1';help.style.opacity=opening?'0':'1';
  const elements=[shell,cover,edges,body,controls,help],resizeController=new AbortController();
  let resized=false;
  window.addEventListener('resize',()=>{resized=true;elements.forEach(element=>element.getAnimations?.().forEach(animation=>animation.cancel()));},{once:true,signal:resizeController.signal});
  await nextFrame();
  const duration=opening?1420:1220,easing='cubic-bezier(.4,0,.16,1)';
  const outer=[{transform:tablePose},{transform:liftPose,offset:.46},{transform:openPose}];
  const hinge=[{transform:'rotateY(0deg)',offset:0},{transform:'rotateY(0deg)',offset:.28},{transform:'rotateY(-180deg)',offset:1}];
  const pageClip=[{clipPath:closedClip,offset:0},{clipPath:closedClip,offset:.4},{clipPath:'inset(0 0 0 0)',offset:1}];
  const edgeFade=[{opacity:1,offset:0},{opacity:1,offset:.28},{opacity:0,offset:.55},{opacity:0,offset:1}];
  const uiFade=[{opacity:0,offset:0},{opacity:0,offset:.82},{opacity:1,offset:1}];
  const orient=frames=>opening?frames:frames.toReversed().map(frame=>({...frame,...(frame.offset!==undefined?{offset:1-frame.offset}:{})}));
  if(!resized)await Promise.all([[shell,outer],[cover,hinge],[body,pageClip],[edges,edgeFade],[controls,uiFade],[help,uiFade]].map(([element,frames])=>play(element,orient(frames),{duration,easing})));
  resizeController.abort();
  shell.dataset.journalPose=opening?'open':'closed';
  // Set the stable pose before removing animation fills, including on resize.
  for(const element of [shell,cover,edges,body,controls,help]) {
    element.getAnimations?.().forEach(animation=>animation.cancel());
    for(const key of ['transform','transform-origin','will-change','opacity','clip-path'])element.style.removeProperty(key);
  }
  if(opening)layoutJournal(root);
}
