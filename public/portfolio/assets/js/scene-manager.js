import { isCreativePath, routeFromPath } from './utils.js?v=39bd00589fe9';
import { TransitionDirector } from './transitions.js?v=39bd00589fe9';

export const SHELL_STATES = Object.freeze({
  BOOTING: 'BOOTING',
  ROOM_IDLE: 'ROOM_IDLE',
  ROOM_EXITING: 'ROOM_EXITING',
  SCENE_ENTERING: 'SCENE_ENTERING',
  SCENE_ACTIVE: 'SCENE_ACTIVE',
  SCENE_EXITING: 'SCENE_EXITING',
  ROOM_ENTERING: 'ROOM_ENTERING'
});

export class SceneManager {
  constructor({ shell, host, layer, backdrop, registry, audio }) {
    this.shell = shell;
    this.host = host;
    this.registry = registry;
    this.audio = audio;
    this.transition = new TransitionDirector({ shell, host, layer, backdrop, registry });
    this.activeRoute = null;
    this.lifecycle = null;
    this.locked = false;
    this.pending = null;
    this.enteredFromRoom = false;
    this.historyReturnPending = false;
    this.navigationVersion = 0;
    this.onNavigate = null;
    this.handleClick = this.handleClick.bind(this);
    this.handlePopState = this.handlePopState.bind(this);
  }

  setState(state) {
    this.shell.dataset.shellState = state;
    const busy = ![SHELL_STATES.ROOM_IDLE, SHELL_STATES.SCENE_ACTIVE].includes(state);
    this.shell.setAttribute('aria-busy', String(busy));
    this.host.inert = busy;
    this.shell.querySelector('.game-hud').inert = busy;
  }

  mount(route) {
    this.lifecycle?.cleanup?.();
    const scene = this.registry[route];
    this.host.innerHTML = scene.render();
    const root = this.host.querySelector('[data-scene]');
    this.lifecycle = scene.mount(root) || null;
    this.activeRoute = route;
    document.body.dataset.page = route;
    document.title = `${scene.title} — Bobby Zhang`;
    this.shell.dataset.scene = route;
    this.shell.querySelector('[data-room-return]').hidden = route === 'home';
    this.shell.querySelector('[data-scene-announcer]').textContent = `${scene.title} scene active`;
    this.audio?.setAmbienceActive?.(route === 'home');
    return root;
  }

  start(route = routeFromPath()) {
    const initial = this.registry[route] ? route : 'home';
    this.mount(initial);
    if (initial === 'home') this.transition.clearBackdrop();
    else {
      this.transition.prepareBackdrop(initial);
      this.transition.watchSceneAlignment(initial);
    }
    this.enteredFromRoom = false;
    history.replaceState({ scene: initial, enteredFromRoom: false }, '', this.registry[initial].path);
    this.setState(initial === 'home' ? SHELL_STATES.ROOM_IDLE : SHELL_STATES.SCENE_ACTIVE);
    this.host.inert = false;
    requestAnimationFrame(() => this.host.querySelector('[data-scene]')?.focus({ preventScroll: true }));
    document.addEventListener('click', this.handleClick);
    addEventListener('popstate', this.handlePopState);
    this.shell.querySelector('[data-room-return]').addEventListener('click', () => this.returnToRoom());
  }

  handleClick(event) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest('a[href]');
    if (!link || link.target || link.hasAttribute('download') || link.origin !== location.origin || !isCreativePath(link.pathname)) return;
    event.preventDefault();
    this.navigate(routeFromPath(link.pathname));
  }

  handlePopState(event) {
    this.historyReturnPending = false;
    if (!isCreativePath(location.pathname)) return;
    this.navigationVersion += 1;
    this.transition.clear();
    this.onNavigate?.();
    this.navigate(routeFromPath(location.pathname), { historyMode: 'none', historyState: event.state });
  }

  returnToRoom() {
    if (this.activeRoute === 'home' || this.locked || this.historyReturnPending) return;
    // Room is a destination, not a synonym for browser Back.
    // History may contain detail, professional, or previously cached pages.
    this.navigate('home');
  }

  async navigate(route, { historyMode = 'push', historyState = null } = {}) {
    if (!this.registry[route]) return;
    if (this.locked) {
      this.pending = { route, historyMode, historyState };
      return;
    }
    if (route === this.activeRoute) return;
    this.onNavigate?.();
    this.locked = true;
    const navigation = ++this.navigationVersion;
    const from = this.activeRoute;
    const nextEnteredFromRoom = route === 'home'
      ? false
      : from === 'home'
        ? historyMode === 'push' || Boolean(historyState?.enteredFromRoom)
        : historyMode === 'none'
          ? Boolean(historyState?.enteredFromRoom)
          : this.enteredFromRoom;
    if (historyMode === 'push') {
      history.pushState({ scene: route, enteredFromRoom: nextEnteredFromRoom }, '', this.registry[route].path);
    }
    this.enteredFromRoom = nextEnteredFromRoom;
    const isStale = () => navigation !== this.navigationVersion;
    let root;
    try {
      if (from === 'home' && route !== 'home') {
        this.setState(SHELL_STATES.ROOM_EXITING);
        await this.transition.enter(route, () => { root = this.mount(route); }, () => this.setState(SHELL_STATES.SCENE_ENTERING));
        if (isStale()) return;
      } else if (route === 'home') {
        this.setState(SHELL_STATES.SCENE_EXITING);
        await this.transition.exit(from, () => { root = this.mount('home'); }, () => this.setState(SHELL_STATES.ROOM_ENTERING));
        if (isStale()) return;
      } else {
        this.setState(SHELL_STATES.SCENE_EXITING);
        await this.transition.replace(route, () => { root = this.mount(route); }, () => this.setState(SHELL_STATES.SCENE_ENTERING));
        if (isStale()) return;
      }

      this.setState(route === 'home' ? SHELL_STATES.ROOM_IDLE : SHELL_STATES.SCENE_ACTIVE);
      this.host.inert = false;
      if (route === 'home' && from !== 'home') this.lifecycle?.focusObject?.(from);
      else root?.focus({ preventScroll: true });
    } catch (error) {
      if (isStale()) return;
      console.error('Scene transition recovered after an error.', error);
      root = this.mount(route);
      if (route === 'home') this.transition.clearBackdrop();
      else {
        this.transition.prepareBackdrop(route);
        this.transition.watchSceneAlignment(route);
      }
      this.setState(route === 'home' ? SHELL_STATES.ROOM_IDLE : SHELL_STATES.SCENE_ACTIVE);
      this.host.inert = false;
      root.focus({ preventScroll: true });
    } finally {
      this.transition.clear();
      this.locked = false;
      const pending = this.pending;
      this.pending = null;
      if (pending?.route === this.activeRoute) {
        this.enteredFromRoom = Boolean(pending.historyState?.enteredFromRoom);
        this.setState(this.activeRoute === 'home' ? SHELL_STATES.ROOM_IDLE : SHELL_STATES.SCENE_ACTIVE);
        this.host.inert = false;
        requestAnimationFrame(() => this.host.querySelector('[data-scene]')?.focus({ preventScroll: true }));
      } else if (pending) {
        this.navigate(pending.route, pending);
      }
    }
  }

  destroy() {
    document.removeEventListener('click', this.handleClick);
    removeEventListener('popstate', this.handlePopState);
    this.lifecycle?.cleanup?.();
    this.transition.clearBackdrop();
  }
}
