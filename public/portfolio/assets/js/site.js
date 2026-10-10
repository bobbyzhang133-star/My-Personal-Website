import { initAudio } from './audio.js?v=20261006-2';
import { renderGameShell } from './game-shell.js?v=20261006-2';
import { playerMenuMarkup, initPlayerMenu } from './player-menu.js?v=20261006-2';
import { professionalChrome, professionalFooter, initProfessionalPage, renderProfessionalPage } from './professional-pages.js?v=20261006-2';
import { SceneManager } from './scene-manager.js?v=20261006-2';
import { sceneRegistry } from './scenes/index.js?v=20261006-2';
import { isCreativePath, routeFromPath } from './utils.js?v=20261006-2';

const legacyHashRoutes = { games: '/games/', films: '/films/', banddream: '/music/', research: '/research/', about: '/about/', contact: '/about/', now: '/skills-experience/' };
const page = document.body.dataset.page || 'home';
const app = document.querySelector('#app');

if (page === 'home' && legacyHashRoutes[location.hash.slice(1)]) {
  location.replace(legacyHashRoutes[location.hash.slice(1)]);
} else if (isCreativePath(location.pathname)) {
  document.body.classList.add('game-mode');
  app.innerHTML = renderGameShell();
  document.body.insertAdjacentHTML('beforeend', playerMenuMarkup());
  const shell = document.querySelector('[data-game-shell]');
  const audio = initAudio(shell.querySelector('.sound-button'), {
    ambience: true,
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
