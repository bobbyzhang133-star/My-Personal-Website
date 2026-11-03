import { projects } from '../content.js?v=3d5bd1cfca66';
import { $$, esc } from '../utils.js?v=3d5bd1cfca66';
import { bindLinearKeys, sceneController } from './shared.js?v=3d5bd1cfca66';
import { ROOM_OBJECT_ASSETS } from './object-assets.js?v=3d5bd1cfca66';
import { sourceLinks } from '../project-sources.js?v=3d5bd1cfca66';

const films = projects.filter(project => project.category === 'films');

export function filmCopy(project, index) {
  return `<p class="eyebrow">Frame ${index + 1} / ${films.length} · ${esc(project.yearStatus)}</p><h2>${esc(project.title)}</h2><p>${esc(project.description)}</p><p class="role-line">${project.roles.map(esc).join(' · ')}</p><div class="film-source-actions">${sourceLinks(project, 'select-button')}<a class="${project.externalLinks.length ? 'text-link' : 'select-button'}" href="${project.detailRoute}">Film project ↗</a></div>`;
}

export function renderFilms({ preview = false } = {}) {
  const id = preview ? '' : ' id="main"';
  return `<main${id} class="game-scene object-scene films-scene" data-scene="films" tabindex="-1" aria-labelledby="films-title">
    <h1 class="visually-hidden" id="films-title">Film Archive</h1>
    <div class="object-stage camera-object" data-object-interface="camera">
      <div class="camera-top" aria-hidden="true"><img class="camera-source-sprite" src="${ROOM_OBJECT_ASSETS.films}" alt=""><span>STUDIO 65 · FILM ARCHIVE</span></div>
      <div class="camera-body">
        <div class="camera-viewfinder" data-category-interface>
          <section class="film-browser scene-surface" data-film-browser data-keyboard-surface aria-label="Film archive">
            <button class="film-arrow prev" type="button" aria-label="Previous film">←</button>
            <div class="film-strip" role="listbox" aria-label="Film projects">${films.map((project, index) => `<button class="film-frame" type="button" role="option" aria-selected="${index === 0}" tabindex="${index === 0 ? 0 : -1}" data-index="${index}"><span class="perfs" aria-hidden="true"></span><img src="${project.artwork}" alt="${esc(project.title)} poster"><span>Frame ${String(index + 1).padStart(2, '0')}</span></button>`).join('')}</div>
            <button class="film-arrow next" type="button" aria-label="Next film">→</button>
            <div class="film-copy" aria-live="polite">${filmCopy(films[0], 0)}</div>
          </section>
        </div>
      </div>
    </div>
  </main>`;
}

export function mountFilms(root) {
  const lifecycle = sceneController();
  const { signal } = lifecycle;
  const surface = root.querySelector('[data-film-browser]');
  const frames = $$('.film-frame', surface);
  const output = surface.querySelector('.film-copy');
  let index = 0;
  const render = (nextIndex, focus = false) => {
    index = (nextIndex + frames.length) % frames.length;
    frames.forEach((frame, frameIndex) => {
      const active = frameIndex === index;
      frame.setAttribute('aria-selected', String(active));
      frame.tabIndex = active ? 0 : -1;
      const distance = (frameIndex - index + frames.length) % frames.length;
      frame.dataset.position = distance === 0 ? '0' : distance <= frames.length / 2 ? '1' : '-1';
    });
    output.innerHTML = filmCopy(films[index], index);
    if (focus) frames[index].focus({ preventScroll: true });
  };
  surface.querySelector('.prev').addEventListener('click', () => render(index - 1, true), { signal });
  surface.querySelector('.next').addEventListener('click', () => render(index + 1, true), { signal });
  let swipeStart;
  let suppressClickUntil = 0;
  const strip = surface.querySelector('.film-strip');
  strip.addEventListener('pointerdown', event => {
    if (event.pointerType === 'touch') swipeStart = { x: event.clientX, y: event.clientY };
  }, { signal });
  strip.addEventListener('pointercancel', () => { swipeStart = undefined; }, { signal });
  strip.addEventListener('pointerup', event => {
    if (!swipeStart) return;
    const dx = event.clientX - swipeStart.x;
    const dy = event.clientY - swipeStart.y;
    swipeStart = undefined;
    if (Math.abs(dx) < 42 || Math.abs(dx) < Math.abs(dy)) return;
    suppressClickUntil = performance.now() + 500;
    render(index + (dx < 0 ? 1 : -1));
  }, { signal });
  frames.forEach((frame, frameIndex) => frame.addEventListener('click', event => {
    if (event.detail && performance.now() < suppressClickUntil) return;
    if (frameIndex === index) location.assign(films[index].detailRoute);
    else render(frameIndex, true);
  }, { signal }));
  bindLinearKeys(surface, frames, () => index, render, { signal });
  render(0);
  return lifecycle;
}
