import { GAME_ANIMATIONS } from './game-animation-data.js?v=0985987b2294';
import { isReducedMotion } from './utils.js?v=0985987b2294';
import { OCEAN_ANIMALS } from './ocean-animal-data.js?v=0985987b2294';

export { GAME_ANIMATIONS };

export function sampleClip(clip, seconds, reduced = false) {
  const time = reduced ? 0 : clip.loop ? seconds % clip.duration : Math.min(seconds, clip.duration);
  return clip.frames.findLast(frame => frame.time <= time) || clip.frames[0];
}

export function createSpritePlayer(id, ImageClass = Image) {
  const data = GAME_ANIMATIONS[id] || OCEAN_ANIMALS[id];
  if (!data) return null;
  const images = new Map();
  for (const clip of Object.values(data.clips)) for (const frame of clip.frames) {
    if (!images.has(frame.src)) { const image = new ImageClass(); image.src = frame.src; images.set(frame.src, image); }
  }
  let moving = false, state = 'idle', elapsed = 0;
  return {
    data,
    advance(dt, nextMoving, facing = 1, reduced = false, preview = false) {
      if (nextMoving !== moving) { moving = nextMoving; state = moving ? (data.clips.start ? 'start' : data.preview) : (data.clips.end ? 'end' : 'idle'); elapsed = 0; }
      elapsed += dt;
      if (state === 'start' && elapsed >= data.clips.start.duration) { elapsed -= data.clips.start.duration; state = 'move'; }
      if (state === 'end' && elapsed >= data.clips.end.duration) { elapsed = 0; state = 'idle'; }
      let selected = preview ? data.preview : state;
      if (data.clips.moveRight && moving) selected = facing < 0 ? 'moveLeft' : 'moveRight';
      if (reduced) selected = 'idle';
      const clip = data.clips[selected] || data.clips.idle;
      const frame = sampleClip(clip, elapsed, reduced), image = images.get(frame.src);
      return { ...frame, image, crop: data.crop, state: selected,
        flip: !data.clips.moveLeft && facing !== data.facing,
        ready: image.complete && image.naturalWidth > 0 };
    }
  };
}

export function drawSprite(ctx, sample, x, y, height, flip = sample.flip) {
  if (!sample.ready) return false;
  const [left, top, width, sourceHeight] = sample.crop;
  const targetWidth = height * width / sourceHeight;
  ctx.save(); ctx.translate(x, y); if (flip) ctx.scale(-1, 1);
  ctx.imageSmoothingEnabled = false;
  if(sample.logicalSize){
    // Variable native sprite rectangles are padded logically, not stretched or
    // sampled past their atlas cell. Original pixel scale stays fixed per animal.
    const scale=height/sample.logicalSize[1],trim=sample.trim;
    ctx.drawImage(sample.image,sample.rect[0]+trim[0],sample.rect[1]+trim[1],trim[2],trim[3],(sample.offset[0]-sample.logicalSize[0]/2)*scale,sample.offset[1]*scale,trim[2]*scale,trim[3]*scale);
    ctx.restore();return true;
  }
  ctx.drawImage(sample.image, sample.rect[0] + left, sample.rect[1] + top,
    width, sourceHeight, -targetWidth / 2, 0, targetWidth, height);
  ctx.restore();
  return true;
}

export function mountCharacterAnimations(root, signal) {
  const videos = [...root.querySelectorAll('.character-video')];
  const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
  function syncVideos() {
    for (const video of videos) {
      const enabled = video.closest('.character').dataset.position === 'active' && !document.hidden && !document.body.classList.contains('menu-open') && !isReducedMotion();
      video.hidden = !enabled;
      if (enabled) video.play().catch(() => { video.hidden = true; }); else video.pause();
    }
  }
  const observer = new MutationObserver(syncVideos);
  observer.observe(root, { subtree: true, attributes: true, attributeFilter: ['data-position'] });
  observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-motion'] });
  document.addEventListener('visibilitychange', syncVideos, { signal });
  motionQuery.addEventListener('change', syncVideos, { signal });
  syncVideos();
  const previews = [...root.querySelectorAll('[data-character-animation]')].map(canvas => ({
    canvas, player: createSpritePlayer(canvas.dataset.characterAnimation),
    item: canvas.closest('.character'), frame: canvas.parentElement,
  }));
  let raf, previous = 0;
  function tick(time) {
    const dt = (time - (previous || time)) / 1000; previous = time;
    if (!document.hidden && !document.body.classList.contains('menu-open')) for (const preview of previews) {
      if (preview.item.dataset.position !== 'active') continue;
      const { canvas, player, frame } = preview;
      const rect = frame.getBoundingClientRect();
      if (canvas.width !== Math.round(rect.width) || canvas.height !== Math.round(rect.height)) { canvas.width = Math.round(rect.width); canvas.height = Math.round(rect.height); }
      const ctx = canvas.getContext('2d'), sample = player.advance(dt, true, player.data.facing, isReducedMotion(), true);
      if (!sample.ready) continue;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const height = Math.min(canvas.height, canvas.width * sample.crop[3] / sample.crop[2]);
      drawSprite(ctx, sample, canvas.width / 2, (canvas.height - height) / 2, height, false);
      canvas.dataset.animationState = sample.state; canvas.dataset.animationFrame = sample.src + ':' + sample.time;
      frame.classList.add('has-source-animation');
    }
    if (!signal.aborted) raf = requestAnimationFrame(tick);
  }
  raf = requestAnimationFrame(tick);
  signal.addEventListener('abort', () => { cancelAnimationFrame(raf); observer.disconnect(); videos.forEach(video => video.pause()); }, { once: true });
}
