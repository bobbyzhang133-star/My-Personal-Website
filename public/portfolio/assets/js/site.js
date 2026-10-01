import { categories, projects, experience, about, researchNotes } from './content.js';
import { initAudio } from './audio.js';

const page = document.body.dataset.page || 'home';
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const esc = (value = '') => value.replace(/[&<>'"]/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' })[character]);
const legacyHashRoutes = { games:'/games/', films:'/films/', banddream:'/music/', research:'/research/', about:'/about/', contact:'/about/', now:'/skills-experience/' };

if (page === 'home' && legacyHashRoutes[location.hash.slice(1)]) location.replace(legacyHashRoutes[location.hash.slice(1)]);

function nav() {
  const current = categories.find(category => category.slug === page)?.title || ({ projects:'Mission Board', 'skills-experience':'Skill Tree', resume:'Dossier', about:'Player Profile', detail:'Project Detail' }[page] || 'Creative Room');
  return `
    <a class="skip-link" href="#main">Skip to content</a>
    <header class="hud">
      <a class="brand" href="/" aria-label="Bobby Zhang — Creative Room"><span class="brand-mark">BZ</span><span class="brand-sub">player one</span></a>
      <nav class="hud-actions" aria-label="Primary">
        ${page !== 'home' ? '<button class="history-back" type="button">← Back</button>' : ''}
        <a href="/" ${page === 'home' ? 'aria-current="page"' : ''}>Room</a>
        <button class="menu-button" type="button" aria-expanded="false" aria-controls="player-menu">☰ Player Menu</button>
        <button class="sound-button" type="button" aria-pressed="false"></button>
      </nav>
      <div class="section-indicator"><span>Current zone</span><strong>${esc(current)}</strong></div>
    </header>
    <div class="menu-backdrop" hidden></div>
    <aside class="player-menu" id="player-menu" aria-labelledby="player-menu-title" aria-modal="true" role="dialog" hidden>
      <div class="pause-status"><span class="status-dot"></span> Player Menu</div>
      <button class="menu-close" type="button" aria-label="Close Player Menu">×</button>
      <div class="menu-heading"><p class="eyebrow">Navigation overlay</p><h2 id="player-menu-title">Paused.</h2><p>Jump anywhere. No gameplay required.</p></div>
      <nav aria-label="Player Menu">
        <button class="menu-continue" type="button"><b>Continue</b><span>Return to current zone</span></button>
        <a href="/projects/"><b>Mission Board</b><span>All Projects</span></a>
        <a href="/skills-experience/"><b>Skill Tree</b><span>Skills & Experience</span></a>
        <a href="/resume/"><b>Dossier</b><span>Resume</span></a>
        <a href="/about/"><b>Player Profile</b><span>About & Contact</span></a>
        <a href="/"><b>Return to Room</b><span>Creative categories</span></a>
      </nav>
      <p class="menu-help">Esc close · Tab navigate · Enter select</p>
    </aside>`;
}

function categoryHeader(kicker, title, description) {
  return `<header class="experience-header"><div><p class="eyebrow">${esc(kicker)}</p><h1>${esc(title)}</h1><p>${esc(description)}</p></div><a class="back-link" href="/">← Return to room</a></header>`;
}

function card(project) {
  const tags = [...project.roles, ...project.technologies].map(tag => `<span>${esc(tag)}</span>`).join('');
  const external = project.externalLinks.map(link => `<a class="text-link" href="${link.url}" target="_blank" rel="noreferrer">${esc(link.label)} <span aria-hidden="true">↗</span></a>`).join('');
  return `<article class="project-card" id="${project.id}" data-category="${project.category}">
    <a class="card-image" href="${project.detailRoute}" aria-label="Open ${esc(project.title)}"><img src="${project.artwork}" alt="${esc(project.title)} artwork" loading="lazy"></a>
    <div class="card-body"><div class="mission-index">${String(projects.indexOf(project) + 1).padStart(2, '0')} / 14</div><p class="eyebrow">${esc(project.category)} · ${esc(project.yearStatus)}</p><h2><a href="${project.detailRoute}">${esc(project.title)}</a></h2><p>${esc(project.description)}</p><div class="tags">${tags}</div>${external ? `<div class="card-actions">${external}</div>` : ''}</div>
  </article>`;
}

function home() {
  const objects = categories.map(category => {
    const customProp = category.slug === 'research' ? '<span class="css-book" aria-hidden="true"><i></i><i></i></span>' : category.slug === 'ai' ? '<span class="css-computer" aria-hidden="true"><i></i></span>' : `<img src="${category.artwork}" alt="" aria-hidden="true">`;
    const action = ({ games:'Follow', films:'Open lens', research:'Open book', music:'Enter studio', ai:'Boot system' })[category.slug];
    return `<a class="room-object object-${category.slug}" data-depth="${({games:14,films:8,research:11,music:6,ai:9})[category.slug]}" href="/${category.slug}/" aria-label="${category.title}: ${category.description}">
      <span class="object-art">${customProp}<span class="object-glow"></span></span>
      <span class="object-label"><small>${esc(category.object)}</small><strong>${esc(category.title)}</strong><span>${esc(category.description)}</span><b>${action} <i aria-hidden="true">↗</i></b></span>
    </a>`;
  }).join('');
  return `<main id="main" class="room-page">
    <section class="room-intro"><p class="eyebrow">Bobby Zhang · Creative room</p><h1>Pick up an object.<br><em>Enter the work.</em></h1><p>Five creative paths, one room. Use the objects or open Player Menu for the fast professional route.</p><span class="room-instruction">Mouse / arrows / touch · Select with Enter</span></section>
    <section class="room-stage" aria-label="Interactive creative room">
      <div class="room-layer layer-wall" data-depth="2"><div class="window"><i></i><i></i><span></span></div><div class="poster">MAKE<br>STRANGE<br>THINGS</div><div class="shelf"><i></i><i></i><i></i></div></div>
      <div class="room-layer layer-furniture" data-depth="5"><div class="desk"></div><div class="cabinet"></div><div class="rug"></div><div class="lamp"></div></div>
      <div class="room-layer layer-light" data-depth="1"></div>
      <div class="room-objects">${objects}</div>
      <div class="room-layer layer-foreground" data-depth="15"><i></i><b></b></div>
      <div class="room-location"><span>ROOM 01</span><strong>Creative Studio</strong></div>
    </section>
    <p class="asset-note"><b>Art direction layer:</b> the room environment is built in CSS while final panoramic room art is pending review. Existing portfolio objects remain in use where they match.</p>
  </main>`;
}

function gamesPage() {
  const items = projects.filter(project => project.category === 'games');
  return `<main id="main" class="category-experience games-page">
    ${categoryHeader('Bird route · Character select', 'Choose your game', 'Five playable worlds. Project covers temporarily stand in for character renders until final transparent art is supplied.')}
    <section class="character-select" data-carousel="games" aria-label="Choose a game">
      <button class="carousel-arrow prev" type="button" aria-label="Previous game">←</button>
      <div class="character-track">${items.map((project, index) => `<button class="character" type="button" data-index="${index}" aria-label="Select ${esc(project.title)}" aria-pressed="${index === 0}"><span class="character-frame"><img src="${project.artwork}" alt="${esc(project.title)} cover"></span><span>${esc(project.title)}</span></button>`).join('')}</div>
      <button class="carousel-arrow next" type="button" aria-label="Next game">→</button>
      <div class="select-copy" aria-live="polite"></div>
    </section>
  </main>`;
}

function filmsPage() {
  const items = projects.filter(project => project.category === 'films');
  return `<main id="main" class="category-experience films-page">
    ${categoryHeader('Camera route · Film archive', 'Stories in motion', 'Move through three film projects on a physical strip. Full playback remains deliberate, never automatic.')}
    <section class="film-browser" data-film-browser>
      <div class="reel reel-a" aria-hidden="true"></div><div class="reel reel-b" aria-hidden="true"></div>
      <button class="film-arrow prev" type="button" aria-label="Previous film">←</button>
      <div class="film-strip" role="listbox" aria-label="Film projects">${items.map((project, index) => `<button class="film-frame" type="button" role="option" aria-selected="${index === 0}" data-index="${index}"><span class="perfs" aria-hidden="true"></span><img src="${project.artwork}" alt="${esc(project.title)} poster"><span>Frame ${String(index + 1).padStart(2, '0')}</span></button>`).join('')}</div>
      <button class="film-arrow next" type="button" aria-label="Next film">→</button>
      <div class="film-copy" aria-live="polite"></div>
    </section>
  </main>`;
}

function researchPage() {
  const items = projects.filter(project => project.category === 'research');
  return `<main id="main" class="category-experience research-page">
    ${categoryHeader('Book route · Research journal', 'Open chapters', 'Two investigations presented as chapters. The existing “My GitHub Profile” title is preserved pending clarification.')}
    <section class="open-book" data-book>
      <div class="book-spine" aria-hidden="true"></div>
      <div class="book-page book-toc"><p class="eyebrow">Contents</p><h2>Field Notes</h2><nav aria-label="Research chapters">${items.map((project, index) => `<button type="button" data-chapter="${index}" aria-current="${index === 0 ? 'page' : 'false'}"><span>0${index + 1}</span>${esc(project.title)}</button>`).join('')}</nav><div class="margin-note">Select a chapter<br>or use ↑ ↓</div></div>
      <article class="book-page book-preview" aria-live="polite"></article>
    </section>
    <aside class="notes research-notes"><p class="eyebrow">Currently chasing</p><ul>${researchNotes.map(note => `<li>${esc(note)}</li>`).join('')}</ul></aside>
  </main>`;
}

function musicPage() {
  const project = projects.find(item => item.category === 'music');
  return `<main id="main" class="category-experience music-page">
    ${categoryHeader('Guitar route · Studio session', 'Now playing', 'One song, two live takes. The setlist is intentionally compact and ready to grow.')}
    <section class="studio-console" data-studio>
      <div class="studio-visual"><div class="stage-light"></div><img src="${project.artwork}" alt="Guitar artwork for That Girl"><div class="amp"><i></i><i></i><span>BAND<br>DREAM</span></div></div>
      <div class="setlist"><p class="eyebrow">Set 01 · BandDream</p><h2>${esc(project.title)}</h2><p>${esc(project.description)}</p><div class="take-tabs" role="tablist" aria-label="Performance takes">${project.externalLinks.map((link, index) => `<button role="tab" type="button" aria-selected="${index === 0}" data-video="${link.url}">${esc(link.label)}</button>`).join('')}</div><div class="performance-panel"><p>Video stays unloaded until requested.</p><button class="load-performance" type="button">Load selected performance</button></div><div class="tags">${project.roles.map(role => `<span>${esc(role)}</span>`).join('')}</div></div>
    </section>
  </main>`;
}

function aiPage() {
  const items = projects.filter(project => project.category === 'ai');
  return `<main id="main" class="category-experience ai-page">
    ${categoryHeader('Computer route · AI workspace', 'Creative system online', 'Three focused applications. Learn what each tool does, then launch it deliberately on Hugging Face.')}
    <section class="ai-system" data-ai-system>
      <header><span class="system-light"></span><b>BZ / AI OS</b><time>LOCAL SESSION</time></header>
      <nav aria-label="AI applications"><p>Applications</p>${items.map((project, index) => `<button type="button" data-app="${index}" aria-current="${index === 0 ? 'page' : 'false'}"><span>0${index + 1}</span><b>${esc(project.title)}</b><small>${esc(project.yearStatus)}</small></button>`).join('')}</nav>
      <article class="ai-workspace" aria-live="polite"></article>
      <aside><p class="eyebrow">System status</p><dl><div><dt>Runtime</dt><dd>External</dd></div><div><dt>Interface</dt><dd>Portfolio preview</dd></div><div><dt>Launch</dt><dd>On request</dd></div></dl></aside>
    </section>
  </main>`;
}

function missionBoard() {
  return `<main id="main" class="professional-page mission-page">
    ${categoryHeader('Player Menu · Mission Board', 'Project archive', 'Fourteen primary showcase items across five creative paths. Filter for a fast professional overview.')}
    <div class="filters" role="group" aria-label="Filter projects"><button class="active" data-filter="all" aria-pressed="true">All · ${projects.length}</button>${categories.map(category => `<button data-filter="${category.slug}" aria-pressed="false">${category.title}</button>`).join('')}</div>
    <section class="card-grid mission-grid" id="project-grid">${projects.map(card).join('')}</section>
  </main>`;
}

function skillsPage() {
  const skills = [
    ['Game Development', 'GameMaker · Unity · Unreal Engine 5 · C++ · HTML5', ['one-last-bird', 'chickens-breakout', 'chickens-nightmare-ue5']],
    ['Film & Editing', 'Camera · Lighting · Script · Animation · Voiceover · Editing', ['shamans-documentary', 'air-dynamics', 'historical-war-vehicles']],
    ['AI & Research', 'Groq · Llama · Qwen-Coder-3 · FLUX · Gradio · HuggingFace Spaces', ['gamification', 'game-builder-free']],
    ['Collaboration', 'Team leadership · Mentoring · Teaching · Project management', ['chickens-breakout', 'shamans-documentary']]
  ];
  return `<main id="main" class="professional-page skills-page">
    ${categoryHeader('Player Menu · Progression', 'Skill Tree', 'Capabilities shown through project evidence—not arbitrary proficiency scores.')}
    <section class="skill-tree" aria-labelledby="skill-heading"><h2 id="skill-heading">Evidence map</h2><div class="tree-grid">${skills.map((skill, index) => `<article class="skill-node"><span class="node-level">0${index + 1}</span><h3>${skill[0]}</h3><p>${skill[1]}</p><div><b>Used in</b>${skill[2].map(id => { const project = projects.find(item => item.id === id); return `<a href="${project.detailRoute}">${esc(project.title)}</a>`; }).join('')}</div></article>`).join('')}</div></section>
    <section class="quest-log" aria-labelledby="quest-heading"><div class="quest-title"><p class="eyebrow">Experience</p><h2 id="quest-heading">Quest Log</h2></div><div class="quest-list">${experience.map((entry, index) => `<article><span class="quest-index">${String(index + 1).padStart(2, '0')}</span><time>${entry[0]}</time><div><h3>${entry[1]}</h3><p>${entry[2]}</p></div><span class="quest-status">${entry[3]}</span></article>`).join('')}</div></section>
  </main>`;
}

function resumePage() {
  return `<main id="main" class="professional-page resume-page">
    ${categoryHeader('Player Menu · Personnel file', 'Player dossier', 'A finished, printable shell is ready. Complete resume source data has not been supplied, so nothing has been fabricated.')}
    <section class="dossier-sheet"><header><div><span>FILE / BZ-001</span><strong>Bobby Zhang</strong><small>Creative developer · Westlake Village, CA</small></div><div class="dossier-stamp">SOURCE<br>REQUIRED</div></header><div class="dossier-empty"><p class="eyebrow">Document status</p><h2>Resume content awaiting source file.</h2><p>Verified portfolio evidence is available in the Skill Tree and Quest Log. Education, awards, credentials, and dates will not be inferred.</p><a class="button" href="/skills-experience/">Open verified experience</a></div></section>
  </main>`;
}

function aboutPage() {
  return `<main id="main" class="professional-page profile-page">
    ${categoryHeader('Player Menu · Profile', 'Bobby Zhang', about.biography[0])}
    <section class="profile-card"><div class="profile-id"><span>BZ</span><p><b>Class / Role</b>Game Developer · Filmmaker · Researcher</p><p><b>Base</b>Westlake Village, California</p></div><div class="profile-copy">${about.biography.slice(1).map(paragraph => `<p>${esc(paragraph)}</p>`).join('')}</div></section>
    <section class="stats" aria-label="Portfolio statistics">${about.stats.map(stat => `<div><strong>${stat[0]}</strong><span>${stat[1]}</span></div>`).join('')}</section>
    <section class="contact"><p class="eyebrow">Communication channels</p><h2>Start a collaboration.</h2><div>${about.contacts.map(contact => `<a href="${contact[2]}" ${contact[2].startsWith('http') ? 'target="_blank" rel="noreferrer"' : ''}><span>${contact[0]}</span><strong>${contact[1]}</strong><b aria-hidden="true">↗</b></a>`).join('')}</div></section>
  </main>`;
}

function detail() {
  const project = projects.find(item => item.id === document.body.dataset.project);
  if (!project) return `<main id="main"><section class="experience-header"><h1>Project not found</h1><a href="/projects/">Return to Mission Board</a></section></main>`;
  return `<main id="main" class="detail-page"><section class="detail-hero"><div><p class="eyebrow">${esc(project.category)} · ${esc(project.yearStatus)}</p><h1>${esc(project.title)}</h1><p>${esc(project.description)}</p><div class="tags">${[...project.roles, ...project.technologies].map(tag => `<span>${esc(tag)}</span>`).join('')}</div>${project.externalLinks.map(link => `<a class="button" href="${link.url}" target="_blank" rel="noreferrer">${esc(link.label)} ↗</a>`).join('')}</div><img src="${project.artwork}" alt="${esc(project.title)} artwork"></section><section class="detail-grid"><article><p class="eyebrow">Project overview</p><h2>What is known</h2><p>${esc(project.description)}</p></article><article class="pending"><p class="eyebrow">Development notes</p><h2>Source material required</h2><p>Design challenge, process, collaborators, screenshots, and playable links will appear here when verified material is supplied.</p></article></section><a class="back-link" href="/${project.category}/">← Back to ${project.category}</a></main>`;
}

const creativeViews = { games:gamesPage, films:filmsPage, research:researchPage, music:musicPage, ai:aiPage };
const views = { home, projects:missionBoard, 'skills-experience':skillsPage, resume:resumePage, about:aboutPage, detail };
document.body.insertAdjacentHTML('afterbegin', nav());
$('#app').innerHTML = creativeViews[page] ? creativeViews[page]() : (views[page] || home)();
document.body.insertAdjacentHTML('beforeend', '<footer><span>© 2026 Bobby Zhang</span><span>Built by hand · Westlake Village, CA</span><a href="/projects/">Fast route: Mission Board →</a></footer>');

function initMenu() {
  const menu = $('#player-menu');
  const backdrop = $('.menu-backdrop');
  const opener = $('.menu-button');
  const closer = $('.menu-close');
  const continueButton = $('.menu-continue');
  let previousFocus;
  function setMenu(open) {
    previousFocus = open ? document.activeElement : previousFocus;
    menu.hidden = !open; backdrop.hidden = !open; opener.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('menu-open', open);
    if (open) closer.focus(); else (previousFocus || opener).focus();
  }
  opener.addEventListener('click', () => setMenu(true));
  closer.addEventListener('click', () => setMenu(false));
  continueButton.addEventListener('click', () => setMenu(false));
  backdrop.addEventListener('click', () => setMenu(false));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') setMenu(menu.hidden);
    if (event.key === 'Tab' && !menu.hidden) {
      const focusable = $$('button, a', menu).filter(element => !element.hidden);
      const first = focusable[0]; const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
}

function setActive(items, index, attribute = 'aria-pressed') {
  items.forEach((item, itemIndex) => item.setAttribute(attribute, String(itemIndex === index)));
}

function addSwipe(element, onLeft, onRight) {
  let startX = 0;
  element.addEventListener('pointerdown', event => { startX = event.clientX; });
  element.addEventListener('pointerup', event => {
    const distance = event.clientX - startX;
    if (Math.abs(distance) < 45) return;
    if (distance < 0) onLeft();
    else onRight();
  });
}

function initGames() {
  const root = $('[data-carousel="games"]'); if (!root) return;
  const data = projects.filter(project => project.category === 'games');
  const items = $$('.character', root); const copy = $('.select-copy', root); let index = 0;
  function render(nextIndex) {
    index = (nextIndex + items.length) % items.length;
    items.forEach((item, itemIndex) => { item.dataset.position = itemIndex === index ? 'active' : itemIndex === (index - 1 + items.length) % items.length ? 'prev' : itemIndex === (index + 1) % items.length ? 'next' : 'hidden'; });
    setActive(items, index);
    const project = data[index];
    copy.innerHTML = `<p class="eyebrow">Player ${String(index + 1).padStart(2, '0')} / ${String(data.length).padStart(2, '0')}</p><h2>${esc(project.title)}</h2><p>${esc(project.description)}</p><div class="tags">${[...project.roles, ...project.technologies].map(tag => `<span>${esc(tag)}</span>`).join('')}</div><a class="select-button" href="${project.detailRoute}">Select project <span aria-hidden="true">↗</span></a>`;
  }
  $('.prev', root).addEventListener('click', () => render(index - 1)); $('.next', root).addEventListener('click', () => render(index + 1));
  items.forEach((item, itemIndex) => item.addEventListener('click', () => render(itemIndex)));
  root.addEventListener('keydown', event => { if (event.key === 'ArrowLeft') render(index - 1); if (event.key === 'ArrowRight') render(index + 1); });
  addSwipe(root, () => render(index + 1), () => render(index - 1)); render(0);
}

function initFilms() {
  const root = $('[data-film-browser]'); if (!root) return;
  const data = projects.filter(project => project.category === 'films'); const frames = $$('.film-frame', root); const copy = $('.film-copy', root); let index = 0;
  function render(nextIndex) {
    index = (nextIndex + frames.length) % frames.length;
    frames.forEach((frame, frameIndex) => { frame.setAttribute('aria-selected', String(frameIndex === index)); frame.dataset.position = frameIndex - index; });
    const project = data[index];
    copy.innerHTML = `<p class="eyebrow">Frame ${index + 1} / ${data.length} · ${esc(project.yearStatus)}</p><h2>${esc(project.title)}</h2><p>${esc(project.description)}</p><p class="role-line">${project.roles.map(esc).join(' · ')}</p><a class="select-button" href="${project.detailRoute}">Open film project ↗</a>`;
  }
  $('.prev', root).addEventListener('click', () => render(index - 1)); $('.next', root).addEventListener('click', () => render(index + 1)); frames.forEach((frame, frameIndex) => frame.addEventListener('click', () => render(frameIndex)));
  root.addEventListener('keydown', event => { if (event.key === 'ArrowLeft') render(index - 1); if (event.key === 'ArrowRight') render(index + 1); }); addSwipe(root, () => render(index + 1), () => render(index - 1)); render(0);
}

function initBook() {
  const root = $('[data-book]'); if (!root) return; const data = projects.filter(project => project.category === 'research'); const buttons = $$('[data-chapter]', root); const preview = $('.book-preview', root); let index = 0;
  function render(nextIndex) { index = (nextIndex + data.length) % data.length; buttons.forEach((button, buttonIndex) => button.setAttribute('aria-current', buttonIndex === index ? 'page' : 'false')); const project = data[index]; preview.classList.remove('turning'); void preview.offsetWidth; if (!reducedMotion.matches) preview.classList.add('turning'); preview.innerHTML = `<p class="eyebrow">Chapter 0${index + 1} · ${esc(project.yearStatus)}</p><h2>${esc(project.title)}</h2><p>${esc(project.description)}</p><div class="tags">${project.technologies.map(item => `<span>${esc(item)}</span>`).join('')}</div><a class="select-button" href="${project.detailRoute}">${project.externalLinks.length ? esc(project.externalLinks[0].label) : 'Read chapter'} ↗</a><span class="page-number">${index + 1}</span>`; }
  buttons.forEach((button, buttonIndex) => button.addEventListener('click', () => render(buttonIndex))); root.addEventListener('keydown', event => { if (event.key === 'ArrowUp') render(index - 1); if (event.key === 'ArrowDown') render(index + 1); }); render(0);
}

function initStudio() {
  const root = $('[data-studio]'); if (!root) return; const tabs = $$('[role="tab"]', root); let selected = 0;
  tabs.forEach((tab, index) => tab.addEventListener('click', () => { selected = index; setActive(tabs, index, 'aria-selected'); const panel = $('.performance-panel', root); panel.innerHTML = '<p>Video stays unloaded until requested.</p><button class="load-performance" type="button">Load selected performance</button>'; bindLoad(); }));
  function bindLoad() { $('.load-performance', root)?.addEventListener('click', () => { const url = tabs[selected].dataset.video; $('.performance-panel', root).innerHTML = `<iframe src="${url}" allow="autoplay; fullscreen" allowfullscreen title="That Girl — ${esc(tabs[selected].textContent)}"></iframe>`; }); }
  bindLoad();
}

function initAI() {
  const root = $('[data-ai-system]'); if (!root) return; const data = projects.filter(project => project.category === 'ai'); const buttons = $$('[data-app]', root); const workspace = $('.ai-workspace', root);
  function render(index) { buttons.forEach((button, buttonIndex) => button.setAttribute('aria-current', buttonIndex === index ? 'page' : 'false')); const project = data[index]; workspace.innerHTML = `<p class="terminal-line"><span>user</span> open ${esc(project.slug)}</p><p class="terminal-line response"><span>system</span> application ready</p><div class="app-window"><p class="eyebrow">${esc(project.yearStatus)}</p><h2>${esc(project.title)}</h2><p>${esc(project.description)}</p><div class="tags">${project.technologies.map(technology => `<span>${esc(technology)}</span>`).join('')}</div><a class="select-button" href="${project.externalLinks[0].url}" target="_blank" rel="noreferrer">Launch live tool ↗</a></div>`; }
  buttons.forEach((button, index) => button.addEventListener('click', () => render(index))); render(0);
}

function initRoom() {
  const stage = $('.room-stage'); if (!stage || reducedMotion.matches || matchMedia('(pointer: coarse)').matches) return;
  stage.addEventListener('pointermove', event => { const bounds = stage.getBoundingClientRect(); const x = (event.clientX - bounds.left) / bounds.width - .5; const y = (event.clientY - bounds.top) / bounds.height - .5; $$('[data-depth]', stage).forEach(layer => { const depth = Number(layer.dataset.depth); layer.style.transform = `translate3d(${x * depth}px, ${y * depth}px, 0)`; }); });
  stage.addEventListener('pointerleave', () => $$('[data-depth]', stage).forEach(layer => { layer.style.transform = ''; }));
}

function initFilters() {
  $$('[data-filter]').forEach(button => button.addEventListener('click', () => { $$('[data-filter]').forEach(filter => { const active = filter === button; filter.classList.toggle('active', active); filter.setAttribute('aria-pressed', String(active)); }); $$('[data-category]').forEach(cardElement => { cardElement.hidden = button.dataset.filter !== 'all' && cardElement.dataset.category !== button.dataset.filter; }); }));
}

function initTransitions() {
  document.addEventListener('click', event => { const link = event.target.closest('a[href]'); if (!link || reducedMotion.matches || event.defaultPrevented || event.metaKey || event.ctrlKey || link.target === '_blank' || link.origin !== location.origin || link.hash && link.pathname === location.pathname) return; event.preventDefault(); const destination = link.href; const route = link.pathname.split('/').filter(Boolean)[0] || 'home'; document.body.dataset.transition = route; document.body.classList.add('route-leave'); setTimeout(() => { location.href = destination; }, 330); });
}

initMenu(); initAudio($('.sound-button')); initRoom(); initGames(); initFilms(); initBook(); initStudio(); initAI(); initFilters(); initTransitions();
$('.history-back')?.addEventListener('click', () => history.length > 1 ? history.back() : location.assign('/'));
requestAnimationFrame(() => document.body.classList.add('ready'));
