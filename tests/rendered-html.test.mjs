import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { SceneManager } from '../public/portfolio/assets/js/scene-manager.js';
import { MASTER_ROOM, MASTER_OBJECTS, masterSupportReport, masterContains, masterBoxStyle, masterPanForObject, masterPanFromDrag } from '../public/portfolio/assets/js/scenes/room-master.js';
import { WORLD_LAYOUTS, ROOM_STATIONS, roomPath, roomFree, moveBody, createWorldEngine } from '../public/portfolio/assets/js/world-engine.js';
import { GAME_ROUTES, routeCell, routeLightDistance } from '../public/portfolio/assets/js/game-route-layouts.js';
import { GAME_WORLDS, renderGameWorld, entries } from '../public/portfolio/assets/js/game-world.js';
import { renderRatInventory, mountWorldUI, closeFieldGuide, worldInputBlocked, bindRatTouch } from '../public/portfolio/assets/js/game-ui.js';
import { playerMenuMarkup } from '../public/portfolio/assets/js/player-menu.js';
import { oceanCards, createOceanSequence, textPages } from '../public/portfolio/assets/js/ocean-expedition.js';
import { OCEAN_ANIMALS } from '../public/portfolio/assets/js/ocean-animal-data.js';
import { OCEAN_DEBRIS, OCEAN_LANDMARKS, oceanWaterColor, drawOceanEnvironment } from '../public/portfolio/assets/js/ocean-environment.js';
import { kitchenSinkGeometry, KITCHEN_SINK } from '../public/portfolio/assets/js/kitchen-geometry.js';
import { kitchenInformation, mountKitchenReveal } from '../public/portfolio/assets/js/kitchen-reveal.js';
import { KITCHEN_SURFACES, kitchenSurfaceQuad, kitchenReadingPoint, projectKitchenSurface } from '../public/portfolio/assets/js/kitchen-surfaces.js';
import { GAME_ANIMATIONS, sampleClip, createSpritePlayer } from '../public/portfolio/assets/js/game-animation.js';
import { BREAKOUT_CHAPTERS, orderedChapters, OCEAN_LEVELS, OCEAN_WORLD, BOSS_TENTACLES, oceanLevel, oceanCamera, verticalCamera, RAT_OBJECTS, newRatState, validRatState, ratAction, ratPropGeometry, projectRatPoint } from '../public/portfolio/assets/js/experience-state.js';
import { calculateTravelTransform, CAMERA_HOME, CAMERA_TRAVEL_PROFILES } from '../public/portfolio/assets/js/camera.js';
import { projects, aiGroups, aiResearchNotes, researchNotes } from '../public/portfolio/assets/js/content.js';
import { aiEvidence } from '../public/portfolio/assets/js/ai-projects.js';
import { sceneRegistry } from '../public/portfolio/assets/js/scenes/index.js';
import { bookPageIndex, bookDestination, researchPages, mountResearch } from '../public/portfolio/assets/js/scenes/research.js';
import { pageFold, foldPolygon } from '../public/portfolio/assets/js/scenes/book-fold.js';
import { isCreativePath, routeFromPath } from '../public/portfolio/assets/js/utils.js';

const root = new URL('../public/portfolio/', import.meta.url);
const repoRoot = new URL('../', import.meta.url);
const routes = ['', 'games/', 'films/', 'music/', 'research/', 'ai/', 'projects/', 'skills-experience/', 'resume/', 'about/'];
const creativeRoutes = ['', 'games/', 'films/', 'music/', 'research/', 'ai/'];
const detailRoutes = projects.map(project => project.detailRoute.replace(/^\//, ''));

test('Research pagination is bounded, supports single pages and facing spreads, and retains canonical content', () => {
  assert.equal(bookPageIndex(-20), 0);
  assert.equal(bookPageIndex(99), 2);
  assert.equal(bookPageIndex(3, true), 2);
  assert.equal(bookPageIndex(3, false), 2, 'portrait to spread retains the same sheet');
  assert.equal(bookDestination(0, -1), 0, 'never wrap before the first page');
  assert.equal(bookDestination(0, 1), 2);
  assert.equal(bookDestination(2, 1), 2, 'never wrap after the last spread');
  assert.equal(bookDestination(1, 1, true), 2);
  assert.equal(bookDestination(3, -1, true), 1);
  assert.equal(bookDestination(2, 1, false, 5), 4, 'an odd last leaf is reachable');
  assert.equal(bookDestination(4, 1, false, 5), 4);
  assert.deepEqual(researchPages.filter(page => page.kind === 'chapter').map(page => page.project), projects.filter(project => project.category === 'research'));
  const html = sceneRegistry.research.render();
  assert.match(html, /class="book-turning-leaf"[^>]*aria-hidden="true" inert hidden/);
  assert.doesNotMatch(html, /data-curl-strip/, 'paper slices are allocated only during a turn');
  assert.match(html, /aria-label="Book navigation"/);
  assert.match(html, /role="status" aria-live="polite"/);
  assert.match(html, /data-book-direction="-1"[^>]*disabled/);
  assert.match(html, /data-book-jump="2"/);
  assert.match(html, /full 29-page draft is not included/);
  assert.doesNotMatch(html, /book-preview|data-chapter|aria-current="page"/);
});

test('Research corner fold follows both mouse axes without stretching or detaching paper', () => {
  const area = points => Math.abs(points.reduce((sum, p, i) => { const q = points[(i + 1) % points.length]; return sum + p.x * q.y - q.x * p.y; }, 0) / 2);
  for (const width of [350, 543.725, 600]) for (const height of [240, 574, 662]) for (const corner of ['top', 'bottom']) for (const direction of [-1, 1]) {
    for (const point of [{x:width,y:corner==='top'?0:height},{x:-width,y:corner==='top'?0:height},{x:width*.3,y:height*.2},{x:width*.3,y:height*.6},{x:0,y:1e5},{x:-1e5,y:-1e5}]) {
      const fold = pageFold(point, width, height, corner, direction);
      assert(fold.matrix.every(Number.isFinite));
      const [a,b,c,d,tx,ty] = fold.matrix;
      assert(Math.abs(a*d-b*c-1)<1e-8, 'back face rotates without mirror text or scale distortion');
      assert(Math.abs(Math.hypot(a,b)-1)<1e-8); assert(Math.abs(Math.hypot(c,d)-1)<1e-8);
      assert(Math.abs(area(fold.front)+area(fold.back)-width*height)<1e-6, 'folded and unfolded polygons partition the original sheet exactly');
      for(const p of [...fold.front,...fold.back]) { assert(p.x>=-1e-6 && p.x<=width+1e-6);assert(p.y>=-1e-6&&p.y<=height+1e-6); }
      const sourceX=direction>0?0:width, sourceY=corner==='top'?0:height;
      assert(Math.abs(a*sourceX+c*sourceY+tx-direction*fold.position.x)<1e-6,'grabbed corner follows the constrained mouse x');
      assert(Math.abs(b*sourceX+d*sourceY+ty-fold.position.y)<1e-6,'grabbed corner follows the constrained mouse y');
      assert(Math.hypot(fold.position.x,fold.position.y-sourceY)<=width+1e-6,'spine attachment cannot stretch');
      assert(!foldPolygon(fold.back).includes('NaN'));
    }
  }
  const upper=pageFold({x:180,y:90},544,574,'top'), lower=pageFold({x:180,y:330},544,574,'top');
  assert(Math.abs(upper.angle-lower.angle)>20,'same horizontal progress, different mouse height must produce a different fold angle');
  assert.notEqual(foldPolygon(upper.back),foldPolygon(lower.back));
});

test('Research reader controls are visually quiet but keep accessible hit areas', async () => {
  const css = await readFile(new URL('assets/css/game-shell.css', root), 'utf8');
  const controls = css.match(/\.book-reader-controls button \{([^}]+)\}/)[1];
  assert.match(controls, /min-width: 44px/); assert.match(controls, /min-height: 44px/);
  assert.match(controls, /border: 0/); assert.match(controls, /background: transparent/);
  assert.match(css, /will-change: transform,clip-path/);
  assert.doesNotMatch(css, /book-curl-strip/);
  assert.match(await readFile(new URL('assets/js/vendor/st-page-flip-LICENSE.txt',root),'utf8'),/Copyright \(c\) 2020 Nodlik/);
});

test('Research physical sheet handles forward/back, interrupted drags, resize, reduced motion, and cleanup', () => {
  const names = ['window', 'document', 'requestAnimationFrame', 'cancelAnimationFrame'];
  const previous = new Map(names.map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
  class Element {
    constructor(dataset = {}) { this.dataset = dataset; this.listeners = new Map(); this.style = { setProperty() {} }; this.hidden = true; this.innerHTML = ''; this.inert = false; this.capture = null; }
    addEventListener(type, fn, options) { const list = this.listeners.get(type) || []; list.push({ fn, signal: options?.signal }); this.listeners.set(type, list); }
    emit(type, extra = {}) { const event = { target: this, preventDefault() {}, ...extra }; for (const item of this.listeners.get(type) || []) if (!item.signal?.aborted) item.fn(event); }
    closest(selector) {
      if (selector.includes('[data-book-direction]') && this.dataset.bookDirection) return this;
      if (selector.includes('[data-book-jump]') && this.dataset.bookJump !== undefined) return this;
      if (selector === '[data-book-edge]' && this.dataset.bookEdge) return this;
      return null;
    }
    contains(target) { return target === this; }
    focus() { globalThis.document.activeElement = this; }
    removeAttribute(name) { if (name === 'data-turning') delete this.dataset.turning; }
    getBoundingClientRect() { return { left: 0, top: 0, width: 1000, height: 600 }; }
    setPointerCapture(id) { this.capture = id; }
    hasPointerCapture(id) { return this.capture === id; }
    releasePointerCapture() { this.capture = null; }
  }
  const surface = new Element(), viewport = new Element(), pages = new Element(), leaf = new Element(), counter = new Element();
  const front = new Element(), back = new Element(), shade = new Element();
  const prev = new Element({ bookDirection: '-1' }), next = new Element({ bookDirection: '1' });
  const edgePrev = new Element({ bookEdge: '-1' }), edgeNext = new Element({ bookEdge: '1' });
  const map = { '[data-book-viewport]': viewport, '[data-book-pages]': pages, '[data-book-leaf]': leaf, '[data-book-counter]': counter };
  surface.querySelector = selector => map[selector];
  surface.querySelectorAll = () => [prev, next, edgePrev, edgeNext];
  pages.querySelector = () => null;
  leaf.querySelector = selector => selector === '.leaf-front' ? front : back;
  leaf.querySelectorAll = () => [];
  front.querySelector = back.querySelector = () => shade;
  let single = false, motion = '';
  const win = new Element(); win.matchMedia = () => ({ get matches() { return single; } });
  const frames = new Map(); let id = 0;
  Object.defineProperty(globalThis, 'window', { configurable: true, value: win });
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { activeElement: null, documentElement: { dataset: { get motion() { return motion; } } } } });
  Object.defineProperty(globalThis, 'requestAnimationFrame', { configurable: true, value: fn => { frames.set(++id, fn); return id; } });
  Object.defineProperty(globalThis, 'cancelAnimationFrame', { configurable: true, value: key => frames.delete(key) });
  const flush = () => { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(fn => fn(performance.now() + 2000)); };
  const click = target => surface.emit('click', { target });
  const down = (x, pointerType = 'mouse') => viewport.emit('pointerdown', { pointerId: 1, isPrimary: true, button: 0, clientX: x, clientY: 200, pointerType });
  const move = (x, y = 200) => viewport.emit('pointermove', { pointerId: 1, clientX: x, clientY: y });
  const up = () => viewport.emit('pointerup', { pointerId: 1 });
  try {
    const scene = mountResearch({ querySelector: () => surface });
    assert.equal(counter.textContent, 'Pages 1–2 / 3'); assert(prev.disabled); assert(!next.disabled);
    click(next);
    assert.equal(surface.dataset.turning, 'forward'); assert(!leaf.hidden); assert(pages.inert);
    assert.equal((leaf.innerHTML.match(/class="book-leaf-face/g) || []).length, 2);
    assert.match(leaf.innerHTML, /leaf-front[^]*data-page-index="1"/);
    assert.match(leaf.innerHTML, /leaf-back[^]*data-page-index="2"/);
    click(next); assert.equal(frames.size, 1, 'rapid input does not fork animations');
    flush(); assert.equal(counter.textContent, 'Page 3 / 3'); assert(next.disabled); assert(leaf.hidden); assert(!pages.inert);
    assert.doesNotMatch(pages.innerHTML, /Read on GitHub|FLUX|Groq/); assert.match(pages.innerHTML, /Currently/);
    click(prev); assert.equal(surface.dataset.turning, 'backward'); flush();
    down(990); move(940); const beforeY=leaf.dataset.foldAngle; move(940,280); assert.notEqual(leaf.dataset.foldAngle,beforeY,'vertical mouse motion changes the fold while horizontal position stays fixed'); up(); flush();
    assert.equal(surface.dataset.bookPage, '1', 'short drag snaps back');
    down(990); move(650); up(); flush(); assert.equal(surface.dataset.bookPage, '3');
    down(10); move(350); viewport.emit('pointercancel', { pointerId: 1 }); flush();
    assert.equal(surface.dataset.bookPage, '3', 'cancel restores the original spread');
    down(10); move(350); win.emit('resize'); assert(leaf.hidden); assert(!pages.inert); assert.equal(frames.size, 0);
    single = true; win.emit('resize'); assert.equal(surface.dataset.bookMode, 'single'); assert.equal(counter.textContent, 'Page 3 / 3');
    assert.equal((pages.innerHTML.match(/<article/g) || []).length, 1);
    down(500, 'touch'); move(510, 250); assert.equal(viewport.capture, null, 'vertical reading does not turn a leaf');
    click(prev); flush();down(800, 'touch'); move(450); up(); flush(); assert.equal(counter.textContent, 'Page 3 / 3');
    surface.emit('keydown', { key: 'Home' }); flush(); assert.equal(surface.dataset.bookPage, '1');
    click(new Element({ bookJump: '2' })); flush(); assert.equal(surface.dataset.bookPage, '3');
    motion = 'reduced'; click(prev); assert.equal(surface.dataset.bookPage, '2'); assert.equal(frames.size, 0); assert(leaf.hidden);
    surface.emit('keydown', { key: 'Home' }); assert.equal(surface.dataset.bookPage, '1');
    motion = ''; click(next); assert.equal(frames.size, 1);
    scene.cleanup(); assert.equal(frames.size, 0, 'leaving the category cancels the animation');
    click(next); assert.equal(frames.size, 0, 'detached listeners cannot restart turns');
  } finally {
    for (const name of names) { const descriptor = previous.get(name); if (descriptor) Object.defineProperty(globalThis, name, descriptor); else delete globalThis[name]; }
  }
});

test('AI groups tools with their real research while the book keeps unrelated research',async()=>{
  assert.deepEqual(aiGroups.map(group=>group.projectIds),[['game-builder-free','game-builder-pro','github-profile'],['definition']]);
  const ids=aiGroups.flatMap(group=>group.projectIds);assert.equal(new Set(ids).size,ids.length);
  assert.deepEqual([...ids].sort(),projects.filter(project=>project.category==='ai').map(project=>project.id).sort());
  assert.equal(projects.filter(project=>project.category==='research').length,1);
  assert.equal(projects.find(project=>project.id==='gamification').category,'research');
  assert(researchNotes.every(note=>!/Groq|FLUX|HTML5/.test(note)));assert(aiResearchNotes.some(note=>/HTML5/.test(note)));
  const research=projects.find(project=>project.id==='github-profile');assert.equal(research.category,'ai');assert.match(research.detailRoute,/^\/ai\//);
  assert(research.externalLinks.some(link=>link.url.endsWith('/PAPER.md')));assert(research.externalLinks.some(link=>link.url.endsWith('/research-journal.md')));
  const free=projects.find(project=>project.id==='game-builder-free'),pro=projects.find(project=>project.id==='game-builder-pro'),definition=projects.find(project=>project.id==='definition');
  assert.match(free.description,/rembg.*Base64/);assert.match(free.description,/unresolved.*perspective/);
  assert.doesNotMatch(pro.description,/Higher fidelity|better brain/);assert.match(pro.description,/does not establish/);
  assert.match(definition.description,/not evaluated/);assert.equal(definition.relatedResearch,undefined);
  assert.match(aiEvidence(free),/\/ai\/game-builder-research.html/);assert.match(aiEvidence(pro),/does not report Pro-specific/);
  const html=sceneRegistry.ai.render();assert.equal((html.match(/data-app=/g)||[]).length,4);assert.equal((html.match(/class="ai-app-group"/g)||[]).length,2);assert.match(html,/<details class="ai-evidence">/);
  assert.doesNotMatch(sceneRegistry.research.render(),/Game Builder|GitHub Profile/);
  const legacy=await readFile(new URL('research/github-profile.html',root),'utf8');assert.match(legacy,/data-project="github-profile"/);assert.match(legacy,/rel="canonical" href="\/ai\/game-builder-research.html"/);
  await access(new URL(research.detailRoute.slice(1),root));
});

test('Each complete game HUD and pause menu shares scoped source-family theme tokens',async()=>{
  const css=await readFile(new URL('assets/css/game-world.css',root),'utf8');
  const ui=css.split('/* Original-UI references skin the entire exploration HUD')[1];assert(ui);
  for(const family of ['woodland','platform','ocean','security','pixel-horror','unreal','kitchen'])assert(ui.includes(`body.world-mode:has(.world-${family})`));
  for(const widget of ['.world-hud','.world-progress','.world-inspect','.world-touch-controls','.world-guide-body','.world-caption','.world-objective','.player-menu','.setting-toggle'])assert(ui.includes(widget));
  assert.match(ui,/min-height: 44px/);assert.match(ui,/focus-visible/);assert.match(ui,/aria-pressed="true"/);
  assert.doesNotMatch(ui,/linear-gradient\(|backdrop-filter:\s*blur/);
  await access(new URL('assets/game-ui/bird-keycap.png',root));
});

test('Rat icon HUD represents actual inventory rather than decorative health or timers',()=>{
  const state={...newRatState(),carried:1,guns:2,delivered:1},html=renderRatInventory(state);
  assert.equal((html.match(/class="inventory-slot"/g)||[]).length,3);
  assert.match(html,/data-inventory="cheese".*<b>1\/2<\/b>/);
  assert.match(html,/data-inventory="guns".*<b>2\/2<\/b>/);
  assert.match(html,/data-inventory="home".*<b>1\/2<\/b>/);
  assert.doesNotMatch(html,/health|lives|hunger|timer/i);
});

test('Cat/Rat resting HUD has only a character return and bottom-right inventory',async()=>{
  const html=renderGameWorld(projects.find(p=>p.id==='cat-eat-rat'));
  const header=html.slice(html.indexOf('<header'),html.indexOf('</header>'));
  assert.equal((header.match(/<a /g)||[]).length,1);assert.match(header,/href="\/games\/">← Return to characters/);
  assert.doesNotMatch(header,/menu-button|sound-button|Room/);assert.match(html,/class="rat-pack".*aria-controls="world-discoveries"/);
  assert.doesNotMatch(html,/class="world-caption"/);
  const css=await readFile(new URL('assets/css/game-world.css',root),'utf8');
  assert.match(css,/\.world-kitchen \.rat-pack \{[^}]*right:[^}]*bottom:/);
  assert.match(css,/\.world-kitchen > :is\(\.world-objective,\.world-inspect,\.world-touch-controls\) \{ display: none/);
  assert.match(css,/\.world-kitchen \.world-field-guide:not\(\[open\]\) \{ display: none/);
  assert.match(renderGameWorld(projects.find(p=>p.id==='plasteroids')),/sound-button/,'other game chrome is unchanged');
  const site=await readFile(new URL('assets/js/site.js',root),'utf8');assert.match(site,/if\(gameSoundButton\)initAudio\(gameSoundButton\)/,'minimal HUD must not initialize audio against a missing sound button');
});

test('Cat/Rat touch gestures retain travel and inspection without permanent arrow buttons',()=>{
  class Canvas extends EventTarget {setPointerCapture(){}focus(){}}
  const canvas=new Canvas(),controller=new AbortController(),calls=[];
  const engine={key:(...args)=>calls.push(args),look:(...args)=>calls.push(['look',...args])};let taps=0;
  bindRatTouch(canvas,engine,()=>taps++,controller.signal);
  function pointer(type,x,y,pointerType='touch'){const e=new Event(type);Object.assign(e,{pointerId:1,pointerType,clientX:x,clientY:y});canvas.dispatchEvent(e);}
  pointer('pointerdown',100,100);pointer('pointerup',100,100);assert.equal(taps,1);
  pointer('pointerdown',100,100);pointer('pointermove',120,60);assert(calls.some(c=>c[0]==='up'&&c[1]));assert(calls.some(c=>c[0]==='look'&&c[1]<0));
  pointer('pointerup',120,60);assert.equal(taps,1,'walking never accidentally collects');assert.deepEqual(calls.slice(-2),[['up',false],['down',false]]);
  pointer('pointerdown',100,100);pointer('pointermove',100,140);assert.deepEqual(calls.at(-1),['down',true]);pointer('pointercancel',100,140);assert.deepEqual(calls.at(-1),['down',false]);
  pointer('pointerdown',100,100,'mouse');pointer('pointerup',100,100,'mouse');assert.equal(taps,1,'mouse keeps its established look controls');
  controller.abort();const count=calls.length;pointer('pointerdown',100,100);pointer('pointermove',100,60);assert.equal(calls.length,count);
});

test('Game pause credits identify the current game while other page menus stay unchanged',()=>{
  const project=projects.find(p=>p.id==='plasteroids'),html=playerMenuMarkup({gameProject:project});
  assert.match(html,/Plasteroids!/);assert.match(html,/original menus\/HUDs where available/);
  assert.doesNotMatch(html,/temporary bird proxy/);
  assert.match(playerMenuMarkup(),/Player Menu/);
  assert.match(playerMenuMarkup({gameProject:{title:'<script>'}}),/&lt;script&gt;/);
});

test('Studio menu has an explicit safe theme scope without changing game or professional skins',async()=>{
  const studio=playerMenuMarkup({sceneStyle:'studio'}),normal=playerMenuMarkup();
  assert.equal((studio.match(/data-menu-style="studio"/g)||[]).length,2,'dialog and backdrop share the studio skin');
  assert.match(studio,/role="dialog" hidden/);assert.match(studio,/aria-modal="true"/);
  for(const destination of ['/projects/','/skills-experience/','/resume/','/about/'])assert(studio.includes(`href="${destination}"`));
  assert.match(studio,/data-motion-toggle aria-pressed="false"/);
  assert.match(studio,/approved master composition/);assert.doesNotMatch(studio,/temporary bird proxy|short crossfades/);
  assert.match(normal,/data-menu-style="default"/);
  assert.match(playerMenuMarkup({sceneStyle:'"><script>'}),/data-menu-style="default"/);
  const game=playerMenuMarkup({gameProject:projects.find(p=>p.id==='plasteroids'),sceneStyle:'studio'});
  assert.match(game,/data-menu-style="game"/);assert.doesNotMatch(game,/data-menu-style="studio"/);
  const site=await readFile(new URL('assets/js/site.js',root),'utf8');
  const creative=site.split('else if (isCreativePath(location.pathname))')[1].split('} else {')[0];
  assert.match(creative,/playerMenuMarkup\(\{sceneStyle:'studio'\}\)/);
  assert.match(site,/playerMenuMarkup\(\{gameProject:worldProject\}\)/);
  assert.match(site,/professional-mode[\s\S]*playerMenuMarkup\(\)/);
});

test('Studio UI uses room materials, accessible responsive controls, and a persistent scene-art rule',async()=>{
  const css=await readFile(new URL('assets/css/game-shell.css',root),'utf8');
  const theme=css.split('/* The studio pause UI belongs')[1];assert(theme);
  for(const color of ['#20393e','#f6edcf','#9c623f','#d49b60'])assert(theme.includes(color));
  assert.match(theme,/\.menu-backdrop\[data-menu-style="studio"\][^}]*backdrop-filter: none/);
  assert.match(theme,/font-family: 'Pixelify Sans'/);assert.match(theme,/outline: 3px dashed/);
  assert.match(theme,/min-height: 44px/);assert.match(theme,/@media\(max-width:600px\)/);assert.match(theme,/@media\(max-height:500px\)/);
  assert.doesNotMatch(theme,/linear-gradient\(|backdrop-filter:\s*blur|0 30px 100px/);
  await access(new URL('assets/fonts/PixelifySans.ttf',root));
  const projectRule=await readFile(new URL('../../.cursor/rules/scene-ui-art-style.mdc',root),'utf8');
  assert.match(projectRule,/alwaysApply: true/);assert.match(projectRule,/active scene/);assert.match(projectRule,/44px/);
});

test('Information boards use source-family skins and a self-hosted licensed pixel font',async()=>{
  const css=await readFile(new URL('assets/css/game-world.css',root),'utf8');
  const skins=css.split('/* Game-specific information materials.')[1];assert(skins);
  for(const family of ['woodland','platform','ocean','security','pixel-horror','unreal','kitchen'])assert(skins.includes('.world-'+family));
  assert.match(skins,/border-image: url\('\/assets\/game-ui\/ocean-board.svg'\) 12 fill \/ 12px/);
  assert.match(skins,/data-depth="2"/);assert.match(skins,/ocean-deep-board.svg/);
  assert.match(skins,/\.kitchen-wall-display/);assert.match(skins,/background: #e7d5af/);
  assert.doesNotMatch(skins,/backdrop-filter:\s*blur|linear-gradient\(/,'boards must not reintroduce glossy website surfaces');
  for(const name of ['ocean-board','ocean-deep-board','woodland-board']){
    const svg=await readFile(new URL(`assets/game-ui/${name}.svg`,root),'utf8');
    assert.match(svg,/viewBox="0 0 32 32"/);assert.match(svg,/shape-rendering="crispEdges"/);
  }
  const font=await readFile(new URL('assets/fonts/PixelifySans.ttf',root));assert.equal(font.readUInt32BE(),0x00010000);
  assert.match(await readFile(new URL('assets/fonts/PixelifySans-OFL.txt',root),'utf8'),/SIL OPEN FONT LICENSE Version 1.1/);
  const kitchen=await readFile(new URL('assets/js/kitchen-reveal.js',root),'utf8');
  assert.match(kitchen,/projectKitchenSurface/);assert.match(kitchen,/matrix3d/);
  assert.doesNotMatch(kitchen,/getBoundingClientRect|screen\.style\.width|\.showModal\(/,'wall information must never become a clamped viewport page');
});

test('each game exposes one on-demand field guide rather than competing instruction overlays',()=>{
  for(const project of projects.filter(project=>project.category==='games')){
    const html=renderGameWorld(project);
    assert.equal((html.match(/class="world-field-guide"/g)||[]).length,1);
    assert.match(html,/<details class="world-field-guide" id="world-discoveries">/);
    const body=html.slice(html.indexOf('<div class="world-guide-body"'),html.indexOf('</details>',html.indexOf('data-guide-close')));
    assert.match(body,/world-help/);assert.match(html,/data-guide-close/);
    assert.doesNotMatch(html,/class="world-bottom"/);
    if(project.id==='cat-eat-rat'){
      assert.match(body,/Restart collection/);assert.match(body,/data-next-object/);
      assert.match(html,/disabled hidden>Move closer/);
    }
    if(project.id==='plasteroids'){assert.match(html,/data-ocean-reading/);assert.match(html,/data-ocean-log/);assert.doesNotMatch(html,/data-ocean-continue|Continue diving|page-fold|ocean-page-body/);}
  }
});

test('field guide pauses movement, returns focus and never resumes over another reading/menu state',()=>{
  const descriptors=new Map(['document','window','MutationObserver'].map(name=>[name,Object.getOwnPropertyDescriptor(globalThis,name)]));
  class Element extends EventTarget {open=false;hidden=false;attrs={};focused=false;setAttribute(key,value){this.attrs[key]=value;}focus(){this.focused=true;}closest(){return null;}}
  const guide=new Element(),summary=new Element(),journal=new Element(),close=new Element(),menu=new Element();menu.hidden=true;
  let reading=false;
  const root={dataset:{},querySelector(selector){if(selector==='.world-field-guide')return guide;if(selector==='.world-progress')return summary;if(selector==='[data-guide-close]')return close;if(selector==='.world-journal')return journal;if(selector.includes('.world-field-guide[open]'))return guide.open||journal.open||reading?guide:null;return null;},querySelectorAll(){return [];}};
  const calls=[],engine={pause(value){calls.push(value);},clear(){calls.push('clear');}},controller=new AbortController();
  let observerDisconnected=false;
  try{
    globalThis.document=new EventTarget();document.hidden=false;document.querySelector=()=>menu;
    globalThis.window=new EventTarget();globalThis.MutationObserver=class{observe(){}disconnect(){observerDisconnected=true;}};
    const sync=mountWorldUI(root,engine,controller.signal);
    assert.equal(calls.at(-1),false);
    summary.dispatchEvent(new Event('click'));assert.equal(calls.at(-1),true);
    guide.open=true;guide.dispatchEvent(new Event('toggle'));assert.equal(root.dataset.paused,'true');assert.equal(summary.attrs['aria-expanded'],'true');
    const input={target:summary};assert(worldInputBlocked(root,input));
    journal.open=true;close.dispatchEvent(new Event('click'));assert.equal(guide.open,false);assert(summary.focused);assert.equal(calls.at(-1),true);
    journal.open=false;reading=true;sync();assert.equal(calls.at(-1),true);
    reading=false;menu.hidden=false;sync();assert.equal(calls.at(-1),true);
    menu.hidden=true;sync();assert.equal(calls.at(-1),false);
    assert.equal(worldInputBlocked(root,input),false);
    input.target={closest(){return summary;}};assert(worldInputBlocked(root,input),'focused UI must not leak movement keystrokes');
    guide.open=true;const escape=new Event('keydown',{cancelable:true});Object.defineProperty(escape,'key',{value:'Escape'});window.dispatchEvent(escape);assert.equal(guide.open,false);assert(escape.defaultPrevented);
    closeFieldGuide(root);assert.equal(summary.attrs['aria-expanded'],'false');
    document.hidden=true;sync();assert.equal(calls.at(-1),true);
    controller.abort();assert(observerDisconnected);
  }finally{
    controller.abort();for(const [name,descriptor]of descriptors){if(descriptor)Object.defineProperty(globalThis,name,descriptor);else delete globalThis[name];}
  }
});

test('Cat/Rat cover uses recovered native meshes with complete foot contact and preserved scale',async()=>{
  const manifest=JSON.parse(await readFile(new URL('assets/game-characters/cat-rat-duo-original.provenance.json',root),'utf8'));
  const pose=manifest;
  assert.equal(manifest.characters.length,2);assert.equal(manifest.characters.find(c=>c.name==='cat').bones,21);assert.equal(manifest.characters.find(c=>c.name==='rat').bones,20);
  for(const character of pose.characters){assert.equal(character.floorError,0);for(const y of Object.values(character.footContacts))assert(Math.abs(y)<.012*character.height);}
  assert(pose.characters[0].height>pose.characters[1].height*2,'rat cannot be scaled to cat size');
  const project=projects.find(p=>p.id==='cat-eat-rat');await access(new URL(project.characterArtwork.slice(1),root));
  const selector=sceneRegistry.games.render();assert.match(selector,/original Cat and Rat models posed together/);
});

test('supplement presentation facts appear in the game discoveries with their source',()=>{
  const project=projects.find(item=>item.id==='plasteroids');
  assert.match(project.description,/thrust and turning/);
  const records=entries(project);
  assert.match(records[0].body,/Forward thrust, turning, and drag/);
  assert.match(records[0].body,/electric fields/);
  assert.match(records[1].body,/granular/);
  assert.match(records[1].body,/Mason, Bobby/);
  assert.match(records[2].body,/Three levels/);
  for(const index of [0,1,2])assert.match(records[index].body,/Source: supplied Plasteroids Final Showcase_Real/);
});

test('native animation metadata retains source timing, atlas coordinates and fixed frame scales',async()=>{
  const bird=GAME_ANIMATIONS['one-last-bird'];
  assert.equal(bird.clips.moveRight.frames.length,2);
  assert.equal(bird.clips.moveRight.duration,2/3);
  assert.notEqual(sampleClip(bird.clips.moveRight,0).src,sampleClip(bird.clips.moveRight,.34).src);
  assert.equal(sampleClip(bird.clips.moveRight,.7).src,sampleClip(bird.clips.moveRight,0).src);
  assert.equal(sampleClip(bird.clips.moveRight,.34,true).src,sampleClip(bird.clips.moveRight,0).src);
  const squid=GAME_ANIMATIONS.plasteroids;
  assert.deepEqual(squid.clips.idle.frames[0].rect,[0,0,430,430]);
  assert.deepEqual(squid.clips.move.frames[0].rect,[0,430,430,430]);
  assert.deepEqual(squid.clips.move.frames[1].rect,[430,430,430,430]);
  assert.equal(squid.clips.move.duration,.43333334);
  for(const data of Object.values(GAME_ANIMATIONS)) for(const clip of Object.values(data.clips)) {
    assert(clip.duration>0);assert(clip.frames.length>0);
    const times=clip.frames.map(frame=>frame.time);assert.deepEqual(times,[...times].sort((a,b)=>a-b));
    for(const frame of clip.frames){await access(new URL(frame.src.slice(1),root));assert(data.crop[0]+data.crop[2]<=frame.rect[2]);assert(data.crop[1]+data.crop[3]<=frame.rect[3]);}
  }
});

test('native character state machines keep direction, start/loop/end and reduced motion',()=>{
  class ReadyImage { complete=true;naturalWidth=1720; }
  const squid=createSpritePlayer('plasteroids',ReadyImage);
  assert.equal(squid.advance(.02,true).state,'start');
  assert.equal(squid.advance(.6,true).state,'move');
  assert.equal(squid.advance(.01,false).state,'end');
  assert.equal(squid.advance(2,false).state,'idle');
  assert.equal(squid.advance(.01,true,1,true).state,'idle');
  const bird=createSpritePlayer('one-last-bird',ReadyImage);
  const left=bird.advance(.01,true,-1);
  assert.equal(left.state,'moveLeft');assert.match(left.src,/bird-moveLeft/);assert.equal(left.flip,false);
  assert.equal(bird.advance(.01,true,1).state,'moveRight');
});

test('all seven games enter functional exploration worlds rather than conventional detail pages', async () => {
  const games=projects.filter(project=>project.category==='games');
  assert.equal(Object.keys(WORLD_LAYOUTS).length,games.length);
  for(const project of games) {
    const html=renderGameWorld(project);
    assert.match(html, /world-canvas/);
    if(project.id==='cat-eat-rat')assert.doesNotMatch(html, /world-journal/);else assert.match(html, /world-journal/);
    assert.match(html, /href="\/games\/"/);
    if(project.id!=='cat-eat-rat')assert.match(html, /href="\/"/);
    const destinationCount=project.id==='plasteroids'?4:project.id==='cat-eat-rat'?5:4;
    assert.equal((html.match(/data-discovery=/g)||[]).length,destinationCount);
    assert.equal((html.match(/data-move=/g)||[]).length,4);
    for(const asset of Object.values(GAME_WORLDS[project.id].assets).filter(value=>typeof value==='string')) await access(new URL(asset.slice(1),root));
  }
  const site=await readFile(new URL('assets/js/site.js',root),'utf8');
  assert.doesNotMatch(site, /searchParams.*explore|has\('explore'\)/);
  assert.ok(site.indexOf('else if (worldProject)')<site.indexOf('else if (isCreativePath'));
});

test('collision geometry contains the full footprint and every discovery is reachable',()=>{
  assert.equal(WORLD_LAYOUTS['one-last-bird'].mode,'flight');
  assert.equal(WORLD_LAYOUTS.plasteroids.mode,'descent');
  assert.equal(WORLD_LAYOUTS['cat-eat-rat'].mode,'rat-view');
  assert.equal(WORLD_LAYOUTS['chickens-nightmare-ue5'].mode,'first-person');
  assert.equal(roomFree(0,0),false);
  assert.equal(roomFree(1.05,1.05),false);
  for(const target of ROOM_STATIONS) {const path=roomPath(WORLD_LAYOUTS['chickens-nightmare-ue5'].start,target);assert(path.length>0);assert(path.every(point=>roomFree(...point)));}
  const layout=WORLD_LAYOUTS['chickens-breakout'];
  for(const [x,y,w]of layout.platforms){const landed=moveBody({x:x+w/2,y:y-layout.playerSize-10,vy:100},0,40,layout);assert.equal(landed.y+layout.playerSize,y);assert.equal(landed.grounded,true);}
  const overhang=moveBody({x:525,y:550,vy:100},0,40,layout);
  assert.notEqual(overhang.grounded,true,'one edge touching must not count as full-base support');
  assert.equal(moveBody({x:100,y:200},-10000,0,WORLD_LAYOUTS.plasteroids).x,36);
});

test('Breakout chapters reveal in rightward order without hiding on backtracking',()=>{
  assert.deepEqual(BREAKOUT_CHAPTERS,[180,560,960,1360]);
  assert.equal(orderedChapters(100),1);assert.equal(orderedChapters(450),2);
  assert.equal(orderedChapters(10,3),3);assert.equal(orderedChapters(2200),4);
  const html=renderGameWorld(projects.find(item=>item.id==='chickens-breakout'));
  assert.match(html,/breakout-story-world/);assert.equal((html.match(/data-chapter=/g)||[]).length,4);
});

test('Ocean has three native depths, a final boss arena and expanded animal-towed information',async()=>{
  assert(WORLD_LAYOUTS.plasteroids.height>WORLD_LAYOUTS.plasteroids.width*3);
  assert(WORLD_LAYOUTS.plasteroids.height<=7000,'longer reading distances must stay a bounded tour');
  assert.deepEqual([0,1799,1800,3599,3600,5399,5400].map(oceanLevel),[0,0,1,1,2,2,3]);
  assert.equal(verticalCamera(0,900),0);assert.equal(verticalCamera(OCEAN_WORLD.height,900),OCEAN_WORLD.height-900);
  assert.equal(oceanLevel(6000),3);assert.equal(OCEAN_LEVELS.length,4);
  for(const level of OCEAN_LEVELS){await access(new URL(level.fish.slice(1),root));await access(new URL(level.picture.slice(1),root));assert(GAME_ANIMATIONS[level.player]);assert(level.point[1]>=level.top&&level.point[1]<level.bottom);}
  const html=renderGameWorld(projects.find(item=>item.id==='plasteroids'));
  assert.equal((html.match(/data-ocean-reading/g)||[]).length,1);assert.equal((html.match(/class="fish-messenger"/g)||[]).length,1);
  assert.match(html,/data-ocean-ink/);assert.doesNotMatch(html,/Fold page/);
});

test('Ocean information is bounded and complete with reversible distance-driven fish handoffs',()=>{
  const project=projects.find(p=>p.id==='plasteroids'),cards=oceanCards(project),sequence=createOceanSequence(cards);
  assert.equal(cards.length,13);assert(cards.every(card=>card.body.split(/\s+/).length<=42));
  for(const level of [0,1,2])assert(new Set(cards.filter(c=>c.level===level).map(c=>c.animal)).size>=2);
  assert(new Set(cards.map(c=>c.direction)).size===2);
  assert(cards.some(c=>c.animal==='boss'&&c.level===3));assert(cards.at(-1).archive);
  const joined=cards.map(c=>c.body).join(' ');
  for(const fact of ['three lives','parents from mutation','Forward thrust','drag','spawning','breaking','electric fields','color','Bennett','Claire','Angela','Mason','Bobby','Avery','Subnautica','Geiger-counter','FM synthesis','muffling','echo','Real-time automation','grains','submarine','EDM bass','Unity'])assert(joined.includes(fact),fact+' must survive the editorial rewrite');
  assert.doesNotMatch(joined,/portfolio encounter|send three ink|original movement frames accompany/,'notes introduce the original game, not the browser wrapper');
  assert.equal(sequence.update(0),-1);
  const windows=sequence.snapshot().windows;
  for(let i=0;i<cards.length;i++){
    const window=windows[i];
    assert(window.enter<cards[i].depth&&cards[i].depth<window.hold&&window.hold<window.leave);
    assert(window.hold-cards[i].depth>=320,'every note needs at least 320 world units fully readable, versus the previous 32–132');
    if(i<cards.length-1)assert(window.leave<windows[i+1].enter,'old fish must leave before the next arrives');
    assert.equal(sequence.update(window.enter+1),i);assert.equal(sequence.snapshot().phase,'arriving');
    assert.equal(sequence.update(cards[i].depth),i);assert.equal(sequence.snapshot().phase,'reading');
    for(let repeat=0;repeat<20;repeat++)assert.equal(sequence.update(cards[i].depth),i,'stopping preserves the entire note');
    assert.equal(sequence.update(window.hold+1),i);assert.equal(sequence.snapshot().phase,'leaving');
    assert.equal(Math.sign(sequence.snapshot().offset),cards[i].direction==='right'?-1:1);
    assert.equal(sequence.update(window.leave),-1);
  }
  assert(windows.at(-1).leave<OCEAN_WORLD.maxDepth,'last messenger must leave before the reachable arena floor');
  assert.equal(sequence.snapshot().complete,true);
  assert.equal(sequence.update(cards[2].depth),2,'ascending/revisiting restores the correct depth note');
  assert.equal(sequence.snapshot().read,cards.length,'revisiting cannot double-count');
  assert.equal(sequence.update(NaN),2,'invalid model cannot destroy a delivery');
  const jumped=createOceanSequence(cards);assert.equal(jumped.update(cards[8].depth),8);assert.equal(jumped.snapshot().read,1,'direct depth travel must not claim unseen notes were read');
  const continuous=createOceanSequence(cards),order=[];let last=-1;
  for(let depth=180;depth<=OCEAN_WORLD.maxDepth;depth+=4){const active=continuous.update(depth);if(active>=0&&active!==last)order.push(active);last=active;}
  assert.deepEqual(order,cards.map((_,index)=>index));assert(continuous.snapshot().complete);
  assert.deepEqual(textPages('one two three four five',3),['one two three','four five']);
});

test('Ocean notes are passive: no movement gate, focus theft or scroll dead zone',async()=>{
  const ui=await readFile(new URL('assets/js/game-ui.js',root),'utf8');
  assert.doesNotMatch(ui.match(/export function worldUIBlocked[\s\S]*?\n}/)[0],/data-ocean-reading/);
  const ocean=await readFile(new URL('assets/js/ocean-expedition.js',root),'utf8');
  assert.doesNotMatch(ocean,/setOceanGate|panel\.focus|data-ocean-continue/);
  const experience=await readFile(new URL('assets/js/game-experiences.js',root),'utf8');
  assert.match(experience,/root\.addEventListener\('wheel'/);
  assert.match(experience,/event\.ctrlKey/,'browser zoom gesture is not swallowed');
});

test('Ocean introduction uses slide-backed game/production facts and real showcase pictures',async()=>{
  const cards=oceanCards(projects.find(project=>project.id==='plasteroids'));
  for(const card of cards){
    assert(card.slides&&/^[0-9, –]+$/.test(card.slides));
    await access(new URL(card.picture.slice(1),root));
  }
  assert(cards.filter(card=>/sound|electronic|team|visual|momentum|breaks/i.test(card.title)).length>=7);
  const html=renderGameWorld(projects.find(project=>project.id==='plasteroids'));
  assert.match(html,/data-ocean-source/);assert.match(html,/class="ocean-depth-gauge"/);assert.match(html,/aria-label="Descent progress"/);
});

test('Ocean descent has bounded native debris, moving texture layers and continuous depth colors',async()=>{
  for(const asset of OCEAN_DEBRIS){
    const bytes=await readFile(new URL(asset.src.slice(1),root)),width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20);
    assert(asset.crop[0]+asset.crop[2]<=width&&asset.crop[1]+asset.crop[3]<=height);
  }
  for(const point of OCEAN_LANDMARKS){
    const asset=OCEAN_DEBRIS[point.kind];assert(point.x-asset.width/2>=0&&point.x+asset.width/2<=700);
    assert(point.y+asset.width*asset.crop[3]/asset.crop[2]<OCEAN_WORLD.bossTop,'landmarks leave the full boss arena unobscured');
  }
  assert.notEqual(oceanWaterColor(100),oceanWaterColor(1700));assert.notEqual(oceanWaterColor(2000),oceanWaterColor(5300));
  for(const boundary of [1800,3600,5400])assert.equal(oceanWaterColor(boundary-.001),oceanWaterColor(boundary));
  const draws=[],ctx=new Proxy({drawImage(...args){draws.push(args);}},{get(target,key){return key in target?target[key]:()=>{};}});
  const images={ocean0:{complete:true,naturalWidth:2048,naturalHeight:289}};
  OCEAN_DEBRIS.forEach((_,i)=>{images['debris'+i]={complete:true,naturalWidth:1792,naturalHeight:1792};});
  drawOceanEnvironment(ctx,images,{cameraY:100,scale:1,height:800,depth:420});
  const shallow=draws.slice();draws.length=0;
  drawOceanEnvironment(ctx,images,{cameraY:600,scale:1,height:800,depth:920});
  assert(shallow.some(call=>call[0]===images.debris0));assert(draws.some(call=>call[0]===images.debris1));
  assert.notDeepEqual(shallow,draws,'travel reveals different native landmarks rather than a static flat backdrop');
});

test('Boss arena camera frames the whole boss, tentacles and player at every viewport',()=>{
  for(const [width,height]of [[1176,767],[390,844],[844,390]]){
    const camera=oceanCamera(6140,350,width,height);
    for(const part of BOSS_TENTACLES){const half=part.height*part.crop[2]/part.crop[3]/2;assert(part.x-half>=0&&part.x+half<=700);assert(part.y+part.height<=OCEAN_WORLD.height);}
    for(const [x,y]of [[0,5400],[700,6640],[350,5560],[75,6040],[350,6562]]){
      const px=(x-camera.cameraX)*camera.scale,py=(y-camera.cameraY)*camera.scale;
      assert(px>=-.001&&px<=width+.001);assert(py>=75&&py<=height-60);
    }
    assert.deepEqual(oceanCamera(6140,350,width,height),oceanCamera(OCEAN_WORLD.maxDepth,350,width,height),'arena stays framed while exploring');
    for(const y of [5150,5560]){const before=oceanCamera(y-.01,350,width,height),after=oceanCamera(y+.01,350,width,height);assert(Math.abs(after.scale-before.scale)<.001);}
  }
});

test('Native fish and boss rectangles never sample neighboring atlas cells or change pixel scale',async()=>{
  assert.equal(Object.keys(OCEAN_ANIMALS).length,9);
  for(const [name,data]of Object.entries(OCEAN_ANIMALS)){
    const clip=data.clips.move;assert(clip.frames.length>=3);assert(clip.duration>0);
    assert.notDeepEqual(sampleClip(clip,0),sampleClip(clip,clip.frames[1].time),name+' must animate');
    for(const frame of clip.frames){await access(new URL(frame.src.slice(1),root));assert.deepEqual(frame.logicalSize,data.crop.slice(2));assert(frame.trim[0]+frame.trim[2]<=frame.rect[2]);assert(frame.trim[1]+frame.trim[3]<=frame.rect[3]);assert(frame.offset[0]>=0&&frame.offset[1]>=0);}
  }
});

test('Sink is a supported recessed fixture with a faucet, drain and four complete base corners',()=>{
  const meshes=kitchenSinkGeometry();for(const part of ['cabinet','recessed basin','water','drain','faucet riser','faucet spout','tap outlet'])assert(meshes.some(m=>m.part===part));
  const base=meshes.find(m=>m.part==='cabinet').vertices.filter(v=>v[2]===0);assert.equal(base.length,4);
  for(const [x,y,z]of base){assert.equal(z,0);assert(x>=KITCHEN_SINK.footprint[0]-1e-9&&x<=KITCHEN_SINK.footprint[2]+1e-9);assert(y>=KITCHEN_SINK.footprint[1]-1e-9&&y<=KITCHEN_SINK.footprint[3]+1e-9);assert.equal(routeCell(Math.min(9.9999,Math.max(9.0001,x)),Math.min(2.9999,Math.max(2.0001,y)),WORLD_LAYOUTS['cat-eat-rat']),'2');}
  assert(meshes.find(m=>m.part==='recessed basin').vertices.every(v=>v[2]<KITCHEN_SINK.support));
  assert(meshes.every(m=>m.vertices.every(v=>v[2]>=0&&v[2]<=KITCHEN_SINK.top+.00001)));
});

test('Rat rewards restore distinct environment displays instead of generic note dialogs',()=>{
  const project=projects.find(p=>p.id==='cat-eat-rat'),info=kitchenInformation(project,2),html=renderGameWorld(project);
  assert.equal(new Set(info.map(item=>item.kind)).size,5);assert.equal(info[3].video,project.demoVideo);assert.match(info[4].text,/2 pieces/);
  assert.equal((html.match(/data-kitchen-wall=/g)||[]).length,5);assert.match(html,/rat-surveillance-video/);
  assert.doesNotMatch(html,/rat-projection-beam|data-kitchen-reveal|<dialog|rat-reveal-actions/);
  assert.match(renderGameWorld(projects.find(p=>p.id==='one-last-bird')),/world-journal/,'Bird retains its own reading experience');
});

test('Kitchen information is attached to full wall faces and follows the real camera on every viewport',()=>{
  const layout=WORLD_LAYOUTS['cat-eat-rat'];
  KITCHEN_SURFACES.forEach((surface,index)=>{
    const world=kitchenSurfaceQuad(surface);
    for(const [x,y,z]of world){assert(z>=0&&z<=1);assert.equal(routeCell(x-surface.normal[0]*.03,y-surface.normal[1]*.03,layout),'1','complete display backing is solid wall');}
    for(const [width,height]of [[1176,767],[390,844],[844,390]]){
      const [x,y]=kitchenReadingPoint(surface,{width,height});assert(roomFree(x,y,.18,layout,index+1),'reading position must fit the full rat footprint');
      const camera={x,y,width,height,routeIndex:index+1,angle:Math.atan2(surface.center[1]-y,surface.center[0]-x),pitch:0};
      const pose=projectKitchenSurface(surface,camera);assert(pose,'wall must remain visible from its reading position');
      for(const [i,[u,v]]of [[0,[0,0]],[1,[600,0]],[2,[600,pose.height]],[3,[0,pose.height]]]){
        const m=pose.matrix,w=m[3]*u+m[7]*v+1;
        assert(Math.abs((m[0]*u+m[4]*v+m[12])/w-pose.quad[i].x)<1e-6);
        assert(Math.abs((m[1]*u+m[5]*v+m[13])/w-pose.quad[i].y)<1e-6);
      }
      const turned=projectKitchenSurface(surface,{...camera,angle:camera.angle+.12});assert(turned);assert.notDeepEqual(turned.matrix,pose.matrix,'turning must change perspective rather than pinning a page to the screen');
      assert.equal(projectKitchenSurface(surface,{...camera,x:surface.center[0]-surface.normal[0],y:surface.center[1]-surface.normal[1]}),null,'no display through its back wall');
    }
  });
  assert(KITCHEN_SURFACES[4].bottom>.28,'mural clears the whole mouse-hole opening');
});

test('Kitchen walls persist across pickups and restore/reset without a modal or focus theft',()=>{
  const project=projects.find(p=>p.id==='cat-eat-rat'),announcer={textContent:''},moves=[];
  const panels=KITCHEN_SURFACES.map((_,index)=>{
    const copy={textContent:''},cheese={innerHTML:''},video=index===3?{src:'',pause(){this.pauses=(this.pauses||0)+1;}}:null;
    return {hidden:true,style:{},copy,cheese,video,querySelector(selector){return selector==='video'?video:selector==='[data-wall-copy]'?copy:cheese;}};
  });
  const root={dataset:{paused:'false'},querySelectorAll:()=>panels,querySelector:()=>announcer};
  const camera={x:3.5,y:3.5,width:1176,height:767,angle:Math.PI/2,pitch:.2,routeIndex:5};
  const engine={snapshot:()=>camera,walkTo:(...args)=>moves.push(args)},controller=new AbortController();
  const ui=mountKitchenReveal(root,project,engine,controller.signal);
  ui.restore(newRatState());assert(panels.every(p=>p.hidden));
  ui.restore({...newRatState(),collected:['cheese-a','water-a']});assert.equal(panels[0].hidden,false);assert.equal(panels[1].hidden,false);
  ui.restore({...newRatState(),collected:['cheese-a','water-a','cheese-b','water-b'],delivered:2,deposits:1});
  assert.equal(panels[3].video.src,project.demoVideo);assert.match(panels[4].copy.textContent,/2 pieces/);assert.equal((panels[4].cheese.innerHTML.match(/<img/g)||[]).length,2);
  controller.abort();assert(panels[3].video.pauses>0);
  ui.restore(newRatState());assert(panels.every(p=>p.hidden),'restart must remove every old wall reward');assert.equal(moves.length,0,'loading progress never moves or steals focus');
});

test('Rat pickups and deposits cannot duplicate rewards or deliver missing cheese',()=>{
  let state=newRatState();assert(validRatState(state));
  assert.equal(ratAction(state,'home').changed,false);
  for(const id of ['cheese-a','water-a','cheese-b','water-b']){state=ratAction(state,id).state;assert(validRatState(state));}
  assert.equal(state.carried,2);assert.equal(state.guns,2);
  assert.equal(ratAction(state,'cheese-a').changed,false);
  state=ratAction(state,'home').state;assert.equal(state.carried,0);assert.equal(state.delivered,2);assert.equal(state.deposits,1);assert(validRatState(state));
  assert.equal(ratAction(state,'home').changed,false);assert.equal(ratAction(state,'unknown').changed,false);
  assert(!validRatState({...state,carried:99}));assert(!validRatState({...state,collected:['cheese-a','cheese-a']}));
  assert(!validRatState({collected:['water-a'],carried:0,delivered:0,guns:1,deposits:0}),'stored progress cannot omit an earlier aisle pickup');
});

test('Rat props use full floor contact and one low camera, with reachable interaction points',()=>{
  const camera={x:2.5,y:3.5,angle:-Math.PI/2};
  const layout=WORLD_LAYOUTS['cat-eat-rat'];
  for(const object of RAT_OBJECTS){assert(roomFree(...object.point,.18,layout));assert(roomPath(layout.start,object.point,layout).length>0);
    for(const mesh of ratPropGeometry(object)){const contacts=mesh.vertices.filter(point=>point[2]===0);assert(contacts.length>=2);assert(mesh.vertices.every(point=>point[2]>=0));
      for(const point of contacts){const p=projectRatPoint(point,camera,1280,720);assert(Number.isFinite(p.x));assert(Number.isFinite(p.y));}}
  }
  assert.equal(WORLD_LAYOUTS['cat-eat-rat'].eye,.12);
  const duo=projects.find(item=>item.id==='cat-eat-rat');assert.match(duo.characterArtwork,/cat-rat-duo-original/);assert.equal(duo.characterAssetStatus,'original-game-model-posed-render');assert.equal(duo.characterVideo,undefined);
});

test('genuine 3D scenes have bent ordered routes with locally open observation spaces',()=>{
  for(const id of ['cat-eat-rat','chickens-nightmare-ue5']){
    const layout=WORLD_LAYOUTS[id];assert.equal(layout.orderedRoute,true);assert.equal(layout.corridor,undefined);
    assert(new Set(layout.stations.map(p=>p[0])).size>1);assert(new Set(layout.stations.map(p=>p[1])).size>1);
    let distance=0,previous=layout.start;
    for(const target of layout.stations){const path=roomPath(previous,target,layout);assert(path.length>0);assert(path.every(p=>roomFree(...p,.18,layout)));distance+=path.length;previous=target;}
    assert(distance<32,'tour must be compact without flattening the path');
    assert(roomFree(layout.start[0]+.3,layout.start[1],.18,layout,0),'start has safe lateral room');
    for(const gate of layout.gates){for(const [x,y] of gate.cells){assert.equal(routeCell(x+.5,y+.5,layout,gate.after-1),'3');assert.equal(routeCell(x+.5,y+.5,layout,gate.after),'0');}}
    for(const point of layout.spine)assert(routeLightDistance(layout,...point)<.001);
    assert.deepEqual(GAME_ROUTES[id].map,layout.map);
  }
  for(const id of ['five-nights-at-chickens','chickens-nightmare-gamemaker']){
    assert.equal(WORLD_LAYOUTS[id].mode,'fixed-camera');assert.equal(WORLD_LAYOUTS[id].corridor,undefined);
    assert.match(renderGameWorld(projects.find(project=>project.id===id)),/No free walking/);
  }
});

test('fixed views use original camera atlas rectangles, never generated corridor walls',async()=>{
  for(const id of ['five-nights-at-chickens','chickens-nightmare-gamemaker']){
    const assets=GAME_WORLDS[id].assets;assert.equal(assets.wall,undefined);assert.equal(assets.frames.length,4);
    for(const frame of assets.frames){await access(new URL(frame.src.slice(1),root));
      assert.match(frame.src,/security-cameras\/atlas/);assert.equal(frame.crop.length,4);
      assert(frame.crop[0]+frame.crop[2]<=2048);assert(frame.crop[1]+frame.crop[3]<=2048);
      assert.equal(frame.crop[2],frame.target[2]);assert.equal(frame.crop[3],frame.target[3]);
      assert(frame.target[0]+frame.target[2]<=frame.width);assert(frame.target[1]+frame.target[3]<=frame.height);
    }
  }
  const css=await readFile(new URL('assets/css/game-world.css',root),'utf8');
  for(const style of ['woodland','ocean','security','pixel-horror','kitchen','unreal'])assert.match(css,new RegExp('\\.world-'+style+' .*?(world-journal|ocean-page)'));
});

test('engine routes stop at every note, cannot skip ahead, and reset cleanly',()=>{
  const names=['Image','document','requestAnimationFrame','cancelAnimationFrame','matchMedia'];
  const previous=new Map(names.map(name=>[name,Object.getOwnPropertyDescriptor(globalThis,name)]));
  let callback,time=0;
  try {
    globalThis.Image=class {complete=true;naturalWidth=2048;naturalHeight=2048;};
    globalThis.document={hidden:false,documentElement:{dataset:{}}};globalThis.matchMedia=()=>({matches:false});
    globalThis.requestAnimationFrame=fn=>{callback=fn;return 1;};globalThis.cancelAnimationFrame=()=>{};
    const ctx=new Proxy({},{get:(target,key)=>target[key]||(()=>{}),set:(target,key,value)=>{target[key]=value;return true;}});
    const canvas=()=>({dataset:{},getContext:()=>ctx,getBoundingClientRect:()=>({width:320,height:240})});
    for(const id of ['cat-eat-rat','chickens-nightmare-ue5']){
      const arrivals=[];let engine;
      engine=createWorldEngine(canvas(),id,{geometryOnly:true,onArrive(index){arrivals.push(index);engine.acknowledgeStop(index);engine.pause(true);}});
      engine.key('up',true);for(let frame=0;frame<20;frame++){time+=1000/60;callback(time);}engine.key('up',false);
      assert.equal(arrivals.length,0,'manual approach must wait for deliberate inspection');engine.resetRoute();
      engine.visit(3,true);assert.deepEqual(arrivals,[0],'asking for a later stop must only visit the next one');
      for(let i=1;i<WORLD_LAYOUTS[id].stations.length;i++){
        engine.pause(false);engine.visit(i);
        for(let frame=0;frame<600&&arrivals.length<i+1;frame++){time+=1000/60;callback(time);}
        assert.equal(arrivals.at(-1),i);assert.equal(arrivals.length,i+1);
        const pose=engine.snapshot(),target=WORLD_LAYOUTS[id].stations[i];assert(Math.hypot(pose.x-target[0],pose.y-target[1])>.4,'arrival must stop in front of the discovery, not occupy it');
        engine.key('up',true);engine.look(.3,.1);for(let frame=0;frame<5;frame++){time+=1000/60;callback(time);}assert.deepEqual(engine.snapshot(),pose,'reading must preserve the full view');
      }
      const end=engine.snapshot();engine.pause(false);engine.key('down',true);engine.key('left',true);
      for(let frame=0;frame<30;frame++){time+=1000/60;callback(time);}
      assert.notEqual(engine.snapshot().angle,end.angle,'looking is not forced back to one axis');
      assert.equal(engine.snapshot().routeIndex,WORLD_LAYOUTS[id].stations.length,'local walking never reverses progress');
      const before=engine.snapshot();engine.visit(0);assert.equal(engine.snapshot().x,before.x);assert.equal(engine.snapshot().y,before.y,'reopening a read note must not teleport');
      engine.resetRoute();assert.equal(engine.snapshot().y,WORLD_LAYOUTS[id].start[1]);engine.visit(3,true);assert.equal(arrivals.at(-1),0);
      engine.resetRoute();engine.acknowledgeStop(0);engine.visit(1,true);assert.equal(arrivals.at(-1),1,'reading early with E must not reopen the previous checkpoint');engine.destroy();
    }
    const view=createWorldEngine(canvas(),'five-nights-at-chickens',{assets:GAME_WORLDS['five-nights-at-chickens'].assets});
    view.key('up',true);for(let frame=0;frame<20;frame++){time+=1000/60;callback(time);}assert.equal(view.snapshot().x,0);
    view.key('right',true);assert.equal(view.snapshot().x,1);view.visit(3);assert.equal(view.snapshot().x,3);view.destroy();
    const ratWalk=createWorldEngine(canvas(),'cat-eat-rat',{geometryOnly:true});
    assert.equal(ratWalk.walkTo([8.5,4.5],[7,5,.5]),false,'wall approaches cannot cross locked route gates');
    const surface=KITCHEN_SURFACES[0],point=kitchenReadingPoint(surface,ratWalk.snapshot()),look=[...surface.center,.455];
    assert.equal(ratWalk.walkTo(point,look),true);
    const start=ratWalk.snapshot();for(let i=0;i<5;i++){time+=1000/30;callback(time);}assert.notEqual(ratWalk.snapshot().y,start.y,'normal wall reading uses real walking, not teleportation');
    ratWalk.look(.1);const cancelled=ratWalk.snapshot();for(let i=0;i<40;i++){time+=1000/30;callback(time);}assert.equal(ratWalk.snapshot().y,cancelled.y,'manual looking cancels assisted approach');
    ratWalk.walkTo(point,look);for(let i=0;i<180;i++){time+=1000/30;callback(time);}assert(Math.hypot(ratWalk.snapshot().x-point[0],ratWalk.snapshot().y-point[1])<.07);assert.equal(ratWalk.snapshot().routeIndex,0,'reading never changes inventory/progression');
    ratWalk.resetRoute();ratWalk.walkTo(point,look,true);assert.equal(ratWalk.snapshot().x,point[0]);assert.equal(ratWalk.snapshot().y,point[1],'reduced-motion approach retains the same physical destination');ratWalk.destroy();
    for(const id of ['one-last-bird','chickens-breakout','plasteroids']){
      const arrivals=[];let engine;
      engine=createWorldEngine(canvas(),id,{geometryOnly:true,onArrive(index){arrivals.push(index);engine.pause(true);}});
      for(let index=0;index<WORLD_LAYOUTS[id].stations.length;index++){
        engine.pause(false);engine.visit(index);
        for(let frame=0;frame<(id==='plasteroids'?1500:600)&&arrivals.length<=index;frame++){time+=1000/60;callback(time);}
        assert.equal(arrivals.at(-1),index,`${id} must reach every adapted destination without a dead end`);
      }
      engine.destroy();
    }
    let bounds={width:320,height:240},renders=0;
    const resizedCanvas={dataset:{},getContext:()=>ctx,getBoundingClientRect:()=>bounds};
    const ocean=createWorldEngine(resizedCanvas,'plasteroids',{geometryOnly:true,onFrame(){renders++;}});
    ocean.setOceanGate(220);ocean.swimToDepth(3500,true);assert.equal(ocean.snapshot().y,220,'assisted diving respects an explicitly configured world boundary');
    ocean.pause(true);const count=renders;bounds={width:844,height:390};ocean.resize();assert.equal(renders,count+1,'paused resize must redraw the retained environment');assert.equal(ocean.snapshot().width,844);assert.equal(ocean.snapshot().height,390);assert.equal(ocean.snapshot().y,220);
    ocean.point(300,300);ocean.key('down',true);for(let i=0;i<5;i++){time+=1000/60;callback(time);}assert.equal(ocean.snapshot().y,220,'reading must block canvas and movement input');
    ocean.pause(false);ocean.setOceanGate(OCEAN_WORLD.maxDepth);ocean.key('down',true);
    for(let i=0;i<120;i++){time+=1000/60;ocean.pause(false);callback(time);}
    assert(ocean.snapshot().y>400,'passive fish visibility updates cannot clear a held swim key or gate depth at 220');
    ocean.key('down',false);const stopped=ocean.snapshot().y;
    for(let i=0;i<20;i++){time+=1000/60;callback(time);}assert.equal(ocean.snapshot().y,stopped,'releasing movement stops for reading');
    ocean.swimToDepth(OCEAN_WORLD.maxDepth);for(let i=0;i<4000;i++){time+=1000/60;callback(time);}assert.equal(ocean.snapshot().y,OCEAN_WORLD.maxDepth,'manual dive must reach the final fish departure and boss');
    ocean.swimToDepth(5760,true);ocean.setBossHits(99);assert.equal(resizedCanvas.dataset.bossHits,'3');ocean.destroy();
  } finally {for(const name of names){const descriptor=previous.get(name);if(descriptor)Object.defineProperty(globalThis,name,descriptor);else delete globalThis[name];}}
});

test('unread route gates cannot be bypassed and all rat objects remain completely floor-supported',()=>{
  for(const id of ['cat-eat-rat','chickens-nightmare-ue5']){
    const layout=WORLD_LAYOUTS[id];assert.equal(roomPath(layout.start,layout.stations.at(-1),layout,0).length,0);
    for(let i=0;i<layout.stations.length;i++){const start=i?layout.stations[i-1]:layout.start;assert(roomPath(start,layout.stations[i],layout,i).length>0);}
  }
  const layout=WORLD_LAYOUTS['cat-eat-rat'];
  for(const object of RAT_OBJECTS.filter(item=>item.kind!=='hole'))for(const mesh of ratPropGeometry(object))for(const [x,y,z] of mesh.vertices){assert(z>=0);assert.equal(routeCell(x,y,layout),'0','whole prop footprint is in the clear floor area');}
  assert.equal(ratAction(newRatState(),'water-a').changed,false,'a future pickup cannot bypass chapter ordering');
  const unreal=WORLD_LAYOUTS['chickens-nightmare-ue5'];
  for(const [x,y] of unreal.stations)for(const [dx,dy] of [[-.18,-.13],[.18,-.13],[.18,.13],[-.18,.13]])assert.equal(routeCell(x+dx,y+dy,unreal),'0','complete note-stand base must fit the floor');
});

test('portrait and landscape share one horizontal/vertical projection scale',()=>{
  const camera={x:0,y:0,angle:Math.PI/2,pitch:0};
  for(const [width,height] of [[1176,767],[390,844],[844,390]]){
    const a=projectRatPoint([-.1,2,0],camera,width,height),b=projectRatPoint([.1,2,0],camera,width,height),top=projectRatPoint([-.1,2,.1],camera,width,height);
    assert(Math.abs(Math.abs(b.x-a.x)/(a.y-top.y)-2)<.001,'a 2:1 world face must remain 2:1, never stretch on a phone');
  }
});

test('new supplied games preserve existing selection order and include local demo evidence', async () => {
  const games = projects.filter(project => project.category === 'games');
  assert.equal(games.length, 7);
  assert.equal(games[0].id, 'one-last-bird');
  for (const id of ['cat-eat-rat', 'plasteroids']) {
    const project = games.find(item => item.id === id);
    assert.equal(project.artworkStatus, 'supplied-gameplay-still');
    assert.equal(project.externalLinks.length, 0);
    await access(new URL(project.artwork.slice(1), root));
    await access(new URL(project.demoVideo.slice(1), root));
  }
  assert.match(games.find(game => game.id === 'plasteroids').credits, /Mason, Bobby/);
});

test('every entry and module shares the current content-derived release', async () => {
  execFileSync(process.execPath, ['scripts/sync-portfolio-release.mjs', '--check'], { cwd: fileURLToPath(repoRoot) });
  const pages = await Promise.all([...routes.map(route => `${route}index.html`), ...detailRoutes].map(route => readFile(new URL(route, root), 'utf8')));
  const revision = pages[0].match(/site\.js\?v=([a-f0-9]{12})/)[1];
  for (const page of pages) {
    assert.ok(page.includes(`site.js?v=${revision}`));
    assert.ok(page.includes(`site.css?v=${revision}`));
  }
  const site = await readFile(new URL('assets/js/site.js', root), 'utf8');
  assert.match(site, /pageshow/);
  assert.match(site, /event\.persisted.*location\.reload/);
  const rule = await readFile(new URL('.cursor/rules/portfolio-release-navigation.mdc', repoRoot), 'utf8');
  assert.match(rule, /alwaysApply: true/);
});

test('Room always navigates home regardless of category history', () => {
  for (const activeRoute of ['games', 'films', 'research', 'music', 'ai']) {
    for (const enteredFromRoom of [true, false]) {
      const destinations = [];
      SceneManager.prototype.returnToRoom.call({ activeRoute, enteredFromRoom, locked: false, historyReturnPending: false, navigate: route => destinations.push(route) });
      assert.deepEqual(destinations, ['home']);
    }
  }
});

test('annotation fixes keep the laptop supported and Games object-first', async () => {
  const transitions = await readFile(new URL('assets/js/transitions.js', root), 'utf8');
  const games = sceneRegistry.games.render();
  assert.match(transitions, /supportRect\.width \* \.88/);
  assert.match(transitions, /visibleLeft/);
  assert.match(transitions, /visibleRight/);
  assert.doesNotMatch(games, /games-select-header|games-select-hint/);
  assert.equal((games.match(/class="carousel-arrow/g) || []).length, 2);
  assert.equal((games.match(/class="character"/g) || []).length, 7);
  assert.match(games, /select-copy visually-hidden/);
  assert.match(games, /game-select-action select-button/);
  const gamesModule = await readFile(new URL('assets/js/scenes/games.js', root), 'utf8');
  assert.match(gamesModule, /selectAction\.href = games\[index\]\.detailRoute/);
});

test('every portfolio route has a static entry document', async () => {
  await Promise.all([...routes.map(route => access(new URL(`${route}index.html`, root))), ...detailRoutes.map(route => access(new URL(route, root)))]);
});

test('routes use the shared entry module and creative routes load the Game Shell CSS', async () => {
  const pages = await Promise.all(routes.map(route => readFile(new URL(`${route}index.html`, root), 'utf8')));
  for (const html of pages) {
    assert.match(html, /\/assets\/css\/site\.css/);
    assert.match(html, /type="module" src="\/assets\/js\/site\.js(?:\?[^"]+)?"/);
    assert.match(html, /<meta name="viewport"/);
  }
  const creativePages = await Promise.all(creativeRoutes.map(route => readFile(new URL(`${route}index.html`, root), 'utf8')));
  for (const html of creativePages) {
    assert.match(html, /\/assets\/css\/game-shell\.css/);
    assert.match(html, /viewport-fit=cover/);
  }
});

test('shared content preserves the complete inventory', async () => {
  const content = await readFile(new URL('assets/js/content.js', root), 'utf8');
  assert.equal((content.match(/detailRoute:/g) || []).length, 16);
  assert.equal((content.match(/^ {2}\['/gm) || []).length, 10);
});

test('the six immersive routes use a modular persistent shell', async () => {
  const [site, manager, camera, transitions, shell, menu, gameCss] = await Promise.all([
    readFile(new URL('assets/js/site.js', root), 'utf8'),
    readFile(new URL('assets/js/scene-manager.js', root), 'utf8'),
    readFile(new URL('assets/js/camera.js', root), 'utf8'),
    readFile(new URL('assets/js/transitions.js', root), 'utf8'),
    readFile(new URL('assets/js/game-shell.js', root), 'utf8'),
    readFile(new URL('assets/js/player-menu.js', root), 'utf8'),
    readFile(new URL('assets/css/game-shell.css', root), 'utf8')
  ]);
  assert.match(site, /new SceneManager/);
  assert.match(shell, /data-scene-host/);
  assert.match(shell, /data-room-backdrop/);
  assert.match(shell, /data-transition-layer/);
  assert.match(manager, /history\.pushState/);
  assert.match(manager, /history\.replaceState/);
  assert.match(manager, /popstate/);
  assert.match(manager, /historyReturnPending/);
  assert.match(manager, /navigationVersion/);
  assert.ok(manager.indexOf('history.pushState') < manager.indexOf('await this.transition.enter'));
  assert.match(manager, /game-hud.*inert = busy/);
  assert.match(manager, /ROOM_EXITING/);
  assert.match(manager, /SCENE_ENTERING/);
  assert.match(manager, /SCENE_EXITING/);
  assert.match(manager, /ROOM_ENTERING/);
  assert.match(camera, /getBoundingClientRect/);
  assert.match(transitions, /VirtualCamera/);
  assert.match(camera, /CAMERA_TRAVEL_PROFILES/);
  assert.match(camera, /compactScale/);
  assert.match(transitions, /captureBackdrop/);
  assert.match(transitions, /prepareBackdrop/);
  assert.match(transitions, /backdropState/);
  assert.match(transitions, /transition-measure-probe/);
  assert.match(transitions, /registry\.home\.render\(\{ preview: true \}\)/);
  assert.match(transitions, /roomObjectArt\(route, root\)/);
  assert.match(transitions, /revealInterface/);
  assert.match(transitions, /hideInterface/);
  assert.match(transitions, /interfaceDuration: 340/);
  assert.doesNotMatch(transitions, /morphTransform|morphDuration|exitMorphDuration/);
  assert.doesNotMatch(transitions, /outerHTML|transition-portal/);
  assert.doesNotMatch(transitions, /host\.style\.opacity\s*=/);
  assert.doesNotMatch(transitions, /crossfade/);
  assert.ok(Object.values(CAMERA_TRAVEL_PROFILES).every(profile => profile.scale > 1.5 && profile.compactScale > 1.5));
  assert.equal(CAMERA_TRAVEL_PROFILES.games.focusX, .5);
  assert.ok(CAMERA_TRAVEL_PROFILES.ai.scale >= 3.5, 'larger master laptop approaches with the complete supporting desk');
  assert.doesNotMatch(manager, /location\.href/);
  assert.match(gameCss, /height:\s*100dvh/);
  assert.match(gameCss, /\.game-scene/);
  assert.match(gameCss, /\.room-backdrop\.is-active/);
  assert.match(menu, />Projects</);
  assert.match(menu, />Skills &amp; Experience</);
  assert.match(menu, />Resume</);
  assert.match(menu, />About &amp; Contact</);
  assert.match(menu, />Credits</);
  assert.match(menu, />Settings</);
  assert.match(menu, />Return to Room</);
});

test('creative scene modules omit website category headers and footers', async () => {
  const names = ['room', 'games', 'films', 'research', 'music', 'ai'];
  const sources = await Promise.all(names.map(name => readFile(new URL(`assets/js/scenes/${name}.js`, root), 'utf8')));
  for (const source of sources) {
    assert.doesNotMatch(source, /experience-header/);
    assert.doesNotMatch(source, /<footer/);
    assert.doesNotMatch(source, /Return to room/i);
  }
});

test('category interfaces stay inside their physical Room objects', async () => {
  const expected = {
    games: { object: 'bird-character-select', surface: 'data-carousel="games"', asset: 'game-characters' },
    films: { object: 'camera', surface: 'data-film-browser', asset: 'camera-original.svg' },
    research: { object: 'book', surface: 'data-book', asset: 'cool-school-book.png' },
    music: { object: 'guitar-studio', surface: 'data-studio', asset: 'guitar-original.svg' },
    ai: { object: 'computer', surface: 'data-ai-system', asset: 'master/ai.svg' }
  };
  for (const [route, markers] of Object.entries(expected)) {
    const html = sceneRegistry[route].render();
    const preview = sceneRegistry[route].render({ preview: true });
    assert.equal((html.match(/<main/g) || []).length, 1);
    assert.equal((html.match(new RegExp(`data-object-interface="${markers.object}"`, 'g')) || []).length, 1);
    assert.match(html, new RegExp(markers.surface));
    assert.match(html, new RegExp(markers.asset.replace('.', '\\.')));
    assert.match(html, /data-category-interface/);
    assert.match(html, /class="game-scene object-scene/);
    assert.match(html, /id="main"/);
    assert.match(preview, new RegExp(`data-object-interface="${markers.object}"`));
    assert.doesNotMatch(preview, /id="main"/);
  }

  assert.match(sceneRegistry.games.render(), /data-asset-status="generated-concept"/);

  const css = await readFile(new URL('assets/css/game-shell.css', root), 'utf8');
  for (const selector of ['.games-character-ui', '.camera-viewfinder', '.book-object-shell', '.studio-rig', '.computer-perspective-frame', '.computer-screen-window']) {
    assert.match(css, new RegExp(selector.replace('.', '\\.')));
  }
  assert.doesNotMatch(css, /\.games-console(?:\s|\{|,)/);
  assert.match(css, /cool-school-wall\.png/);
  assert.match(css, /cool-school-floor\.png/);

  const music = sceneRegistry.music.render();
  assert.match(music, /role="tabpanel"/);
  assert.match(music, /aria-controls="music-performance-panel"/);
});

test('canonical creative path matching excludes detail and professional routes', () => {
  assert.equal(routeFromPath('/'), 'home');
  assert.equal(routeFromPath('/games/'), 'games');
  assert.equal(routeFromPath('/films/'), 'films');
  assert.equal(routeFromPath('/research/'), 'research');
  assert.equal(routeFromPath('/music/'), 'music');
  assert.equal(routeFromPath('/ai/'), 'ai');
  assert.equal(isCreativePath('/games/'), true);
  assert.equal(isCreativePath('/games/one-last-bird.html'), false);
  assert.equal(isCreativePath('/projects/'), false);
});

test('camera travel moves the full world toward a visible object at meaningful scale', () => {
  const desktopViewport = { left: 0, top: 0, width: 1440, height: 900 };
  const desktopTarget = { left: 930, top: 280, width: 72, height: 64 };
  const desktop = calculateTravelTransform(desktopTarget, desktopViewport, desktopViewport, CAMERA_TRAVEL_PROFILES.ai);
  const desktopCenterX = desktop.x + (desktopTarget.left + desktopTarget.width / 2) * desktop.scale;
  const desktopCenterY = desktop.y + (desktopTarget.top + desktopTarget.height / 2) * desktop.scale;
  assert.ok(Math.abs(desktopCenterX - desktopViewport.width * CAMERA_TRAVEL_PROFILES.ai.focusX) < .5);
  assert.ok(Math.abs(desktopCenterY - desktopViewport.height * CAMERA_TRAVEL_PROFILES.ai.focusY) < .5);
  assert.equal(desktop.scale, CAMERA_TRAVEL_PROFILES.ai.scale);

  const mobileViewport = { left: 0, top: 0, width: 390, height: 844 };
  const mobileTarget = { left: 244, top: 240, width: 58, height: 70 };
  const mobile = calculateTravelTransform(mobileTarget, mobileViewport, mobileViewport, CAMERA_TRAVEL_PROFILES.ai);
  assert.equal(mobile.scale, CAMERA_TRAVEL_PROFILES.ai.compactScale);
  assert.ok(mobile.x <= 0 && mobile.x >= mobileViewport.width - mobileViewport.width * mobile.scale);
  assert.ok(mobile.y <= 0 && mobile.y >= mobileViewport.height - mobileViewport.height * mobile.scale);
  assert.deepEqual(calculateTravelTransform(null, mobileViewport, mobileViewport), CAMERA_HOME);
});

test('Approved master supplies all five exact source cutouts and one shared camera', async () => {
  const html=sceneRegistry.home.render();
  assert.equal(MASTER_ROOM.approved,'2026-10-24');
  assert.equal(Object.keys(MASTER_OBJECTS).length,5);
  assert.equal((html.match(/data-room-object /g)||[]).length,5);
  for(const layer of ['master-background','master-workstation','master-foreground','master-lighting'])assert.match(html,new RegExp(layer));
  assert.doesNotMatch(html,/cool-school-|object-prompt|<kbd>|original-game-sprite/);
  assert.match(html,/master-derived-native-reference/);
  const payloads=[];
  for(const[name,o]of Object.entries(MASTER_OBJECTS)){
    const svg=await readFile(new URL(`assets/room/master/${name}.svg`,root),'utf8');
    assert(svg.includes(`viewBox="${o.box.join(' ')}"`));
    assert(svg.includes(o.path),'mask must retain approved source coordinates');
    payloads.push(svg.match(/base64,([^" ]+)/)[1]);
    assert.match(html,new RegExp(`href="/${name}/"`));
  }
  assert(payloads.every(p=>p===payloads[0]),'no independently regenerated object imagery');
  assert.equal(masterSupportReport().filter(o=>!o.valid||!o.footprintContained).length,0);
  assert.equal(masterContains([900,500],MASTER_ROOM.desk),true);
  assert.equal(masterContains([900,600],MASTER_ROOM.desk),false);
  assert.match(masterBoxStyle([0,0,1672,941]),/width:100%;height:100%/);
});

test('Master room is click-first, label-free, accessible and lifecycle-safe', async()=>{
  const html=sceneRegistry.home.render(),room=await readFile(new URL('assets/js/scenes/room.js',root),'utf8'),css=await readFile(new URL('assets/css/game-shell.css',root),'utf8');
  assert.match(html,/data-reveal-room/);
  assert.match(html,/Use Tab and Enter/);
  assert.doesNotMatch(html,/<kbd>|object-prompt|tabindex="-1"[^>]*data-room-object/);
  assert.match(room,/1500/);
  assert.match(room,/controller\.abort/);assert.match(room,/observer\.disconnect/);
  assert.match(room,/clearTimeout\(revealTimer\)/);assert.match(room,/document\.hidden/);assert.match(room,/isReducedMotion/);
  assert.match(room,/observer\.observe\(shell.*aria-busy/,'bird scheduling must resume when camera travel ends');
  assert.match(css,/data-idle-paused="true"[^}]*animation-play-state: paused/,'hidden-page idle cues must pause');
  assert.doesNotMatch(room,/--parallax|watchRoomGeometry|translateTo/);
  assert.match(room,/event\.pointerType!=='touch'/,'pointer motion cannot pan the room unless it is a deliberate touch drag');
  assert.match(css,/min-width: 44px; min-height: 44px/);
  assert.match(css,/stroke-dasharray: 7 4/);
  assert.match(css,/room-object:focus-visible::before \{ outline: none/,'focus must follow the silhouette instead of a bounding rectangle');
  assert.match(css,/aria-busy="true"[^}]*filter: none !important/);
  for(const[name,o]of Object.entries(MASTER_OBJECTS)){
    const[x,y,w,h]=o.box;assert(x>=0&&y>=0&&x+w<=1672&&y+h<=941,name);
    for(const[width,height]of [[1280,800],[390,844],[844,390]]){
      const scale=Math.min(width/1672,height/941);
      assert(Math.abs((w*scale)/(h*scale)-w/h)<1e-10,'uniform source projection');
    }
  }
});

test('All object highlights reuse their cutout contour with no rectangular focus or legacy halo',async()=>{
  const html=sceneRegistry.home.render(),css=await readFile(new URL('assets/css/game-shell.css',root),'utf8');
  assert.equal((html.match(/class="master-object-outline/g)||[]).length,5);
  for(const o of Object.values(MASTER_OBJECTS)){
    assert(html.includes(`viewBox="${o.box.join(' ')}" aria-hidden="true" focusable="false"`));
    assert(html.includes(`class="outline-rim" d="${o.path}"`),'outline and raster mask cannot drift to different polygons');
    const [x,y,w,h]=o.box;
    for(const pair of o.path.matchAll(/(?:M|L)(\d+) (\d+)/g)){
      assert(Number(pair[1])>=x&&Number(pair[1])<=x+w);
      assert(Number(pair[2])>=y&&Number(pair[2])<=y+h);
    }
  }
  assert.match(css,/vector-effect: non-scaling-stroke/);
  assert.match(css,/master-foreground[^}]*inset\(55\.260361% 0 39\.957492% 16\.985646%\)/,'the desk fascia must not overpaint the guitar contour');
  assert.match(css,/room-object:is\(:hover,:focus-visible\) :is\(\.object-art,\.master-object-image\) \{ filter: none/);
  assert.match(css,/walk-left[^}]*bird-outline[^}]*scaleX\(-1\)/,'facing changes must flip the matching outline with the bird');
  assert.match(css,/aria-busy="true"[^}]*master-object-outline[^}]*opacity: 0 !important/);
});

test('Portrait master framing preserves perspective and brings every keyboard target into view',()=>{
  for(const name of Object.keys(MASTER_OBJECTS)){
    const p=masterPanForObject(name,390,844);assert(p>=0&&p<=1);
    const[x,,w]=MASTER_OBJECTS[name].box,scale=844/941,left=(390-1672*scale)*p+x*scale;
    assert(left+w*scale>44&&left<346,`${name} must be reachable in the portrait camera`);
  }
  assert.equal(masterPanFromDrag(.5,1e5,390,844),0);
  assert.equal(masterPanFromDrag(.5,-1e5,390,844),1);
  assert(masterPanFromDrag(.5,-100,390,844)>.5);
  for(const birdX of [480,509,700,850,900]){
    const pan=masterPanForObject('games',390,844,birdX),scale=844/941;
    const center=(390-1672*scale)*pan+(birdX+101)*scale;
    assert(Math.abs(center-195)<1e-8,'keyboard framing must follow the live bird, not its original painted location');
  }
});

test('audio remains opt-in, persistent, and scene-aware', async () => {
  const audio = await readFile(new URL('assets/js/audio.js', root), 'utf8');
  assert.match(audio, /localStorage/);
  assert.match(audio, /setAmbienceActive/);
  assert.match(audio, /userGestureGranted/);
  assert.match(audio, /visibilitychange/);
});
