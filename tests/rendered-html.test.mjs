import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { SceneManager } from '../public/portfolio/assets/js/scene-manager.js';
import { WORLD_LAYOUTS, ROOM_STATIONS, roomPath, roomFree, moveBody } from '../public/portfolio/assets/js/world-engine.js';
import { GAME_WORLDS, renderGameWorld, entries } from '../public/portfolio/assets/js/game-world.js';
import { GAME_ANIMATIONS, sampleClip, createSpritePlayer } from '../public/portfolio/assets/js/game-animation.js';
import { BREAKOUT_CHAPTERS, orderedChapters, OCEAN_LEVELS, oceanLevel, verticalCamera, RAT_OBJECTS, newRatState, validRatState, ratAction, ratPropGeometry, projectRatPoint } from '../public/portfolio/assets/js/experience-state.js';
import { calculateTravelTransform, CAMERA_HOME, CAMERA_TRAVEL_PROFILES } from '../public/portfolio/assets/js/camera.js';
import { projects } from '../public/portfolio/assets/js/content.js';
import { sceneRegistry } from '../public/portfolio/assets/js/scenes/index.js';
import { isCreativePath, routeFromPath } from '../public/portfolio/assets/js/utils.js';

const root = new URL('../public/portfolio/', import.meta.url);
const repoRoot = new URL('../', import.meta.url);
const routes = ['', 'games/', 'films/', 'music/', 'research/', 'ai/', 'projects/', 'skills-experience/', 'resume/', 'about/'];
const creativeRoutes = ['', 'games/', 'films/', 'music/', 'research/', 'ai/'];
const detailRoutes = projects.map(project => project.detailRoute.replace(/^\//, ''));

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
    assert.match(html, /world-journal/);
    assert.match(html, /href="\/games\/"/);
    assert.match(html, /href="\/"/);
    const destinationCount=project.id==='plasteroids'?3:project.id==='cat-eat-rat'?5:4;
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
  for(const target of ROOM_STATIONS) {const path=roomPath([5.5,6.5],target);assert(path.length>0);assert(path.every(point=>roomFree(...point)));}
  const layout=WORLD_LAYOUTS['chickens-breakout'];
  for(const [x,y,w]of layout.platforms){const landed=moveBody({x:x+w/2,y:y-layout.playerSize-10,vy:100},0,40,layout);assert.equal(landed.y+layout.playerSize,y);assert.equal(landed.grounded,true);}
  const overhang=moveBody({x:525,y:550,vy:100},0,40,layout);
  assert.notEqual(overhang.grounded,true,'one edge touching must not count as full-base support');
  assert.equal(moveBody({x:100,y:200},-10000,0,WORLD_LAYOUTS.plasteroids).x,36);
});

test('Breakout chapters reveal in rightward order without hiding on backtracking',()=>{
  assert.deepEqual(BREAKOUT_CHAPTERS,[220,820,1470,2160]);
  assert.equal(orderedChapters(180),1);assert.equal(orderedChapters(700),2);
  assert.equal(orderedChapters(10,3),3);assert.equal(orderedChapters(2200),4);
  const html=renderGameWorld(projects.find(item=>item.id==='chickens-breakout'));
  assert.match(html,/breakout-story-world/);assert.equal((html.match(/data-chapter=/g)||[]).length,4);
});

test('Ocean is a vertical three-level map with one source fish and illustrated page per depth',async()=>{
  assert(WORLD_LAYOUTS.plasteroids.height>WORLD_LAYOUTS.plasteroids.width*4);
  assert.deepEqual([0,1499,1500,2999,3000,4499].map(oceanLevel),[0,0,1,1,2,2]);
  assert.equal(verticalCamera(0,900),0);assert.equal(verticalCamera(4500,900),3600);
  assert.equal(OCEAN_LEVELS.length,3);
  for(const level of OCEAN_LEVELS){await access(new URL(level.fish.slice(1),root));await access(new URL(level.picture.slice(1),root));assert(GAME_ANIMATIONS[level.player]);assert(level.point[1]>=level.top&&level.point[1]<level.bottom);}
  const html=renderGameWorld(projects.find(item=>item.id==='plasteroids'));
  assert.equal((html.match(/data-level-page=/g)||[]).length,3);assert.equal((html.match(/class="fish-messenger"/g)||[]).length,3);
  assert.match(html,/Original trash artwork from slide 11/);
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
});

test('Rat props use full floor contact and one low camera, with reachable interaction points',()=>{
  const camera={x:2.5,y:3.5,angle:-Math.PI/2};
  for(const object of RAT_OBJECTS){assert(roomFree(...object.point));assert(roomPath(WORLD_LAYOUTS['cat-eat-rat'].start,object.point).length>0);
    for(const mesh of ratPropGeometry(object)){const contacts=mesh.vertices.filter(point=>point[2]===0);assert(contacts.length>=2);assert(mesh.vertices.every(point=>point[2]>=0));
      for(const point of contacts){const p=projectRatPoint(point,camera,1280,720);assert(Number.isFinite(p.x));assert(Number.isFinite(p.y));}}
  }
  assert.equal(WORLD_LAYOUTS['cat-eat-rat'].eye,.12);
  const duo=projects.find(item=>item.id==='cat-eat-rat');assert.match(duo.characterArtwork,/cat-rat-duo/);assert.equal(duo.characterAssetStatus,'generated-presentation-concept');assert.equal(duo.characterVideo,undefined);
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
  assert.ok(CAMERA_TRAVEL_PROFILES.ai.scale >= 4);
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
    ai: { object: 'computer', surface: 'data-ai-system', asset: 'cool-school-computer-preferred-perspective.png' }
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

test('Home Room keeps layered licensed art, the shared woodpecker, and measured transition anchors', async () => {
  const [room, roomGeometry, siteCss, gameCss, transitions, credits, lighting, dimensionRule, travelRule] = await Promise.all([
    readFile(new URL('assets/js/scenes/room.js', root), 'utf8'),
    readFile(new URL('assets/js/scenes/room-geometry.js', root), 'utf8'),
    readFile(new URL('assets/css/site.css', root), 'utf8'),
    readFile(new URL('assets/css/game-shell.css', root), 'utf8'),
    readFile(new URL('assets/js/transitions.js', root), 'utf8'),
    readFile(new URL('CREDITS.md', root), 'utf8'),
    readFile(new URL('assets/room/pixel/lighting-overlay-original.svg', root), 'utf8'),
    readFile(new URL('.cursor/rules/image-dimension-grounding-checks.mdc', repoRoot), 'utf8'),
    readFile(new URL('.cursor/rules/room-camera-travel-continuity.mdc', repoRoot), 'utf8')
  ]);
  const roomAssets = ['cool-school-wall.png', 'cool-school-floor.png', 'cool-school-window.png', 'cool-school-book.png', 'cool-school-computer.png', 'camera-original.svg', 'guitar-original.svg', 'rug-original.svg', 'contact-shadow-original.svg', 'lighting-overlay-original.svg', 'bird-temporary-sprites.svg'];
  const computerPerspectives = ['cool-school-computer-preferred-perspective.png', 'cool-school-computer-mobile-perspective.png', 'cool-school-computer-wide-study.png', 'cool-school-computer-three-quarter-study.png'];
  const gameCharacters = ['one-last-bird-selector.png', 'chickens-breakout-selector.png', 'five-nights-at-chickens-selector.png', 'chickens-nightmare-gamemaker-selector.png', 'chickens-nightmare-ue5-selector.png'];
  const showBackdropBlock = transitions.slice(transitions.indexOf('showBackdrop('), transitions.indexOf('captureBackdrop('));
  await Promise.all([
    ...[...roomAssets, ...computerPerspectives].map(asset => access(new URL(`assets/room/pixel/${asset}`, root))),
    ...gameCharacters.map(asset => access(new URL(`assets/game-characters/${asset}`, root)))
  ]);
  assert.match(room, /room-background/);
  assert.match(room, /room-furniture/);
  assert.match(room, /room-foreground/);
  assert.match(room, /room-lighting/);
  assert.match(room, /data-asset-status="original-game-sprite"/);
  assert.match(room, /ROOM_OBJECT_ASSETS\.games/);
  assert.match(room, /data-transition-anchor/);
  assert.match(room, /data-support-anchor="ai"/);
  assert.match(room, /data-ground-plane="rear"/);
  assert.match(room, /data-ground-plane="workstation"/);
  assert.match(room, /data-contact-shadow-for/);
  assert.match(room, /room-sprite foreground-counter/);
  assert.match(room, /walk-left/);
  assert.match(room, /walk-right/);
  assert.doesNotMatch(room, /pointermove|--parallax-x|--parallax-y/);
  assert.doesNotMatch(lighting, /edgeShade|radialGradient/);
  assert.match(siteCss, /--object-glow|anchor-ai/);
  assert.match(siteCss, /wall-field\s*\{[^}]*height:\s*68%/);
  assert.match(siteCss, /floor-field\s*\{[^}]*top:\s*68%/);
  assert.match(siteCss, /furniture-books-left[^}]*translateY\(27\.083%\)/);
  assert.match(siteCss, /foreground-counter\s*\{[^}]*translateY\(27\.083%\)/);
  assert.match(siteCss, /room-object\s*\{[^}]*transition:\s*none/);
  assert.match(siteCss, /object-games\s*\{[^}]*transition:\s*left/);
  assert.doesNotMatch(siteCss, /object-games\s*\{[^}]*transition:[^;}]*top/);
  assert.match(siteCss, /object-art::after\s*\{\s*display:\s*none/);
  assert.match(gameCss, /extension-wall\s*\{[^}]*height:\s*68%/);
  assert.match(gameCss, /extension-floor\s*\{[^}]*top:\s*68%/);
  assert.match(gameCss, /object-scene\s*\{[^}]*background:\s*transparent/);
  assert.match(gameCss, /object-scene::before,.object-scene::after\s*\{\s*display:\s*none/);
  assert.match(gameCss, /room-backdrop::before,.room-backdrop::after/);
  assert.match(gameCss, /room-backdrop\s*>\s*\.room-scene\s*\{[^}]*background:\s*transparent/);
  assert.match(gameCss, /support-anchor-ai\s*\{[^}]*top:\s*54%/);
  assert.match(gameCss, /room-backdrop \[data-room-object\]\[data-shared-object="games"\]\s*\{\s*opacity:\s*1/);
  assert.match(transitions, /alignSceneObject\(route\)/);
  assert.match(transitions, /1113\s*\/\s*1194/);
  assert.match(transitions, /supportRect\.top\s*-\s*hostRect\.top/);
  assert.match(transitions, /watchSceneAlignment\(route\)/);
  assert.match(transitions, /registry\.home\.align/);
  assert.doesNotMatch(showBackdropBlock, /registry\.home\.align/);
  assert.match(transitions, /activeShadow\.hidden\s*=\s*true/);
  assert.match(transitions, /route\s*===\s*['"]music['"]\s*\?\s*['"]guitar['"]/);
  assert.match(roomGeometry, /FLOOR_ITEMS/);
  assert.match(roomGeometry, /SUPPORTED_ITEMS/);
  assert.match(roomGeometry, /contacts:\s*\[\[/);
  assert.match(roomGeometry, /projectPoints/);
  assert.match(roomGeometry, /mobileSupport:\s*'\.furniture-books-left'/);
  assert.match(roomGeometry, /groundingFailures/);
  assert.match(roomGeometry, /name:\s*'bird'[^\n]*contacts:/);
  assert.match(roomGeometry, /data-contact-shadow-for/);
  assert.match(roomGeometry, /optionalWhenHidden:\s*true/);
  assert.match(roomGeometry, /unexpectedly-hidden/);
  assert.match(roomGeometry, /footprintContained/);
  assert.match(siteCss, /object-research\s*\{[^}]*top:\s*72\.45%/);
  assert.match(siteCss, /object-research\s*\{[^}]*top:\s*84\.35%/);
  assert.match(siteCss, /foreground-counter\s*\{[^}]*height:\s*22%/);
  assert.match(dimensionRule, /alwaysApply:\s*true/);
  assert.match(dimensionRule, /transparent padding/);
  assert.match(dimensionRule, /390 × 844/);
  assert.match(dimensionRule, /projected footprint/);
  assert.match(dimensionRule, /Do not accept edge-only contact/);
  assert.match(dimensionRule, /perspective grid/i);
  assert.match(travelRule, /alwaysApply:\s*true/);
  assert.match(travelRule, /complete Room world/);
  assert.match(travelRule, /Do not simulate player approach/);
  assert.match(travelRule, /Games\/Bird/);
  assert.match(credits, /Cool School tileset/);
  assert.match(credits, /CC0 1\.0/);
  assert.match(credits, /Computer perspective derivatives/);
  assert.match(credits, /OpenAI ImageGen/);
  assert.match(credits, /actual One Last Bird sprite was not found/);
});

test('audio remains opt-in, persistent, and scene-aware', async () => {
  const audio = await readFile(new URL('assets/js/audio.js', root), 'utf8');
  assert.match(audio, /localStorage/);
  assert.match(audio, /setAmbienceActive/);
  assert.match(audio, /userGestureGranted/);
  assert.match(audio, /visibilitychange/);
});
