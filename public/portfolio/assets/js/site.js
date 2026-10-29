import { initAudio } from './audio.js?v=43292090dc3e';
import { renderGameShell } from './game-shell.js?v=43292090dc3e';
import { playerMenuMarkup, initPlayerMenu } from './player-menu.js?v=43292090dc3e';
import { professionalChrome, professionalFooter, initProfessionalPage, renderProfessionalPage } from './professional-pages.js?v=43292090dc3e';
import { SceneManager } from './scene-manager.js?v=43292090dc3e';
import { sceneRegistry } from './scenes/index.js?v=43292090dc3e';
import { isCreativePath, routeFromPath } from './utils.js?v=43292090dc3e';
import { gameWorldProject, renderGameWorld, mountGameWorld } from './game-world.js?v=43292090dc3e';

const legacyHashRoutes = { games: '/games/', films: '/films/', banddream: '/music/', research: '/research/', about: '/about/', contact: '/about/', now: '/skills-experience/' };
const page = document.body.dataset.page || 'home';
const app = document.querySelector('#app');
// All game details enter their explorable setting; ?geometry preserves the art-free QA view.
const worldProject = page === 'detail' ? gameWorldProject(document.body.dataset.project) : null;

// Browser Back may restore a complete old document without fetching its assets.
// Revalidate restored pages instead of reusing a previous application release.
addEventListener('pageshow', event => {
  if (event.persisted) location.reload();
});

if (page === 'home' && legacyHashRoutes[location.hash.slice(1)]) {
  location.replace(legacyHashRoutes[location.hash.slice(1)]);
} else if (worldProject) {
  document.body.classList.add('world-mode');
  app.innerHTML = renderGameWorld(worldProject);
  document.body.insertAdjacentHTML('beforeend', playerMenuMarkup({gameProject:worldProject}));
  const gameSoundButton=app.querySelector('.sound-button');
  if(gameSoundButton)initAudio(gameSoundButton);
  initPlayerMenu({ onReturnRoom: () => location.assign('/') });
  mountGameWorld(app.querySelector('[data-game-world]'), worldProject);
} else if (isCreativePath(location.pathname)) {
  document.body.classList.add('game-mode');
  app.innerHTML = renderGameShell();
  document.body.insertAdjacentHTML('beforeend', playerMenuMarkup({sceneStyle:'studio'}));
  const shell = document.querySelector('[data-game-shell]');
  const audio = initAudio(document.querySelector('[data-sound-toggle]'), {
    ambience: true,
    defaultEnabled: true,
    storageKey: 'bz-studio-sound-v2',
    ambienceSrc: '/assets/audio/roomtone-bedroom-yew.mp3'
  });
  const manager = new SceneManager({
    shell,
    host: shell.querySelector('[data-scene-host]'),
    layer: shell.querySelector('[data-transition-layer]'),
    backdrop: shell.querySelector('[data-room-backdrop]'),
    registry: sceneRegistry,
    audio
  });
  const menu = initPlayerMenu({ onReturnRoom: () => manager.returnToRoom() });
  manager.onNavigate = menu.closeForNavigation;
  manager.start(routeFromPath());
} else {
  document.body.classList.add('professional-mode');
  app.innerHTML = `${professionalChrome(page)}${renderProfessionalPage(page)}${professionalFooter()}`;
  document.body.insertAdjacentHTML('beforeend', playerMenuMarkup());
  initAudio(app.querySelector('.sound-button'));
  initPlayerMenu({ onReturnRoom: () => location.assign('/') });
  initProfessionalPage();
}

requestAnimationFrame(() => document.body.classList.add('ready'));
