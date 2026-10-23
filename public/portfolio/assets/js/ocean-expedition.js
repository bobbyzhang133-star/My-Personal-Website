import { isReducedMotion } from './utils.js?v=1935067ad971';
import { OCEAN_LEVELS, OCEAN_WORLD } from './experience-state.js?v=1935067ad971';
import { createSpritePlayer, drawSprite } from './game-animation.js?v=1935067ad971';
import { closeFieldGuide } from './game-ui.js?v=1935067ad971';

export function textPages(text, budget = 28) {
  const words = text.trim().split(/\s+/).filter(Boolean), pages = [];
  while (words.length) {
    let length = Math.min(budget, words.length);
    // Prefer a sentence boundary without creating very short fragments.
    if (words.length > budget) {
      const sentence=words.slice(0,budget).map((word,index)=>/[.!?]$/.test(word)?index+1:0).filter(end=>end>=3).at(-1);
      const clause=words.slice(0,budget).map((word,index)=>/[,;]$/.test(word)?index+1:0).filter(end=>end>=budget*.5).at(-1);
      length=sentence||clause||length;
    }
    pages.push(words.splice(0,length).join(' '));
  }
  return pages;
}

export function oceanCards(project) {
  const chapters=project.gameDetails.introduction;
  const animals=[['swordfish','swordfish-green'],['grouper','manta','parrotfish'],['angler','eel','squid'],['boss']];
  const grouped=OCEAN_LEVELS.map((_,level)=>chapters.filter(card=>card.level===level));
  return grouped.flatMap((group,level)=>group.map((card,index)=>({ ...card,
    animal:animals[level][index%animals[level].length],
    direction:index%2?'left':'right',
    depth:OCEAN_LEVELS[level].top+(level===0?300:220)+index*(level===0?1200:level===3?520:1280)/Math.max(1,group.length-1),
    picture:card.picture==='gameplay'?project.artwork:'/assets/game-source/plasteroids-showcase/'+card.picture,
  })));
}

export function createOceanSequence(cards) {
  let active=-1, depth=0, phase='gap', offset=0;
  const seen=new Set();
  // World-distance windows, not acknowledgement gates or wall-clock timers.
  // A stopped player can read indefinitely; swimming back revisits the same animal.
  const windows=cards.map((card,index)=>{
    const gap=(cards[index+1]?.depth??OCEAN_WORLD.maxDepth+40)-card.depth;
    return {enter:card.depth-40,hold:card.depth+gap*.78,leave:Math.min(OCEAN_WORLD.maxDepth-2,(cards[index+1]?.depth??OCEAN_WORLD.height+2)-64)};
  });
  return {
    update(value) {
      if(!Number.isFinite(value))return active;
      depth=value;active=windows.findIndex(window=>depth>=window.enter&&depth<window.leave);
      phase='gap';offset=0;
      if(active>=0){
        const card=cards[active],window=windows[active],direction=card.direction==='right'?1:-1;
        if(depth<card.depth){phase='arriving';offset=direction*(card.depth-depth)/40;}
        else if(depth>window.hold){phase='leaving';offset=-direction*(depth-window.hold)/(window.leave-window.hold);}
        else phase='reading';
        if(depth>=card.depth-8)seen.add(active);
      }
      return active;
    },
    snapshot() { return {active,phase,offset,read:seen.size,seen:[...seen],nextDepth:cards.find(card=>card.depth>depth+1)?.depth??OCEAN_WORLD.maxDepth,complete:seen.size===cards.length,windows}; },
  };
}

export function renderOceanExpedition(project) {
  return `<div class="depth-status" aria-live="polite"></div>
    <section class="ocean-delivery ocean-towed-note" hidden data-ocean-reading aria-labelledby="ocean-note-title">
      <div class="fish-messenger"><canvas width="300" height="120" data-messenger role="img" aria-label="Original animated ocean animal"></canvas><span data-messenger-name></span></div>
      <div class="tow-line" aria-hidden="true"></div>
      <article class="ocean-page" aria-live="polite" aria-atomic="true"><p class="eyebrow" data-ocean-note-position></p><h2 id="ocean-note-title"></h2>
        <div class="ocean-note-layout"><img data-ocean-picture alt="Original artwork from the supplied Plasteroids presentation"><p data-ocean-text></p></div>
        <p class="ocean-source" data-ocean-source></p>
        <a class="ocean-archive" href="${project.demoVideo}" target="_blank" hidden>Watch the original demo ↗</a>
      </article>
    </section>
    <div class="ocean-depth-gauge" aria-label="Dive depth"><span data-dive-depth></span><meter min="0" max="100" value="0" aria-label="Descent progress"></meter></div>
    <button type="button" class="game-control ocean-ink" data-ocean-ink hidden>Send ink · E</button>
    <p class="ocean-boss-status" data-ocean-boss-status hidden role="status"></p>`;
}

export function mountOceanExpedition(root,project,engine,syncPause,signal) {
  const cards=oceanCards(project),sequence=createOceanSequence(cards),panel=root.querySelector('[data-ocean-reading]'),canvas=root.querySelector('[data-messenger]'),ink=root.querySelector('[data-ocean-ink]'),bossStatus=root.querySelector('[data-ocean-boss-status]');
  let current=-1,player=null,raf,previous=0,hits=0;
  const names={swordfish:'Blue swordfish','swordfish-green':'Green swordfish',grouper:'Grouper',manta:'Manta ray',parrotfish:'Parrotfish',angler:'Anglerfish',eel:'Electric eel',squid:'Enemy squid',boss:'Final boss'};
  function show(index) {
    const card=cards[index];current=index;panel.hidden=false;panel.dataset.direction=card.direction;panel.dataset.animal=card.animal;panel.dataset.depth=String(card.level);
    player=createSpritePlayer(card.animal);
    root.querySelector('[data-messenger-name]').textContent=names[card.animal];
    root.querySelector('#ocean-note-title').textContent=card.title;
    root.querySelector('[data-ocean-text]').textContent=card.body;
    root.querySelector('[data-ocean-note-position]').textContent=`${card.level===3?'BOSS ARENA':'DEPTH 0'+(card.level+1)} · ${index+1} / ${cards.length}`;
    const illustration=root.querySelector('[data-ocean-picture]');illustration.src=card.picture;illustration.alt=card.picture.includes('sound-')?'Audio production interface shown in the original Plasteroids showcase':card.picture.includes('boss-art')?'Original Plasteroids boss artwork from showcase slide 13':'Original Plasteroids gameplay image from the supplied showcase';
    root.querySelector('[data-ocean-source]').textContent=`Final showcase · ${card.slides.includes(',')||card.slides.includes('–')?'slides':'slide'} ${card.slides}`;
    root.querySelector('.ocean-archive').hidden=!card.archive;
  }
  const log=root.querySelector('[data-ocean-log]');
  log.innerHTML=cards.map((card,index)=>`<button type="button" class="game-control" data-ocean-revisit="${index}" disabled>${index+1} · ${card.title}${card.part?' (continued)':''}</button>`).join('');
  log.addEventListener('click',event=>{const button=event.target.closest('[data-ocean-revisit]');if(!button||button.disabled)return;closeFieldGuide(root);syncPause();root.querySelector('.world-canvas').focus();engine.swimToDepth(cards[Number(button.dataset.oceanRevisit)].depth,true);},{signal});
  function frame(model) {
    const index=sequence.update(model.y),state=sequence.snapshot();
    if(index>=0&&index!==current)show(index);
    current=index;if(panel.hidden!==(index<0))panel.hidden=index<0;panel.dataset.phase=state.phase;
    // Keep the rope, native animal and page in one coordinate system throughout travel.
    panel.style.translate=isReducedMotion()?'0 0':`${state.offset*110}vw 0`;
    const progress=root.querySelector('.world-progress'),label=`Guide · ${state.read} / ${cards.length}`;
    if(progress.textContent!==label)progress.textContent=label;
    log.querySelectorAll('[data-ocean-revisit]').forEach(button=>{if(state.seen.includes(Number(button.dataset.oceanRevisit))&&button.disabled)button.disabled=false;});
    root.dataset.activeLevel=String(model.level);
    const percent=Math.round(Math.max(0,Math.min(100,(model.y-260)/(OCEAN_WORLD.maxDepth-260)*100)));
    root.querySelector('[data-dive-depth]').textContent=`Depth ${percent}% · ${OCEAN_LEVELS[model.level].name}`;
    root.querySelector('.ocean-depth-gauge meter').value=percent;
    root.querySelector('.depth-status').textContent=`${model.level===3?'Boss arena':`Level 0${model.level+1}`} · ${OCEAN_LEVELS[model.level].name}`;
    ink.hidden=model.level!==3||!panel.hidden;
    bossStatus.hidden=model.level!==3||!panel.hidden;
    root.querySelector('.ocean-depth-gauge').hidden=!ink.hidden;
    if(model.level===3)bossStatus.textContent=hits===3?'Arena illuminated · All three weak points found':`Weak points · ${hits} / 3 · A short portfolio encounter`;
    ink.disabled=hits===3;
    root.querySelector('[data-ocean-guide]').disabled=model.y>=OCEAN_WORLD.maxDepth-1;
  }
  function fire(){if(!ink.hidden&&hits<3){hits++;engine.setBossHits(hits);frame(engine.snapshot());}}
  ink.addEventListener('click',fire,{signal});
  root.querySelector('[data-ocean-guide]').addEventListener('click',()=>{closeFieldGuide(root);syncPause();root.querySelector('.world-canvas').focus();engine.swimToDepth(sequence.snapshot().nextDepth,isReducedMotion());},{signal});
  function tick(time){const dt=Math.min(.08,(time-(previous||time))/1000);previous=time;
    if(player&&!panel.hidden&&root.dataset.overlayPaused!=='true'&&!document.hidden){const sample=player.advance(dt,true,player.data.facing,isReducedMotion(),true),ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);const h=Math.min(110,280*sample.crop[3]/sample.crop[2]);drawSprite(ctx,sample,150,(120-h)/2,h,panel.dataset.direction==='left');canvas.dataset.animationFrame=sample.src+':'+sample.time;}
    if(!signal.aborted)raf=requestAnimationFrame(tick);
  }
  raf=requestAnimationFrame(tick);signal.addEventListener('abort',()=>cancelAnimationFrame(raf),{once:true});
  frame(engine.snapshot());
  return {frame,fire,cards,sequence};
}
