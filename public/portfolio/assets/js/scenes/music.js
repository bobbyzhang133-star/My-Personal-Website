import { projects } from '../content.js?v=20261006-2';
import { $$, esc } from '../utils.js?v=20261006-2';
import { bindLinearKeys, sceneController } from './shared.js?v=20261006-2';
import { ROOM_OBJECT_ASSETS } from './object-assets.js?v=20261006-2';

const project = projects.find(item => item.category === 'music');

export function renderMusic({ preview = false } = {}) {
  const id = preview ? '' : ' id="main"';
  return `<main${id} class="game-scene object-scene music-scene" data-scene="music" tabindex="-1" aria-labelledby="music-title">
    <h1 class="visually-hidden" id="music-title">Studio Session</h1>
    <div class="object-stage studio-rig" data-object-interface="guitar-studio">
      <div class="studio-rig-label" aria-hidden="true"><span>INPUT 04</span><b>LIVE ROOM / SESSION</b><i></i></div>
      <section class="studio-console scene-surface" data-category-interface data-studio data-keyboard-surface aria-label="Music studio">
        <div class="studio-visual"><div class="stage-light"></div><img src="${ROOM_OBJECT_ASSETS.music}" alt="Pixel-art guitar from the Creative Room"><div class="amp"><i></i><i></i><span>BAND<br>DREAM</span></div></div>
        <div class="setlist"><p class="eyebrow">Set 01 · BandDream</p><h2>${esc(project.title)}</h2><p>${esc(project.description)}</p><div class="take-tabs" role="tablist" aria-label="Performance takes">${project.externalLinks.map((link, index) => `<button id="music-take-${index}" role="tab" type="button" aria-controls="music-performance-panel" aria-selected="${index === 0}" tabindex="${index === 0 ? 0 : -1}" data-video="${link.url}">${esc(link.label)}</button>`).join('')}</div><div class="performance-panel" id="music-performance-panel" role="tabpanel" aria-labelledby="music-take-0" tabindex="0"><p>Video stays unloaded until requested.</p><button class="load-performance" type="button">Load selected performance</button></div><div class="tags">${project.roles.map(role => `<span>${esc(role)}</span>`).join('')}</div></div>
      </section>
      <div class="mixer-controls" aria-hidden="true">${Array.from({ length: 8 }, () => '<span><i></i></span>').join('')}</div>
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
    panel.innerHTML = '<p>Video stays unloaded until requested.</p><button class="load-performance" type="button">Load selected performance</button>';
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
      surface.querySelector('.performance-panel').innerHTML = `<iframe src="${url}" allow="autoplay; fullscreen" allowfullscreen title="That Girl — ${esc(tabs[index].textContent)}"></iframe>`;
    }, { signal, once: true });
  }
  tabs.forEach((tab, tabIndex) => tab.addEventListener('click', () => select(tabIndex), { signal }));
  bindLinearKeys(surface, tabs, () => index, select, { signal });
  bindLoad();
  return lifecycle;
}
