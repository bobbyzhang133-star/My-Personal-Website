import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';
import { calculateTravelTransform, CAMERA_HOME, CAMERA_TRAVEL_PROFILES } from '../public/portfolio/assets/js/camera.js';
import { projects } from '../public/portfolio/assets/js/content.js';
import { sceneRegistry } from '../public/portfolio/assets/js/scenes/index.js';
import { isCreativePath, routeFromPath } from '../public/portfolio/assets/js/utils.js';

const root = new URL('../public/portfolio/', import.meta.url);
const repoRoot = new URL('../', import.meta.url);
const routes = ['', 'games/', 'films/', 'music/', 'research/', 'ai/', 'projects/', 'skills-experience/', 'resume/', 'about/'];
const creativeRoutes = ['', 'games/', 'films/', 'music/', 'research/', 'ai/'];
const detailRoutes = projects.map(project => project.detailRoute.replace(/^\//, ''));

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
  assert.equal((content.match(/detailRoute:/g) || []).length, 14);
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
  assert.ok(CAMERA_TRAVEL_PROFILES.games.focusX >= .8);
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

test('Home Room keeps layered licensed art, a temporary bird, and measured transition anchors', async () => {
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
  assert.match(room, /data-asset-status="temporary"/);
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
