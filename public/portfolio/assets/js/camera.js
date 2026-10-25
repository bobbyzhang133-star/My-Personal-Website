import { isReducedMotion } from './utils.js?v=5d56ac3eab02';

export const CAMERA_HOME = Object.freeze({ x: 0, y: 0, scale: 1 });

export function calculateFocusTransform(targetRect, viewportRect, worldRect, {
  fillX = 0.34,
  fillY = 0.4,
  maxScale = 2.6
} = {}) {
  if (!targetRect || !viewportRect || !worldRect || targetRect.width <= 0 || targetRect.height <= 0 || viewportRect.width <= 0 || viewportRect.height <= 0) {
    return { ...CAMERA_HOME };
  }
  const scale = Math.max(1, Math.min(
    maxScale,
    viewportRect.width * fillX / targetRect.width,
    viewportRect.height * fillY / targetRect.height
  ));
  const targetX = targetRect.left + targetRect.width / 2 - worldRect.left;
  const targetY = targetRect.top + targetRect.height / 2 - worldRect.top;
  const viewportX = viewportRect.left + viewportRect.width / 2 - worldRect.left;
  const viewportY = viewportRect.top + viewportRect.height / 2 - worldRect.top;
  return {
    x: viewportX - targetX * scale,
    y: viewportY - targetY * scale,
    scale
  };
}

export function calculateTravelTransform(targetRect, viewportRect, worldRect, {
  scale = 1.7,
  compactScale = scale,
  focusX = 0.5,
  focusY = 0.5,
  compactFocusY = focusY,
  shortScale = scale,
  shortFocusY = focusY
} = {}) {
  if (!targetRect || !viewportRect || !worldRect || targetRect.width <= 0 || targetRect.height <= 0 || viewportRect.width <= 0 || viewportRect.height <= 0) {
    return { ...CAMERA_HOME };
  }
  const short = viewportRect.height <= 500 && viewportRect.width > 700;
  const resolvedScale = Math.max(1, viewportRect.width <= 700 ? compactScale : short ? shortScale : scale);
  const targetX = targetRect.left + targetRect.width / 2 - worldRect.left;
  const targetY = targetRect.top + targetRect.height / 2 - worldRect.top;
  const desiredX = viewportRect.left + viewportRect.width * focusX - worldRect.left - targetX * resolvedScale;
  const resolvedFocusY = viewportRect.width <= 700 ? compactFocusY : short ? shortFocusY : focusY;
  const desiredY = viewportRect.top + viewportRect.height * resolvedFocusY - worldRect.top - targetY * resolvedScale;
  const viewportRight = Number.isFinite(viewportRect.right) ? viewportRect.right : viewportRect.left + viewportRect.width;
  const viewportBottom = Number.isFinite(viewportRect.bottom) ? viewportRect.bottom : viewportRect.top + viewportRect.height;
  const minX = viewportRight - worldRect.left - worldRect.width * resolvedScale;
  const maxX = viewportRect.left - worldRect.left;
  const minY = viewportBottom - worldRect.top - worldRect.height * resolvedScale;
  const maxY = viewportRect.top - worldRect.top;
  return {
    x: Math.min(maxX, Math.max(minX, desiredX)),
    y: Math.min(maxY, Math.max(minY, desiredY)),
    scale: resolvedScale
  };
}

export function cameraTransform({ x, y, scale }) {
  return `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
}

export const CAMERA_TRAVEL_PROFILES = Object.freeze({
  games: { scale: 4.8, compactScale: 3.2, focusX: 0.5, focusY: 0.54 },
  films: { scale: 1.78, compactScale: 1.62, focusX: 0.58, focusY: 0.48 },
  research: { scale: 1.68, compactScale: 1.56, focusX: 0.5, focusY: 0.62 },
  music: { scale: 1.72, compactScale: 1.58, focusX: 0.5, focusY: 0.52 },
  ai: { scale: 3.6, compactScale: 9.4, shortScale: 2.6, focusX: 0.5, focusY: 0.44, compactFocusY: 0.42, shortFocusY: 0.52 }
});

export class VirtualCamera {
  constructor(viewport, world) {
    this.viewport = viewport;
    this.world = world;
    this.state = { ...CAMERA_HOME };
    this.animation = null;
  }

  measure(target, route) {
    const viewportRect=this.viewport.getBoundingClientRect(),worldRect=this.world.getBoundingClientRect();
    const profile={...CAMERA_TRAVEL_PROFILES[route]};
    if(route==='ai' && viewportRect.width<=700 && worldRect.width>viewportRect.width*1.01) profile.compactScale=2.45;
    return calculateTravelTransform(
      target.getBoundingClientRect(),
      viewportRect,
      worldRect,
      profile
    );
  }

  jumpTo(nextState) {
    this.animation?.cancel();
    this.animation = null;
    this.state = { ...nextState };
    this.world.style.transformOrigin = '0 0';
    this.world.style.transform = cameraTransform(this.state);
    this.world.style.willChange = '';
  }

  focusInstant(target, route) {
    if (!target) return { ...CAMERA_HOME };
    const state = this.measure(target, route);
    this.jumpTo(state);
    this.viewport.dataset.cameraTarget = route;
    return { ...state };
  }

  async animateTo(nextState, duration = 880, easing = 'cubic-bezier(.42,0,.18,1)') {
    this.animation?.cancel();
    const from = cameraTransform(this.state);
    const to = cameraTransform(nextState);
    this.world.style.transformOrigin = '0 0';
    this.world.style.willChange = 'transform';
    if (isReducedMotion() || duration === 0) {
      this.world.style.transform = to;
      this.state = { ...nextState };
      this.world.style.willChange = '';
      return;
    }
    const animation = this.world.animate([
      { transform: from },
      { transform: to }
    ], {
      duration,
      easing,
      fill: 'forwards'
    });
    this.animation = animation;
    try {
      await animation.finished;
    } catch {
      return;
    } finally {
      if (this.animation === animation) this.animation = null;
    }
    this.world.style.transform = to;
    animation.cancel();
    this.state = { ...nextState };
    this.world.style.willChange = '';
  }

  async focus(target, route, { duration = 880 } = {}) {
    if (!target) return;
    this.viewport.dataset.cameraTarget = route;
    this.viewport.dataset.cameraTravel = 'approach';
    await this.animateTo(this.measure(target, route), duration, 'cubic-bezier(.42,0,.18,1)');
    this.viewport.dataset.cameraTravel = 'arrived';
  }

  async restore({ duration = 800 } = {}) {
    this.viewport.dataset.cameraTravel = 'retreat';
    await this.animateTo(CAMERA_HOME, duration, 'cubic-bezier(.32,0,.2,1)');
    delete this.viewport.dataset.cameraTarget;
    delete this.viewport.dataset.cameraTravel;
    this.world.style.transform = '';
    this.world.style.transformOrigin = '';
  }

  destroy() {
    this.animation?.cancel();
    this.animation = null;
    this.world.style.transform = '';
    this.world.style.transformOrigin = '';
    this.world.style.willChange = '';
    delete this.viewport.dataset.cameraTravel;
  }
}
