import { projects } from '../content.js?v=20261006-2';
import { $$, esc } from '../utils.js?v=20261006-2';
import { bindLinearKeys, sceneController } from './shared.js?v=20261006-2';
import { ROOM_OBJECT_ASSETS } from './object-assets.js?v=20261006-2';

const applications = projects.filter(project => project.category === 'ai');

function workspace(project) {
  return `<p class="terminal-line"><span>user</span> open ${esc(project.slug)}</p><p class="terminal-line response"><span>system</span> application ready</p><div class="app-window"><p class="eyebrow">${esc(project.yearStatus)}</p><h2>${esc(project.title)}</h2><p>${esc(project.description)}</p><div class="tags">${project.technologies.map(technology => `<span>${esc(technology)}</span>`).join('')}</div><a class="select-button" href="${project.externalLinks[0].url}" target="_blank" rel="noreferrer">Launch live tool ↗</a></div>`;
}

export function renderAI({ preview = false } = {}) {
  const id = preview ? '' : ' id="main"';
  return `<main${id} class="game-scene object-scene ai-scene" data-scene="ai" tabindex="-1" aria-labelledby="ai-title">
    <h1 class="visually-hidden" id="ai-title">AI creative system</h1>
    <div class="object-stage computer-object" data-object-interface="computer">
      <div class="computer-perspective-frame">
        <picture>
          <img class="object-source-sprite computer-perspective-art" src="${ROOM_OBJECT_ASSETS.aiPerspective}" alt="" aria-hidden="true">
        </picture>
        <div class="computer-screen-window" data-category-interface>
        <section class="ai-system computer-screen scene-surface" data-ai-system data-keyboard-surface aria-label="AI computer operating environment">
          <header><span class="system-light"></span><b>BZ / AI OS</b><time>LOCAL SESSION</time></header>
          <nav aria-label="AI applications"><p>Applications</p>${applications.map((project, index) => `<button type="button" data-app="${index}" aria-current="${index === 0 ? 'page' : 'false'}" tabindex="${index === 0 ? 0 : -1}"><span>0${index + 1}</span><b>${esc(project.title)}</b><small>${esc(project.yearStatus)}</small></button>`).join('')}</nav>
          <article class="ai-workspace" aria-live="polite">${workspace(applications[0])}</article>
          <aside><p class="eyebrow">System status</p><dl><div><dt>Runtime</dt><dd>External</dd></div><div><dt>Interface</dt><dd>Portfolio preview</dd></div><div><dt>Launch</dt><dd>On request</dd></div></dl></aside>
        </section>
        </div>
      </div>
    </div>
  </main>`;
}

export function mountAI(root) {
  const lifecycle = sceneController();
  const { signal } = lifecycle;
  const surface = root.querySelector('[data-ai-system]');
  const buttons = $$('[data-app]', surface);
  const output = surface.querySelector('.ai-workspace');
  let index = 0;
  const render = (nextIndex, focus = false) => {
    index = (nextIndex + buttons.length) % buttons.length;
    buttons.forEach((button, buttonIndex) => {
      const active = buttonIndex === index;
      button.setAttribute('aria-current', active ? 'page' : 'false');
      button.tabIndex = active ? 0 : -1;
    });
    output.innerHTML = workspace(applications[index]);
    if (focus) buttons[index].focus({ preventScroll: true });
  };
  buttons.forEach((button, buttonIndex) => button.addEventListener('click', () => render(buttonIndex), { signal }));
  bindLinearKeys(surface, buttons, () => index, render, { vertical: true, signal });
  render(0);
  return lifecycle;
}
