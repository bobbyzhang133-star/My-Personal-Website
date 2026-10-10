import { projects, researchNotes } from '../content.js?v=20261006-2';
import { $$, esc, isReducedMotion } from '../utils.js?v=20261006-2';
import { bindLinearKeys, sceneController } from './shared.js?v=20261006-2';
import { ROOM_OBJECT_ASSETS } from './object-assets.js?v=20261006-2';

const chapters = projects.filter(project => project.category === 'research');

function preview(project, index) {
  return `<p class="eyebrow">Chapter 0${index + 1} · ${esc(project.yearStatus)}</p><h2>${esc(project.title)}</h2><p>${esc(project.description)}</p><div class="tags">${project.technologies.map(item => `<span>${esc(item)}</span>`).join('')}</div><a class="select-button" href="${project.detailRoute}">${project.externalLinks.length ? esc(project.externalLinks[0].label) : 'Read chapter'} ↗</a><span class="page-number">${index + 1}</span>`;
}

export function renderResearch({ preview: isPreview = false } = {}) {
  const id = isPreview ? '' : ' id="main"';
  return `<main${id} class="game-scene object-scene research-scene" data-scene="research" tabindex="-1" aria-labelledby="research-title">
    <h1 class="visually-hidden" id="research-title">Field Notes</h1>
    <div class="object-stage book-object-shell" data-object-interface="book">
      <div class="book-cover" aria-hidden="true"><img class="object-source-sprite book-source-sprite" src="${ROOM_OBJECT_ASSETS.research}" alt=""><span>FIELD NOTES</span></div>
      <section class="open-book scene-surface" data-category-interface data-book data-keyboard-surface aria-label="Research journal">
        <div class="book-spine" aria-hidden="true"></div>
        <div class="book-page book-toc"><p class="eyebrow">Contents</p><h2>Field Notes</h2><nav aria-label="Research chapters">${chapters.map((project, index) => `<button type="button" data-chapter="${index}" aria-current="${index === 0 ? 'page' : 'false'}" tabindex="${index === 0 ? 0 : -1}"><span>0${index + 1}</span>${esc(project.title)}</button>`).join('')}</nav><div class="margin-note">Select a chapter<br>or use ↑ ↓</div><aside class="research-notes"><p class="eyebrow">Currently chasing</p><ul>${researchNotes.map(note => `<li>${esc(note)}</li>`).join('')}</ul></aside></div>
        <article class="book-page book-preview" aria-live="polite">${preview(chapters[0], 0)}</article>
      </section>
      <div class="book-tabs" aria-hidden="true"><i></i><i></i><i></i></div>
    </div>
  </main>`;
}

export function mountResearch(root) {
  const lifecycle = sceneController();
  const { signal } = lifecycle;
  const surface = root.querySelector('[data-book]');
  const buttons = $$('[data-chapter]', surface);
  const output = surface.querySelector('.book-preview');
  let index = 0;
  const render = (nextIndex, focus = false) => {
    index = (nextIndex + chapters.length) % chapters.length;
    buttons.forEach((button, buttonIndex) => {
      const active = buttonIndex === index;
      button.setAttribute('aria-current', active ? 'page' : 'false');
      button.tabIndex = active ? 0 : -1;
    });
    output.classList.remove('turning');
    void output.offsetWidth;
    if (!isReducedMotion()) output.classList.add('turning');
    output.innerHTML = preview(chapters[index], index);
    if (focus) buttons[index].focus({ preventScroll: true });
  };
  buttons.forEach((button, buttonIndex) => button.addEventListener('click', () => render(buttonIndex), { signal }));
  bindLinearKeys(surface, buttons, () => index, render, { vertical: true, signal });
  render(0);
  return lifecycle;
}
