import { esc, isReducedMotion } from './utils.js?v=0985987b2294';
import { KITCHEN_SURFACES, projectKitchenSurface, kitchenReadingPoint } from './kitchen-surfaces.js?v=0985987b2294';

export function kitchenInformation(project,delivered=0) {
  return [
    {title:'Kitchen memory',kind:'light',text:project.description},
    {title:'Water-gun blueprint',kind:'blueprint',text:'Cat and rat have separate viewpoints. In this kitchen, collect cheese and water guns, then carry the cheese home. Every pickup restores a wall display.'},
    {title:'The cabinet’s build log',kind:'cabinet',text:`Built with ${project.technologies.join(', ')}. ${project.yearStatus}. ${project.roles.join(' · ')}. Contribution details are not inferred from the supplied build.`},
    {title:'Kitchen surveillance feed',kind:'surveillance',text:'Supplied gameplay shows both cat and rat viewpoints. Watch the original Unity build here. This kitchen is a shortened portfolio interpretation.',video:project.demoVideo},
    {title:'Home lights up',kind:'home',text:`${delivered} pieces of cheese delivered. ${project.yearStatus}. No public download link has been supplied.`}
  ];
}

export function renderKitchenReveal(project) {
  return `<div class="kitchen-wall-displays" aria-label="Information restored on kitchen walls">${kitchenInformation(project).map((record,index)=>`<section class="kitchen-wall-display" data-kitchen-wall="${index}" data-kind="${record.kind}" hidden aria-label="${esc(record.title)}">
    <p class="eyebrow">0${index+1} / KITCHEN WALL</p><h2>${esc(record.title)}</h2><p data-wall-copy>${esc(record.text)}</p>
    ${record.kind==='blueprint'?'<img class="wall-blueprint" src="/assets/game-props/water-gun.svg" alt="Water tank, grip and nozzle">':''}
    ${record.video?`<video class="rat-surveillance-video" controls playsinline preload="none" poster="${esc(project.artwork)}" aria-label="Original supplied gameplay demonstration"></video>`:''}
    ${record.kind==='home'?'<div class="wall-delivered-cheese" aria-label="Delivered cheese"></div>':''}
    <span class="wall-material-label">${record.kind==='home'?'MOUSE-HOLE MURAL':record.kind==='cabinet'?'PAINTED WOOD':record.kind==='blueprint'?'WORKSHOP BLUEPRINT':record.kind==='surveillance'?'KITCHEN SCREEN':'WALL PROJECTION'}</span>
  </section>`).join('')}</div><p class="visually-hidden" data-wall-announcer role="status"></p>`;
}

export function mountKitchenReveal(root,project,engine,signal) {
  const panels=[...root.querySelectorAll('[data-kitchen-wall]')];
  let unlocked=new Set(),delivered=0,active=-1;
  function frame(model) {
    panels.forEach((panel,index)=>{
      const pose=unlocked.has(index)?projectKitchenSurface(KITCHEN_SURFACES[index],model):null;
      if(panel.hidden===!!pose) panel.hidden=!pose;
      if(pose) {
        panel.style.height=`${pose.height}px`;
        panel.style.transform=`matrix3d(${pose.matrix.join(',')})`;
      }
      const video=panel.querySelector('video');
      if(video&&(panel.hidden||root.dataset.paused==='true')) video.pause();
    });
  }
  function restore(state) {
    unlocked=new Set(state.collected.map((_,i)=>i));delivered=state.delivered;
    if(state.deposits) unlocked.add(4);
    const video=panels[3].querySelector('video');
    if(unlocked.has(3)&&!video.src)video.src=project.demoVideo;
    panels[4].querySelector('[data-wall-copy]').textContent=kitchenInformation(project,delivered)[4].text;
    panels[4].querySelector('.wall-delivered-cheese').innerHTML=Array.from({length:delivered},()=>'<img src="/assets/game-props/cheese.svg" alt="Delivered cheese">').join('');
    frame(engine.snapshot());
  }
  function open(index,count=delivered) {
    active=index;unlocked.add(index);delivered=count;
    if(index===4) {
      panels[4].querySelector('[data-wall-copy]').textContent=kitchenInformation(project,count)[4].text;
      panels[4].querySelector('.wall-delivered-cheese').innerHTML=Array.from({length:count},()=>'<img src="/assets/game-props/cheese.svg" alt="Delivered cheese">').join('');
    }
    const video=panels[index].querySelector('video');if(video&&!video.src)video.src=project.demoVideo;
    const surface=KITCHEN_SURFACES[index],model=engine.snapshot();
    // Move through the real kitchen to frame its wall. Walking/looking cancels
    // this optional approach; there is no modal pause or viewport-sized card.
    engine.walkTo(kitchenReadingPoint(surface,model),[...surface.center,(surface.top+surface.bottom)/2],isReducedMotion());
    root.querySelector('[data-wall-announcer]').textContent=`${kitchenInformation(project,count)[index].title} restored on the kitchen wall. Walk or drag to look around.`;
    frame(engine.snapshot());
  }
  signal.addEventListener('abort',()=>panels.forEach(panel=>panel.querySelector('video')?.pause()),{once:true});
  return {open,frame,restore,get active(){return active;}};
}
