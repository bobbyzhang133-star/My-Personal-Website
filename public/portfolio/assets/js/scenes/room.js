import { categories } from '../content.js?v=20261006-2';
import { $$, esc, isReducedMotion } from '../utils.js?v=20261006-2';
import { ROOM_OBJECT_ASSETS } from './object-assets.js?v=20261006-2';
import { alignRoomGeometry, watchRoomGeometry } from './room-geometry.js?v=20261006-2';

export { alignRoomGeometry };

const assetRoot = '/assets/room/pixel/';

const roomState = {
  activeIndex: 0,
  birdX: 72,
  birdY: 69
};

function roomObjects() {
  return categories.map((category, index) => {
    const art = category.slug === 'games'
      ? '<span class="bird-sprite" aria-hidden="true"></span>'
      : `<img src="${ROOM_OBJECT_ASSETS[category.slug]}" alt="" aria-hidden="true">`;
    const anchor = `<span class="transition-anchor anchor-${category.slug}" data-transition-anchor="${category.slug}" aria-hidden="true"></span>`;
    const birdAttributes = category.slug === 'games'
      ? ' data-bird-route data-asset-status="temporary" data-state="idle"'
      : '';
    return `<a class="room-object object-${category.slug}" href="/${category.slug}/" data-scene-link="${category.slug}" data-transition-target="${category.slug}" data-room-object data-route-index="${index}" aria-label="${esc(`${category.title}: ${category.description}`)}"${birdAttributes}>
      <span class="object-parallax" data-depth="${({ games: 5, films: 4, research: 4, music: 3, ai: 3 })[category.slug]}"><span class="object-art">${art}${anchor}</span></span>
      <span class="object-prompt" aria-hidden="true"><strong>${esc(category.title)}</strong><kbd>E</kbd></span>
    </a>`;
  }).join('');
}

export function renderRoom({ preview = false } = {}) {
  const id = preview ? '' : ' id="main"';
  return `<main${id} class="game-scene room-scene" data-scene="home" tabindex="-1" aria-label="Bobby Zhang's interactive creative room">
    <span id="room-navigation-help" class="visually-hidden">Use Tab to enter the room, arrow keys to move among the five objects, and Enter or E to open a scene.</span>
    <div class="room-camera" data-camera-viewport>
      <section class="room-world" data-room-world data-room-stage aria-label="Interactive creative room" aria-describedby="room-navigation-help">
        <div class="room-extension" aria-hidden="true"><span class="extension-wall"></span><span class="extension-floor"></span></div>
        <div class="room-composition">
        <div class="room-layer room-background" data-depth="1" aria-hidden="true"><span class="wall-field"></span><span class="floor-field"></span></div>
        <div class="room-layer room-architecture" data-depth="2" aria-hidden="true">
          <img class="room-sprite architecture-window" src="${assetRoot}cool-school-window.png" alt="">
          <img class="room-sprite architecture-landscape" src="${assetRoot}cool-school-landscape.png" alt="">
        </div>
        <div class="room-layer room-floor-decals" data-depth="2" aria-hidden="true">
          <img class="room-rug" src="${assetRoot}rug-original.svg" alt="">
          ${['cabinet', 'books-left', 'books-right', 'low-shelf', 'desk', 'drawers', 'chair', 'guitar'].map(name => `<img class="room-contact-shadow" data-contact-shadow-for="${name}" src="${assetRoot}contact-shadow-original.svg" alt="">`).join('')}
        </div>
        <div class="room-layer room-furniture" data-depth="3" aria-hidden="true">
          <img class="room-sprite furniture-cabinet" src="${assetRoot}cool-school-cabinet-tall.png" alt="">
          <img class="room-sprite furniture-books-left" src="${assetRoot}cool-school-bookshelf-left.png" alt="">
          <img class="room-sprite furniture-books-right" src="${assetRoot}cool-school-bookshelf-right.png" alt="">
          <img class="room-sprite furniture-low-shelf" src="${assetRoot}cool-school-low-shelf.png" alt="">
          <img class="room-sprite furniture-desk" src="${assetRoot}cool-school-counter-long.png" alt="">
          <img class="room-sprite furniture-drawers" src="${assetRoot}cool-school-desk-drawers.png" alt="">
          <img class="room-sprite furniture-chair" src="${assetRoot}cool-school-chair-front.png" alt="">
          <img class="room-sprite furniture-globe" src="${assetRoot}cool-school-globe.png" alt="">
          <img class="room-sprite furniture-papers" src="${assetRoot}cool-school-papers.png" alt="">
        </div>
        <div class="room-support-anchors" aria-hidden="true">
          <span class="ground-anchor ground-anchor-rear" data-ground-plane="rear"></span>
          <span class="ground-anchor ground-anchor-workstation" data-ground-plane="workstation"></span>
          <span class="ground-anchor ground-anchor-middle" data-ground-plane="middle"></span>
          <span class="ground-anchor ground-anchor-front" data-ground-plane="front"></span>
          <span class="ground-anchor ground-anchor-bird" data-ground-plane="bird"></span>
          <span class="support-anchor-ai" data-support-anchor="ai"></span>
        </div>
        <nav class="room-objects" aria-label="Creative room objects">${roomObjects()}</nav>
        <div class="room-camera-anchors" aria-hidden="true">
          <span class="camera-anchor-games" data-camera-anchor="games"></span>
          <span class="camera-anchor-films" data-camera-anchor="films"></span>
          <span class="camera-anchor-research" data-camera-anchor="research"></span>
          <span class="camera-anchor-music" data-camera-anchor="music"></span>
          <span class="camera-anchor-ai" data-camera-anchor="ai"></span>
        </div>
        <div class="room-layer room-foreground" data-depth="5" aria-hidden="true"><img class="room-sprite foreground-counter" src="${assetRoot}cool-school-counter-long.png" alt=""></div>
        <div class="room-layer room-lighting" data-depth="1" aria-hidden="true"><img src="${assetRoot}lighting-overlay-original.svg" alt=""></div>
        <div class="room-location" aria-hidden="true"><span>ROOM 01</span><strong>Creative Studio</strong></div>
        <div class="room-status" aria-hidden="true"><span class="status-dot"></span><b>Room tone ready</b><span>Choose an object</span></div>
        </div>
      </section>
    </div>
  </main>`;
}

function initBird(stage, signal) {
  const route = stage.querySelector('[data-bird-route]');
  if (!route) return () => {};
  // The bird patrols laterally on one depth plane so both feet remain grounded.
  const desktopPoints = [[72, 69], [80, 69], [66, 69], [76, 69]];
  const mobilePoints = [[38, 70], [54, 70], [33, 70], [48, 70]];
  let pointIndex = 1;
  let timer;
  let interacting = false;

  const points = () => matchMedia('(max-width: 700px)').matches ? mobilePoints : desktopPoints;
  const savePosition = () => {
    roomState.birdX = Number.parseFloat(route.style.getPropertyValue('--bird-x')) || roomState.birdX;
    roomState.birdY = Number.parseFloat(route.style.getPropertyValue('--bird-y')) || roomState.birdY;
  };
  const schedule = (delay = 2600) => {
    clearTimeout(timer);
    if (interacting || document.hidden || isReducedMotion()) return;
    timer = setTimeout(() => {
      const currentX = Number.parseFloat(getComputedStyle(route).left) / route.offsetParent.clientWidth * 100;
      const [x, y] = points()[pointIndex++ % points().length];
      route.dataset.state = x < currentX ? 'walk-left' : 'walk-right';
      route.style.setProperty('--bird-x', `${x}%`);
      route.style.setProperty('--bird-y', `${y}%`);
      roomState.birdX = x;
      roomState.birdY = y;
      timer = setTimeout(() => {
        route.dataset.state = 'idle';
        schedule(3000);
      }, 1500);
    }, delay);
  };
  const pause = () => {
    interacting = true;
    clearTimeout(timer);
    route.dataset.state = 'idle';
    savePosition();
  };
  const resume = event => {
    if (event?.relatedTarget && route.contains(event.relatedTarget)) return;
    interacting = false;
    schedule(1800);
  };
  const visibility = () => document.hidden ? clearTimeout(timer) : schedule(900);
  route.addEventListener('pointerenter', pause, { signal });
  route.addEventListener('pointerleave', resume, { signal });
  route.addEventListener('focusin', pause, { signal });
  route.addEventListener('focusout', resume, { signal });
  document.addEventListener('visibilitychange', visibility, { signal });
  schedule();
  return () => {
    clearTimeout(timer);
    savePosition();
  };
}

export function mountRoom(root) {
  const controller = new AbortController();
  const { signal } = controller;
  const stage = root.querySelector('[data-room-stage]');
  const objects = $$('[data-room-object]', stage);
  root.classList.toggle('show-grounding-guides', new URLSearchParams(location.search).has('grounding-guides'));
  const stopGeometry = watchRoomGeometry(root, signal);

  const setRovingFocus = nextIndex => {
    roomState.activeIndex = (nextIndex + objects.length) % objects.length;
    objects.forEach((object, index) => { object.tabIndex = index === roomState.activeIndex ? 0 : -1; });
  };
  const focusObject = nextIndex => {
    setRovingFocus(nextIndex);
    objects[roomState.activeIndex].focus({ preventScroll: true });
  };

  setRovingFocus(roomState.activeIndex);
  objects.forEach((object, index) => object.addEventListener('focus', () => setRovingFocus(index), { signal }));
  stage.addEventListener('keydown', event => {
    if (!event.target.closest('[data-room-object]')) return;
    const direction = ({ ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 })[event.key];
    if (direction) {
      event.preventDefault();
      focusObject(roomState.activeIndex + direction);
    } else if (event.key === 'Home') {
      event.preventDefault();
      focusObject(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      focusObject(objects.length - 1);
    } else if (event.key.toLowerCase() === 'e') {
      event.preventDefault();
      event.target.closest('[data-room-object]').click();
    }
  }, { signal });

  const stopBird = initBird(stage, signal);
  return {
    cleanup() {
      controller.abort();
      stopGeometry();
      stopBird();
    },
    focusObject(route) {
      const index = categories.findIndex(category => category.slug === route);
      if (index >= 0) focusObject(index);
      else root.focus({ preventScroll: true });
    }
  };
}
