import { CAMERA_HOME, VirtualCamera } from './camera.js?v=0985987b2294';
import { isReducedMotion, nextFrame } from './utils.js?v=0985987b2294';

export const OBJECT_TRANSITIONS = Object.freeze({
  games: { cameraDuration: 940, interfaceDuration: 320, exitInterfaceDuration: 220, restoreDuration: 820 },
  films: { cameraDuration: 900, interfaceDuration: 300, exitInterfaceDuration: 210, restoreDuration: 800 },
  research: { cameraDuration: 920, interfaceDuration: 320, exitInterfaceDuration: 220, restoreDuration: 810 },
  music: { cameraDuration: 900, interfaceDuration: 300, exitInterfaceDuration: 210, restoreDuration: 800 },
  ai: { cameraDuration: 940, interfaceDuration: 340, exitInterfaceDuration: 230, restoreDuration: 830 }
});

const DEFAULT_TRANSITION = Object.freeze({ cameraDuration: 900, interfaceDuration: 300, exitInterfaceDuration: 210, restoreDuration: 800 });

async function play(element, keyframes, options) {
  if (!element) return;
  if (!element.animate) {
    Object.assign(element.style, keyframes.at(-1));
    return;
  }
  const animation = element.animate(keyframes, { fill: 'forwards', ...options });
  try {
    await animation.finished;
  } catch {
    // A superseding navigation may cancel an in-flight visual without breaking routing.
  }
  return animation;
}

function clearInlineMotion(element) {
  if (!element) return;
  (element.getAnimations?.() || []).forEach(animation => animation.cancel());
  for (const property of ['transform', 'transform-origin', 'will-change', 'opacity', 'clip-path']) {
    element.style.removeProperty(property);
  }
}

function transitionProfile(route) {
  return { ...DEFAULT_TRANSITION, ...OBJECT_TRANSITIONS[route] };
}

export class TransitionDirector {
  constructor({ host, layer, backdrop, registry }) {
    this.host = host;
    this.layer = layer;
    this.backdrop = backdrop;
    this.registry = registry;
    this.generation = 0;
    this.camera = null;
    this.backdropState = { ...CAMERA_HOME };
    this.activeElements = new Set();
    this.alignmentController = null;
  }

  begin() {
    this.alignmentController?.abort();
    this.alignmentController = null;
    this.clear();
    return this.generation;
  }

  isCurrent(generation) {
    return generation === this.generation;
  }

  roomTarget(route, root = this.host) {
    return root.querySelector(`[data-transition-anchor="${route}"]`) || root.querySelector(`[data-transition-target="${route}"]`);
  }

  roomCameraTarget(route, root = this.host) {
    return this.roomObjectArt(route, root) || root.querySelector(`[data-camera-anchor="${route}"]`) || this.roomTarget(route, root);
  }

  roomObjectArt(route, root = this.host) {
    return root.querySelector(`.object-${route} .object-art > img, .object-${route} .bird-sprite`);
  }

  alignSceneObject(route) {
    if (route !== 'ai') return;
    const masterObject=this.backdrop?.querySelector('.master-room .object-ai .master-object-image');
    const masterComputer=this.host.querySelector('.computer-object');
    if(masterObject && masterComputer) {
      const art=masterObject.getBoundingClientRect(),host=this.host.getBoundingClientRect();
      masterComputer.dataset.masterAligned='true';
      Object.assign(masterComputer.style,{width:`${art.width}px`,height:`${art.height}px`,left:`${art.left-host.left+art.width/2}px`,top:`${art.top-host.top}px`,bottom:'auto'});
      const screen=masterComputer.querySelector('.computer-screen-window');
      if(screen) {
        const glassLeft=art.left+art.width*54/406,glassRight=glassLeft+art.width*293/406;
        const visibleLeft=Math.max(glassLeft,host.left+12),visibleRight=Math.min(glassRight,host.right-12);
        screen.style.left=`${visibleLeft-art.left}px`;
        screen.style.width=`${Math.max(0,visibleRight-visibleLeft)}px`;
      }
      return;
    }
    const support = this.backdrop?.querySelector('[data-support-anchor="ai"]');
    const computer = this.host.querySelector('.computer-object');
    if (!support || !computer) return;
    const supportRect = support.getBoundingClientRect();
    const hostRect = this.host.getBoundingClientRect();
    // Fit the entire meaningful base inside the desk, not merely its bottom edge.
    computer.style.width = `${supportRect.width * .88}px`;
    computer.style.left = `${supportRect.left - hostRect.left + supportRect.width / 2}px`;
    const computerRect = computer.getBoundingClientRect();
    if (supportRect.width <= 0 || computerRect.height <= 0) return;
    // Alpha-bound scan: the meaningful laptop base ends at row 1113/1194.
    // Rows below it are only 1–2 alpha cleanup fringe and must not create a gap.
    const visibleBottomRatio = 1113 / 1194;
    computer.style.top = `${supportRect.top - hostRect.top - computerRect.height * visibleBottomRatio}px`;
    computer.style.bottom = 'auto';
    const screen = computer.querySelector('.computer-screen-window');
    if (screen) {
      // Keep the live controls within the visible glass when portrait crops the shell.
      const glassLeft = computerRect.left + computerRect.width * .1412;
      const glassRight = glassLeft + computerRect.width * .7168;
      const visibleLeft = Math.max(glassLeft, hostRect.left + 12);
      const visibleRight = Math.min(glassRight, hostRect.right - 12);
      screen.style.left = `${visibleLeft - computerRect.left}px`;
      screen.style.width = `${Math.max(0, visibleRight - visibleLeft)}px`;
    }
  }

  watchSceneAlignment(route) {
    this.alignmentController?.abort();
    this.alignmentController = new AbortController();
    const update = () => this.alignSceneObject(route);
    update();
    requestAnimationFrame(update);
    document.fonts?.ready?.then(update);
    window.addEventListener('resize', () => {
      const room=this.backdrop?.querySelector('.master-room');
      const viewport=room?.querySelector('[data-camera-viewport]'),world=room?.querySelector('[data-room-world]');
      const target=room && this.roomCameraTarget(route,room);
      if(viewport && world && target) {
        // Recompute from unscaled source coordinates; never compound the previous zoom.
        world.style.transform='';
        const camera=new VirtualCamera(viewport,world);
        this.backdropState=camera.focusInstant(target,route);
      }
      update();
    }, { signal: this.alignmentController.signal });
  }

  sanitizeBackdrop(root, route) {
    root.querySelectorAll('[id]').forEach(element => element.removeAttribute('id'));
    root.querySelectorAll('[tabindex]').forEach(element => element.removeAttribute('tabindex'));
    root.querySelectorAll('a[href]').forEach(element => element.removeAttribute('href'));
    const active = root.querySelector(`[data-room-object].object-${route}`);
    if (active) {
      active.dataset.backdropActive = 'true';
      active.dataset.sharedObject = route;
      active.removeAttribute('data-activated');
    }
    const shadowName = route === 'music' ? 'guitar' : route;
    const activeShadow = root.querySelector(`[data-contact-shadow-for="${shadowName}"]`);
    if (activeShadow) activeShadow.hidden = true;
    return root;
  }

  showBackdrop(root, route, state = CAMERA_HOME) {
    if (!this.backdrop || !root) return;
    this.sanitizeBackdrop(root, route);
    this.backdrop.replaceChildren(root);
    this.backdrop.classList.add('is-active');
    // A captured room already contains measured local translations. Re-aligning
    // after camera zoom would mix screen pixels with scaled scene coordinates.
    this.backdropState = { ...state };
  }

  captureBackdrop(room, route) {
    if (!room) return;
    this.showBackdrop(room.cloneNode(true), route, this.camera?.state || CAMERA_HOME);
  }

  prepareBackdrop(route) {
    if (!this.backdrop || route === 'home') {
      this.clearBackdrop();
      return;
    }
    const template = document.createElement('template');
    template.innerHTML = this.registry.home.render({ preview: true }).trim();
    const room = template.content.firstElementChild;
    if (!room) return;
    this.backdrop.replaceChildren(room);
    this.backdrop.classList.add('is-active');
    this.registry.home.align?.(room);
    const viewport = room.querySelector('[data-camera-viewport]');
    const world = room.querySelector('[data-room-world]');
    const target = this.roomCameraTarget(route, room);
    if (viewport && world && target) {
      const camera = new VirtualCamera(viewport, world);
      this.backdropState = camera.focusInstant(target, route);
    } else {
      this.backdropState = { ...CAMERA_HOME };
    }
    this.sanitizeBackdrop(room, route);
  }

  clearBackdrop() {
    this.backdrop?.classList.remove('is-active');
    this.backdrop?.replaceChildren();
    this.backdropState = { ...CAMERA_HOME };
  }

  measureRoomObject(route) {
    const probe = document.createElement('div');
    probe.className = 'transition-measure-probe';
    probe.inert = true;
    probe.setAttribute('aria-hidden', 'true');
    probe.innerHTML = this.registry.home.render({ preview: true });
    this.layer.replaceChildren(probe);
    this.layer.style.display = 'block';
    this.layer.style.visibility = 'hidden';
    this.registry.home.align?.(probe);
    const rect = this.roomObjectArt(route, probe)?.getBoundingClientRect();
    const measurement = rect ? DOMRect.fromRect(rect) : null;
    this.layer.replaceChildren();
    this.layer.style.removeProperty('display');
    this.layer.style.removeProperty('visibility');
    return measurement;
  }

  track(...elements) {
    elements.filter(Boolean).forEach(element => this.activeElements.add(element));
  }

  async revealInterface(root, duration) {
    const element = root?.querySelector('[data-category-interface]');
    if (!element || isReducedMotion()) return;
    this.track(element);
    element.style.opacity = '0';
    element.style.transform = 'translate3d(0,12px,0)';
    element.style.willChange = 'opacity, transform';
    await nextFrame();
    await play(element, [
      { opacity: 0, transform: 'translate3d(0,12px,0)' },
      { opacity: 1, transform: 'translate3d(0,0,0)' }
    ], { duration, easing: 'cubic-bezier(.16,1,.3,1)' });
    clearInlineMotion(element);
    this.activeElements.delete(element);
  }

  async hideInterface(root, duration) {
    const element = root?.querySelector('[data-category-interface]');
    if (!element || isReducedMotion()) return;
    this.track(element);
    await play(element, [
      { opacity: 1, transform: 'translate3d(0,0,0)' },
      { opacity: 0, transform: 'translate3d(0,8px,0)' }
    ], { duration, easing: 'cubic-bezier(.4,0,1,1)' });
  }

  clear() {
    this.generation += 1;
    this.camera?.destroy();
    this.camera = null;
    this.activeElements.forEach(clearInlineMotion);
    this.activeElements.clear();
    (this.host.getAnimations?.({ subtree: false }) || []).forEach(animation => animation.cancel());
    (this.layer.getAnimations?.({ subtree: true }) || []).forEach(animation => animation.cancel());
    this.host.style.removeProperty('opacity');
    this.layer.classList.remove('is-active');
    this.layer.replaceChildren();
    for (const property of ['background-color', 'display', 'visibility']) this.layer.style.removeProperty(property);
  }

  async replace(route, mount, onEntering = () => {}) {
    const generation = this.begin();
    this.prepareBackdrop(route);
    onEntering();
    mount();
    this.watchSceneAlignment(route);
    await this.revealInterface(this.host.querySelector('[data-scene]'), transitionProfile(route).interfaceDuration);
    if (this.isCurrent(generation)) this.clear();
  }

  async enter(route, mount, onSceneEntering = () => {}) {
    const generation = this.begin();
    const profile = transitionProfile(route);
    const room = this.host.querySelector('.room-scene');
    const viewport = room?.querySelector('[data-camera-viewport]');
    const world = room?.querySelector('[data-room-world]');
    const focusTarget = this.roomCameraTarget(route);
    const object = room?.querySelector(`[data-room-object].object-${route}`);

    if (isReducedMotion() || !viewport || !world || !focusTarget || !object) {
      this.prepareBackdrop(route);
      onSceneEntering();
      mount();
      this.watchSceneAlignment(route);
      if (this.isCurrent(generation)) this.clear();
      return;
    }

    this.camera = new VirtualCamera(viewport, world);
    object.setAttribute('data-activated', 'true');
    await this.camera.focus(focusTarget, route, { duration: profile.cameraDuration });
    if (!this.isCurrent(generation)) return;

    this.captureBackdrop(room, route);
    onSceneEntering();
    mount();
    this.watchSceneAlignment(route);
    if (!this.isCurrent(generation)) return;
    await this.revealInterface(this.host.querySelector('[data-scene]'), profile.interfaceDuration);
    if (this.isCurrent(generation)) this.clear();
  }

  async exit(route, mountRoom, onRoomEntering = () => {}) {
    const generation = this.begin();
    const profile = transitionProfile(route);
    if (isReducedMotion()) {
      onRoomEntering();
      mountRoom();
      this.clearBackdrop();
      if (this.isCurrent(generation)) this.clear();
      return;
    }

    await this.hideInterface(this.host.querySelector('[data-scene]'), profile.exitInterfaceDuration);
    if (!this.isCurrent(generation)) return;
    onRoomEntering();
    mountRoom();
    if (!this.isCurrent(generation)) return;
    const room = this.host.querySelector('.room-scene');
    const viewport = room?.querySelector('[data-camera-viewport]');
    const world = room?.querySelector('[data-room-world]');
    if (viewport && world) {
      this.camera = new VirtualCamera(viewport, world);
      this.camera.jumpTo(this.backdropState);
      viewport.dataset.cameraTarget = route;
    }
    this.clearBackdrop();
    await nextFrame();
    if (this.camera) await this.camera.restore({ duration: profile.restoreDuration });
    if (this.isCurrent(generation)) this.clear();
  }
}
