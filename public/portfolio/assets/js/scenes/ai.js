import { projects, aiGroups } from '../content.js?v=5d56ac3eab02';
import { aiEvidence, aiActions } from '../ai-projects.js?v=5d56ac3eab02';
import { $$, esc } from '../utils.js?v=5d56ac3eab02';
import { bindLinearKeys, sceneController } from './shared.js?v=5d56ac3eab02';
import { ROOM_OBJECT_ASSETS } from './object-assets.js?v=5d56ac3eab02';

const applications = aiGroups.flatMap(group=>group.projectIds.map(id=>projects.find(project=>project.id===id)));

function workspace(project) {
  const group=aiGroups.find(group=>group.projectIds.includes(project.id));
  return `<div class="app-window"><p class="eyebrow">${esc(group.title)} · ${project.aiKind==='research'?'Research & journal':'Hugging Face Space'}</p><h2>${esc(project.aiKind==='research'?'Research & journal':project.title)}</h2><p>${esc(project.description)}</p><div class="ai-actions">${aiActions(project)}</div><details class="ai-evidence"><summary>Research & sources</summary>${aiEvidence(project)}</details></div>`;
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
          <nav aria-label="AI projects grouped by purpose">${aiGroups.map(group=>`<section class="ai-app-group" aria-label="${esc(group.title)}"><h2>${esc(group.title)}</h2>${group.projectIds.map(id=>{const project=applications.find(project=>project.id===id),index=applications.indexOf(project);return `<button type="button" data-app="${index}" aria-current="${index===0?'page':'false'}" tabindex="${index===0?0:-1}"><span>${project.aiKind==='research'?'↳':String(index+1).padStart(2,'0')}</span><b>${esc(project.aiKind==='research'?'Research & journal':project.title)}</b></button>`;}).join('')}</section>`).join('')}</nav>
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
    output.scrollTop = 0;
    if (focus) buttons[index].focus({ preventScroll: true });
  };
  buttons.forEach((button, buttonIndex) => button.addEventListener('click', () => render(buttonIndex), { signal }));
  bindLinearKeys(surface, buttons, () => index, render, { vertical: true, signal });
  render(0);
  return lifecycle;
}
