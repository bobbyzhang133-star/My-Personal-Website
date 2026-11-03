import { isReducedMotion } from '../utils.js?v=3d5bd1cfca66';

const cutawayURL = '/assets/room/cinema-camera/transport-cutaway.webp';
// Source pixels projected by render-cinema-transport.py using the Room camera.
const guide = 'M129.38 77.83 L141.86 107.54 L121.73 123.9 V150.05 L132.6 155.49 L182.52 111.92 L209.9 96.38 L233.25 76.27';
const reels = [[156.81,65.4,30], [223.24,66.66,20]];
const gate = [121.22,137.57];

function mechanism() {
  return `<svg viewBox="0 0 310 231" aria-hidden="true">
    <path d="${guide}" fill="none" stroke="#261912" stroke-width="9" stroke-linejoin="round"/>
    <path d="${guide}" fill="none" stroke="#b87e4d" stroke-width="6" stroke-linejoin="round"/>
    <path class="transport-perforations" d="${guide}" fill="none" stroke="#2d1b14" stroke-width="3" stroke-dasharray="2 5"/>
    ${reels.map(([x,y,r]) => `<g class="transport-reel" style="transform-origin:${x}px ${y}px">
      <ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r*.94}" fill="none" stroke="#ad926e" stroke-width="2"/>
      ${[0,120,240].map(angle => `<path d="M${x} ${y-6} V${y-r+3}" stroke="#bca584" stroke-width="5" transform="rotate(${angle} ${x} ${y})"/>`).join('')}
      <circle cx="${x}" cy="${y}" r="6" fill="#403631"/>
    </g>`).join('')}
    <rect x="112" y="128" width="18" height="19" rx="1" fill="#261b15" stroke="#d4b38a" stroke-width="2"/>
    <rect class="transport-shutter" x="114" y="130" width="14" height="15" fill="#694d3d"/>
    <rect class="transport-exposure" x="114" y="130" width="14" height="15" fill="#eac691" opacity="0"/>
  </svg>`;
}

export async function moveFilmTransport(source, layer, { opening, signal, artwork }) {
  if (!source || !layer || !artwork || signal.aborted || isReducedMotion() || !layer.animate) return;
  const cutaway = new Image();
  cutaway.src = cutawayURL;
  // Keep navigation responsive if the optional render is unavailable.
  let timeout;
  try {
    await Promise.race([cutaway.decode(), new Promise((_, reject) => {
      timeout = setTimeout(() => reject(new Error('Cutaway load timed out')), 450);
    })]);
  } catch {
    return;
  } finally {
    clearTimeout(timeout);
  }
  if (signal.aborted || isReducedMotion() || !source.isConnected) return;
  const rect = source.getBoundingClientRect();
  if (!rect.width || !rect.height) return;

  const assembly = document.createElement('div');
  assembly.className = 'film-transport-assembly';
  assembly.setAttribute('aria-hidden', 'true');
  Object.assign(assembly.style, { left: `${rect.left}px`, top: `${rect.top}px`,
    width: `${rect.width}px`, height: `${rect.height}px` });
  const restingImage = source.querySelector('img');
  if (!restingImage) return;
  const closed = restingImage.cloneNode();
  closed.src = restingImage.currentSrc || closed.src;
  const interior = document.createElement('div');
  interior.className = 'film-transport-interior';
  interior.append(cutaway);
  interior.insertAdjacentHTML('beforeend', mechanism());
  assembly.append(closed, interior);

  const frame = document.createElement('div');
  frame.className = 'film-gate-frame';
  frame.setAttribute('aria-hidden', 'true');
  frame.style.backgroundImage = `url("${artwork}")`;
  const w = rect.width * 18 / 310, h = rect.height * 12 / 231;
  const x = rect.left + rect.width * gate[0] / 310;
  const y = rect.top + rect.height * gate[1] / 231;
  Object.assign(frame.style, { left: `${x-w/2}px`, top: `${y-h/2}px`, width: `${w}px`, height: `${h}px` });
  const full = `translate(${innerWidth/2-x}px,${innerHeight/2-y}px) scale(${innerWidth/w},${innerHeight/h})`;
  const animations = [];
  const offset = (time) => opening ? time : 1-time;
  const run = (element, frames) => {
    const timed = frames.map(item => ({ ...item, offset: offset(item.offset) }));
    if (!opening) timed.reverse();
    animations.push(element.animate(timed, { duration: opening ? 1260 : 960, fill: 'both' }));
  };

  const cleanup = () => animations.forEach(animation => animation.cancel());
  const resize = new AbortController();
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const observer = new MutationObserver(() => { if (isReducedMotion()) cleanup(); });
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-motion'] });
  signal.addEventListener('abort', cleanup, { once: true });
  window.addEventListener('resize', cleanup, { once: true, signal: resize.signal });
  preference.addEventListener('change', cleanup, { signal: resize.signal });
  layer.append(assembly, frame);
  layer.style.display = 'block';
  const visibility = source.style.visibility;
  source.style.visibility = 'hidden';
  try {
    run(closed, [
      { offset: 0, opacity: 1 }, { offset: .08, opacity: 1 },
      { offset: .24, opacity: 0 }, { offset: 1, opacity: 0 }
    ]);
    run(interior, [
      { offset: 0, opacity: 0 }, { offset: .08, opacity: 0 },
      { offset: .24, opacity: 1 }, { offset: 1, opacity: 1 }
    ]);
    assembly.querySelectorAll('.transport-reel').forEach((reel, i) => run(reel, [
      { offset: 0, transform: 'rotate(0deg)' }, { offset: .2, transform: 'rotate(0deg)' },
      { offset: .71, transform: `rotate(${i ? 410 : 285}deg)` },
      { offset: 1, transform: `rotate(${i ? 410 : 285}deg)` }
    ]));
    run(assembly.querySelector('.transport-perforations'), [
      { offset: 0, strokeDashoffset: 0 }, { offset: .2, strokeDashoffset: 0 },
      { offset: .71, strokeDashoffset: -70 }, { offset: 1, strokeDashoffset: -70 }
    ]);
    run(assembly.querySelector('.transport-shutter'), [
      { offset: 0, transform: 'scaleY(1)' }, { offset: .58, transform: 'scaleY(1)' },
      { offset: .66, transform: 'scaleY(0)' }, { offset: 1, transform: 'scaleY(0)' }
    ]);
    run(assembly.querySelector('.transport-exposure'), [
      { offset: 0, opacity: 0 }, { offset: .63, opacity: 0 },
      { offset: .67, opacity: .8 }, { offset: .73, opacity: 0 }, { offset: 1, opacity: 0 }
    ]);
    run(frame, [
      { offset: 0, opacity: 0, transform: 'none' },
      { offset: .65, opacity: 0, transform: 'none' },
      { offset: .72, opacity: 1, transform: 'none', easing: 'cubic-bezier(.55,0,.23,1)' },
      { offset: 1, opacity: 1, transform: full }
    ]);
    await Promise.allSettled(animations.map(animation => animation.finished));
  } finally {
    cleanup();
    observer.disconnect();
    resize.abort();
    signal.removeEventListener('abort', cleanup);
    source.style.visibility = visibility;
    assembly.remove();
    frame.remove();
    if (!layer.childElementCount) layer.style.removeProperty('display');
  }
}
