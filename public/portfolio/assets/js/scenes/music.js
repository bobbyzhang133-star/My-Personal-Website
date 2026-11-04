import { ROOM_GUITAR } from './room-guitar-registration.js?v=8273376a5e68';
import { projects } from '../content.js?v=8273376a5e68';
import { $$, esc } from '../utils.js?v=8273376a5e68';
import { bindLinearKeys, sceneController } from './shared.js?v=8273376a5e68';
import { originalSourceUrl } from '../project-sources.js?v=8273376a5e68';

const project = projects.find(item => item.category === 'music');

export function musicSource(index) {
  const link = project.externalLinks[index];
  return `<a class="text-link" href="${esc(originalSourceUrl(link.url))}" target="_blank" rel="noopener noreferrer">Open ${esc(link.label)} original on Drive ↗</a>`;
}

export function renderMusic({ preview = false } = {}) {
  const id = preview ? '' : ' id="main"';
  return `<main${id} class="game-scene object-scene music-scene" data-scene="music" tabindex="-1" aria-labelledby="music-title">
    <h1 class="visually-hidden" id="music-title">Studio Session</h1>
    <div class="object-stage studio-rig" data-object-interface="guitar-studio">
      <section class="music-controls" data-category-interface data-studio data-keyboard-surface aria-label="Music studio">
        <div class="music-neck" data-music-neck>
            <div class="take-tabs music-fret-tabs" role="tablist" aria-label="Performance takes" aria-orientation="vertical">${project.externalLinks.map((link, index) => {
              const marker = ROOM_GUITAR.anchors[index];
              return `<button id="music-take-${index}" role="tab" type="button" style="--fret-x:${marker[0]}%;--fret-y:${marker[1]}%" aria-controls="music-performance-panel" aria-selected="${index === 0}" tabindex="${index === 0 ? 0 : -1}" data-video="${link.url}">${esc(link.label)}</button>`;
            }).join('')}</div>
        </div>
        <div class="music-amp">
          <p class="eyebrow">BANDDREAM · LIVE AMP</p><h2>${esc(project.title)}</h2>
          <p class="music-amp-take" aria-live="polite">${esc(project.externalLinks[0].label)}</p>
          <div class="performance-panel" id="music-performance-panel" role="tabpanel" aria-labelledby="music-take-0" tabindex="0"><button class="load-performance" type="button">Load performance</button></div>
          <div class="performance-source">${musicSource(0)}</div>
        </div>
      </section>
    </div>
  </main>`;
}

export function mountMusic(root) {
  const lifecycle = sceneController();
  const { signal } = lifecycle;
  const surface = root.querySelector('[data-studio]');
  const tabs = $$('[role="tab"]', surface);
  let index = 0;
  const resetPanel = () => {
    const panel = surface.querySelector('.performance-panel');
    panel.setAttribute('aria-labelledby', tabs[index].id);
    surface.querySelector('.performance-source').innerHTML = musicSource(index);
    surface.querySelector('.music-amp-take').textContent = tabs[index].textContent;
    panel.innerHTML = '<button class="load-performance" type="button">Load performance</button>';
    bindLoad();
  };
  const select = (nextIndex, focus = false) => {
    index = (nextIndex + tabs.length) % tabs.length;
    tabs.forEach((tab, tabIndex) => {
      const active = tabIndex === index;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
    });
    resetPanel();
    if (focus) tabs[index].focus({ preventScroll: true });
  };
  function bindLoad() {
    surface.querySelector('.load-performance')?.addEventListener('click', () => {
      const url = tabs[index].dataset.video;
      surface.querySelector('.performance-panel').innerHTML = `<iframe src="${esc(url)}" allow="autoplay; fullscreen" allowfullscreen title="That Girl — ${esc(tabs[index].textContent)}"></iframe>`;
    }, { signal, once: true });
  }
  tabs.forEach((tab, tabIndex) => tab.addEventListener('click', () => select(tabIndex), { signal }));
  bindLinearKeys(surface.querySelector('[role="tablist"]'), tabs, () => index, select, { signal, vertical: true });
  bindLoad();
  return lifecycle;
}
