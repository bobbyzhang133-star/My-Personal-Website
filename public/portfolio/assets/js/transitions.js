import { projects } from './content.js?v=3d5bd1cfca66';
import { moveFilmTransport } from './scenes/film-transport.js?v=3d5bd1cfca66';
import { CAMERA_HOME, VirtualCamera } from './camera.js?v=3d5bd1cfca66';
import { layoutJournal, moveJournal } from './scenes/journal-motion.js?v=3d5bd1cfca66';
import { isReducedMotion, nextFrame } from './utils.js?v=3d5bd1cfca66';

export const OBJECT_TRANSITIONS = Object.freeze({
  games: { cameraDuration: 940, interfaceDuration: 320, exitInterfaceDuration: 220, restoreDuration: 820 },
  films: { cameraDuration: 900, interfaceDuration: 300, exitInterfaceDuration: 210, restoreDuration: 800 },
  research: { cameraDuration: 920, interfaceDuration: 320, exitInterfaceDuration: 220, restoreDuration: 810 },
  music: { cameraDuration: 900, interfaceDuration: 300, exitInterfaceDuration: 210, restoreDuration: 800 },
  ai: { cameraDuration: 940, interfaceDuration: 340, exitInterfaceDuration: 230, restoreDuration: 830 }
});

const firstFilmArtwork = projects.find(project => project.category === 'films')?.artwork;

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
    this.transportController = null;
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
    return (route === 'music' && root.querySelector('[data-music-room-neck]')) || this.roomObjectArt(route, root) || root.querySelector(`[data-camera-anchor="${route}"]`) || this.roomTarget(route, root);
  }

  roomObjectArt(route, root = this.host) {
    return root.querySelector(`.object-${route} .object-art > .master-object-image, .object-${route} .bird-sprite`);
  }

  alignSceneObject(route) {
    if (route === 'research') {
      const source=this.backdrop?.querySelector('.object-research');
      const research=this.host.querySelector('[data-scene="research"]');
      if(source&&research?.dataset.bookModelLoading!=='true')source.dataset.bookLifted='true';
      layoutJournal(research);
      return;
    }
    if (route === 'games') {
      const bird = this.backdrop?.querySelector('.master-room .object-games .bird-sprite');
      const selection = this.host.querySelector('[data-room-bird-selection]');
      const track = selection?.parentElement;
      if (!bird || !selection || !track) return;
      const art = bird.getBoundingClientRect(), parent = track.getBoundingClientRect();
      if (art.width <= 0 || art.height <= 0) return;
      // Keep the same visible bird on the same rug. Only the transparent,
      // accessible character link moves into exact registration with it.
      Object.assign(selection.style, { position: 'absolute', left: `${art.left-parent.left}px`, top: `${art.top-parent.top}px`, width: `${art.width}px`, height: `${art.height}px`, margin: '0' });
      selection.dataset.sharedBirdAligned = 'true';
      const roster = this.host.querySelector('.games-roster-stage');
      if (roster) roster.style.setProperty('--shared-bird-center', `${art.top+art.height/2-roster.getBoundingClientRect().top}px`);
      return;
    }
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
    const captured=room.cloneNode(true);
    this.registry.home.copyArtwork?.(room,captured);
    this.showBackdrop(captured, route, this.camera?.state || CAMERA_HOME);
    this.registry.home.ready?.(captured);
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
    this.registry.home.ready?.(room);
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
    if(root?.dataset.scene==='research') { await moveJournal(root,this.backdrop,{opening:true,play,track:element=>this.track(element)}); return; }
    if (root?.dataset.scene === 'music' && await this.moveMusicNeck(root, true)) return;
    const element = root?.querySelector('[data-category-interface]');
    if (!element || isReducedMotion()) return;
    this.track(element);
    const entrance = ['games','ai'].includes(root?.dataset.scene) ? 'translate3d(0,0,0)' : 'translate3d(0,12px,0)';
    element.style.opacity = '0';
    element.style.transform = entrance;
    element.style.willChange = 'opacity, transform';
    await nextFrame();
    await play(element, [
      { opacity: 0, transform: entrance },
      { opacity: 1, transform: 'translate3d(0,0,0)' }
    ], { duration, easing: 'cubic-bezier(.16,1,.3,1)' });
    clearInlineMotion(element);
    this.activeElements.delete(element);
  }

  async hideInterface(root, duration) {
    if(root?.dataset.scene==='research') { await moveJournal(root,this.backdrop,{opening:false,play,track:element=>this.track(element)}); return; }
    if (root?.dataset.scene === 'music' && await this.moveMusicNeck(root, false)) return;
    const element = root?.querySelector('[data-category-interface]');
    if (!element || isReducedMotion()) return;
    this.track(element);
    const departure = root?.dataset.scene === 'ai' ? 'translate3d(0,0,0)' : 'translate3d(0,8px,0)';
    await play(element, [
      { opacity: 1, transform: 'translate3d(0,0,0)' },
      { opacity: 0, transform: departure }
    ], { duration, easing: 'cubic-bezier(.4,0,1,1)' });
  }

  async moveMusicNeck(root, opening) {
    const source = this.backdrop?.querySelector('[data-music-room-neck]');
    const neck = root.querySelector('[data-music-neck]');
    const amp = root.querySelector('.music-amp');
    const session = root.querySelector('[data-studio]');
    if (isReducedMotion() || !source || !neck || !amp || !session) return false;
    const from = source.getBoundingClientRect();
    const to = neck.getBoundingClientRect();
    if (!from.height || !to.height || !to.width) return false;
    const mapped = `translate(${from.left+from.width/2-to.left-to.width/2}px,${from.top+from.height/2-to.top-to.height/2}px) rotate(-7deg) scale(${from.width/to.width},${from.height/to.height})`;
    this.track(neck, amp, session);
    const order = frames => opening ? frames : frames.toReversed();
    const options = { duration: 580, easing: 'cubic-bezier(.42,0,.18,1)' };
    await Promise.all([
      play(neck, order([{ transform: mapped, opacity: 0 }, { transform: 'none', opacity: 1 }]), options),
      play(amp, order([{ opacity: 0 }, { opacity: 1 }]), options),
      play(session, order([{ backgroundColor: 'transparent', borderColor: 'transparent' },
        { backgroundColor: '#211313e8', borderColor: '#947353' }]), options)
    ]);
    if (opening) for (const element of [neck, amp, session]) {
      clearInlineMotion(element);
      this.activeElements.delete(element);
    }
    return true;
  }

  async playFilmTransport(room, opening, artwork = firstFilmArtwork) {
    const controller = new AbortController();
    this.transportController = controller;
    await moveFilmTransport(this.roomObjectArt('films', room), this.layer, {
      opening, artwork, signal: controller.signal
    });
    if (this.transportController === controller) this.transportController = null;
  }

  clear() {
    this.transportController?.abort();
    this.transportController = null;
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
    const guitarBody = route === 'music' && room?.querySelector('[data-music-body]');
    const object = room?.querySelector(`[data-room-object].object-${route}`);

    if(route==='research')await this.registry.home.ready?.(room);
    if(!this.isCurrent(generation))return;

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
    if (guitarBody) {
      const neckPose = this.camera.measure(focusTarget, route);
      await this.camera.focus(guitarBody, route, { duration: 560 });
      if (!this.isCurrent(generation)) return;
      await this.camera.animateTo(neckPose, 640);
    } else {
      await this.camera.focus(focusTarget, route, { duration: profile.cameraDuration });
    }
    if (!this.isCurrent(generation)) return;

    if (route === 'films') await this.playFilmTransport(room, true);
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

    const artwork = route === 'films'
      ? this.host.querySelector('.film-frame[aria-selected="true"] img')?.getAttribute('src')
      : undefined;
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
    if (route === 'films' && room) await this.playFilmTransport(room, false, artwork);
    if (!this.isCurrent(generation)) return;
    if (this.camera) await this.camera.restore({ duration: profile.restoreDuration });
    if (this.isCurrent(generation)) this.clear();
  }
}
