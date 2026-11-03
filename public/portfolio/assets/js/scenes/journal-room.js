import { getLoadedJournalModel, loadJournalModel, sampleJournalAction, JOURNAL_MODEL_ASSET, JOURNAL_MODEL_ID } from './journal-model.js?v=3d5bd1cfca66';
import { drawJournalModel, journalRestDepth } from './journal-renderer.js?v=3d5bd1cfca66';

const selector='canvas[data-room-journal]';
// Draw the resting pose once in source coordinates; the short physical cue
// explicitly redraws its hinge. World-camera transforms keep it with its desk.
export function paintRoomJournal(canvas,data,{cornerLift=0}={}) {
  const object=canvas.closest('[data-room-object]'),ctx=canvas.getContext('2d',{alpha:true});
  if(!ctx||!data)return false;
  const {model,texture}=data,width=texture.width,height=texture.height,resolution=3;
  if(canvas.width!==width*resolution||canvas.height!==height*resolution){canvas.width=width*resolution;canvas.height=height*resolution;}
  const depth=journalRestDepth(model),action=sampleJournalAction(model.animation,0);
  // Same front-board hinge, camera and material as pickup. Body/base stay fixed.
  action.hinge=-Math.min(1,Math.max(0,cornerLift))*3.3/(Math.abs(depth[1])*model.dimensions.width);
  ctx.save();ctx.scale(resolution,resolution);ctx.imageSmoothingEnabled=false;
  drawJournalModel(ctx,model,texture,model.coverQuad,model.coverQuad,depth,action,{width,height});
  ctx.restore();canvas.dataset.journalCornerLift=String(cornerLift);
  canvas.dataset.journalModel=JOURNAL_MODEL_ID;
  canvas.dataset.journalTriangles=String(model.meshes.reduce((sum,mesh)=>sum+mesh.positions.length/9,0));
  object.dataset.bookSource='model';object.querySelector('.journal-model-fallback')?.remove();
  return true;
}

function showFallback(canvas) {
  const object=canvas.closest('[data-room-object]');object.dataset.bookSource='fallback';
  if(object.querySelector('.journal-model-fallback'))return;
  const image=canvas.ownerDocument.createElement('img');image.className='journal-model-fallback';
  image.alt='';image.setAttribute('aria-hidden','true');image.width=354;image.height=112;
  image.src=`${JOURNAL_MODEL_ASSET}cover-source.png`;canvas.parentElement.append(image);
}

export function prepareRoomJournal(root,{signal}={}) {
  const canvases=Array.from(root?.querySelectorAll?.(selector)||[]);
  if(!canvases.length)return Promise.resolve(false);
  const paint=data=>{
    if(signal?.aborted||root.isConnected===false)return false;
    let ready=true;
    for(const canvas of canvases)if(!paintRoomJournal(canvas,data)){showFallback(canvas);ready=false;}
    return ready;
  };
  const loaded=getLoadedJournalModel();
  // Returns from Research and freshly cloned backdrops paint synchronously.
  return loaded?Promise.resolve(paint(loaded)):loadJournalModel().then(paint);
}

export function copyRoomJournal(source,target) {
  const from=source?.querySelector(selector),to=target?.querySelector(selector);
  if(!from||!to||!from.dataset.journalModel)return;
  // cloneNode copies canvas attributes but never its bitmap.
  to.width=from.width;to.height=from.height;
  to.getContext('2d')?.drawImage(from,0,0);
}
