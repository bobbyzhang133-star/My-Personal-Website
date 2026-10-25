import { about, categories, experience, projects } from './content.js?v=5d56ac3eab02';
import { aiEvidence, aiActions } from './ai-projects.js?v=5d56ac3eab02';
import { $$, esc } from './utils.js?v=5d56ac3eab02';

function categoryHeader(kicker, title, description) {
  return `<header class="experience-header"><div><p class="eyebrow">${esc(kicker)}</p><h1>${esc(title)}</h1><p>${esc(description)}</p></div><a class="back-link" href="/">← Return to room</a></header>`;
}

function card(project) {
  const tags = [...project.roles, ...project.technologies].map(tag => `<span>${esc(tag)}</span>`).join('');
  const external = project.externalLinks.map(link => `<a class="text-link" href="${link.url}" target="_blank" rel="noreferrer">${esc(link.label)} <span aria-hidden="true">↗</span></a>`).join('');
  return `<article class="project-card" id="${project.id}" data-category="${project.category}"><a class="card-image" href="${project.detailRoute}" aria-label="Open ${esc(project.title)}"><img src="${project.artwork}" alt="${esc(project.title)} artwork" loading="lazy"></a><div class="card-body"><div class="mission-index">${String(projects.indexOf(project) + 1).padStart(2, '0')} / ${projects.length}</div><p class="eyebrow">${esc(project.category)} · ${esc(project.yearStatus)}</p><h2><a href="${project.detailRoute}">${esc(project.title)}</a></h2><p>${esc(project.description)}</p><div class="tags">${tags}</div>${external ? `<div class="card-actions">${external}</div>` : ''}</div></article>`;
}

function missionBoard() {
  return `<main id="main" class="professional-page mission-page">${categoryHeader('Player Menu · Mission Board', 'Project archive', '${projects.length} primary showcase items across five creative paths. Filter for a fast professional overview.')}<div class="filters" role="group" aria-label="Filter projects"><button class="active" data-filter="all" aria-pressed="true">All · ${projects.length}</button>${categories.map(category => `<button data-filter="${category.slug}" aria-pressed="false">${category.title}</button>`).join('')}</div><section class="card-grid mission-grid" id="project-grid">${projects.map(card).join('')}</section></main>`;
}

function skillsPage() {
  const skills = [
    ['Game Development', 'GameMaker · Unity · Unreal Engine 5 · C++ · HTML5', ['one-last-bird', 'chickens-breakout', 'chickens-nightmare-ue5']],
    ['Film & Editing', 'Camera · Lighting · Script · Animation · Voiceover · Editing', ['shamans-documentary', 'air-dynamics', 'historical-war-vehicles']],
    ['AI & Research', 'Groq · Llama · Qwen-Coder-3 · FLUX · Gradio · HuggingFace Spaces', ['gamification', 'game-builder-free']],
    ['Collaboration', 'Team leadership · Mentoring · Teaching · Project management', ['chickens-breakout', 'shamans-documentary']]
  ];
  return `<main id="main" class="professional-page skills-page">${categoryHeader('Player Menu · Progression', 'Skill Tree', 'Capabilities shown through project evidence—not arbitrary proficiency scores.')}<section class="skill-tree" aria-labelledby="skill-heading"><h2 id="skill-heading">Evidence map</h2><div class="tree-grid">${skills.map((skill, index) => `<article class="skill-node"><span class="node-level">0${index + 1}</span><h3>${skill[0]}</h3><p>${skill[1]}</p><div><b>Used in</b>${skill[2].map(id => { const project = projects.find(item => item.id === id); return `<a href="${project.detailRoute}">${esc(project.title)}</a>`; }).join('')}</div></article>`).join('')}</div></section><section class="quest-log" aria-labelledby="quest-heading"><div class="quest-title"><p class="eyebrow">Experience</p><h2 id="quest-heading">Quest Log</h2></div><div class="quest-list">${experience.map((entry, index) => `<article><span class="quest-index">${String(index + 1).padStart(2, '0')}</span><time>${entry[0]}</time><div><h3>${entry[1]}</h3><p>${entry[2]}</p></div><span class="quest-status">${entry[3]}</span></article>`).join('')}</div></section></main>`;
}

function resumePage() {
  return `<main id="main" class="professional-page resume-page">${categoryHeader('Player Menu · Personnel file', 'Player dossier', 'A finished, printable shell is ready. Complete resume source data has not been supplied, so nothing has been fabricated.')}<section class="dossier-sheet"><header><div><span>FILE / BZ-001</span><strong>Bobby Zhang</strong><small>Creative developer · Westlake Village, CA</small></div><div class="dossier-stamp">SOURCE<br>REQUIRED</div></header><div class="dossier-empty"><p class="eyebrow">Document status</p><h2>Resume content awaiting source file.</h2><p>Verified portfolio evidence is available in the Skill Tree and Quest Log. Education, awards, credentials, and dates will not be inferred.</p><a class="button" href="/skills-experience/">Open verified experience</a></div></section></main>`;
}

function aboutPage() {
  return `<main id="main" class="professional-page profile-page">${categoryHeader('Player Menu · Profile', 'Bobby Zhang', about.biography[0])}<section class="profile-card"><div class="profile-id"><span>BZ</span><p><b>Class / Role</b>Game Developer · Filmmaker · Researcher</p><p><b>Base</b>Westlake Village, California</p></div><div class="profile-copy">${about.biography.slice(1).map(paragraph => `<p>${esc(paragraph)}</p>`).join('')}</div></section><section class="stats" aria-label="Portfolio statistics">${about.stats.map(stat => `<div><strong>${stat[0]}</strong><span>${stat[1]}</span></div>`).join('')}</section><section class="contact"><p class="eyebrow">Communication channels</p><h2>Start a collaboration.</h2><div>${about.contacts.map(contact => `<a href="${contact[2]}" ${contact[2].startsWith('http') ? 'target="_blank" rel="noreferrer"' : ''}><span>${contact[0]}</span><strong>${contact[1]}</strong><b aria-hidden="true">↗</b></a>`).join('')}</div></section></main>`;
}

function detailPage() {
  const project = projects.find(item => item.id === document.body.dataset.project);
  if (!project) return '<main id="main"><section class="experience-header"><h1>Project not found</h1><a href="/projects/">Return to Mission Board</a></section></main>';
  if(project.category==='ai')return `<main id="main" class="detail-page"><section class="detail-hero"><div><p class="eyebrow">AI · ${esc(project.yearStatus)}</p><h1>${esc(project.title)}</h1><p>${esc(project.description)}</p><div class="card-actions">${aiActions(project)}</div></div></section><section class="detail-grid"><article><h2>Research & sources</h2>${aiEvidence(project)}</article></section><a class="back-link" href="/ai/">← Back to AI</a></main>`;
  if (project.demoVideo) return `<main id="main" class="detail-page"><section class="detail-hero"><div><p class="eyebrow">Games · ${esc(project.yearStatus)}</p><h1>${esc(project.title)}</h1><p>${esc(project.description)}</p><div class="tags">${[...project.roles,...project.technologies].map(tag => `<span>${esc(tag)}</span>`).join('')}</div><a class="button" href="#gameplay-demo">Watch gameplay ↓</a></div><img src="${project.artwork}" alt="${esc(project.title)} supplied gameplay"></section><section id="gameplay-demo" class="game-evidence-section"><h2>Gameplay demonstration</h2><video controls playsinline preload="none" poster="${project.artwork}" aria-label="${esc(project.title)} gameplay demonstration"><source src="${project.demoVideo}" type="video/mp4"></video><p>The supplied demonstration shows the actual game. The compiled build is not a browser-playable release.</p></section><section class="detail-grid"><article><p class="eyebrow">Project overview</p><h2>What is known</h2><p>${esc(project.description)}</p></article><article><p class="eyebrow">Source record</p><h2>${project.credits ? 'Team credits' : 'Build and demo'}</h2><p>${project.credits ? esc(project.credits) : 'Unity Windows build and gameplay recording supplied by Bobby. Individual contribution details have not yet been supplied.'}</p><p>Exploration movement, camera, and character scale will be prototyped before final environment artwork.</p></article></section><a class="back-link" href="/games/">← Back to games</a></main>`;
  return `<main id="main" class="detail-page"><section class="detail-hero"><div><p class="eyebrow">${esc(project.category)} · ${esc(project.yearStatus)}</p><h1>${esc(project.title)}</h1><p>${esc(project.description)}</p><div class="tags">${[...project.roles, ...project.technologies].map(tag => `<span>${esc(tag)}</span>`).join('')}</div>${project.externalLinks.map(link => `<a class="button" href="${link.url}" target="_blank" rel="noreferrer">${esc(link.label)} ↗</a>`).join('')}</div><img src="${project.artwork}" alt="${esc(project.title)} artwork"></section><section class="detail-grid"><article><p class="eyebrow">Project overview</p><h2>What is known</h2><p>${esc(project.description)}</p></article><article class="pending"><p class="eyebrow">Development notes</p><h2>Source material required</h2><p>Design challenge, process, collaborators, screenshots, and playable links will appear here when verified material is supplied.</p></article></section><a class="back-link" href="/${project.category}/">← Back to ${project.category}</a></main>`;
}

export function professionalChrome(page) {
  const current = ({ projects: 'Mission Board', 'skills-experience': 'Skill Tree', resume: 'Dossier', about: 'Player Profile', detail: 'Project Detail' })[page] || 'Portfolio';
  return `<a class="skip-link" href="#main">Skip to content</a><header class="hud"><a class="brand" href="/" aria-label="Bobby Zhang — Creative Room"><span class="brand-mark">BZ</span><span class="brand-sub">player one</span></a><nav class="hud-actions" aria-label="Primary"><button class="history-back" type="button">← Back</button><a href="/">Room</a><button class="menu-button" type="button" aria-expanded="false" aria-controls="player-menu">☰ Player Menu</button><button class="sound-button" type="button" aria-pressed="false"></button></nav><div class="section-indicator"><span>Current zone</span><strong>${esc(current)}</strong></div></header>`;
}

export function renderProfessionalPage(page) {
  const views = { projects: missionBoard, 'skills-experience': skillsPage, resume: resumePage, about: aboutPage, detail: detailPage };
  return (views[page] || missionBoard)();
}

export function professionalFooter() {
  return '<footer><span>© 2026 Bobby Zhang</span><span>Built by hand · Westlake Village, CA</span><a href="/projects/">Fast route: Mission Board →</a></footer>';
}

export function initProfessionalPage() {
  $$('[data-filter]').forEach(button => button.addEventListener('click', () => {
    $$('[data-filter]').forEach(filter => {
      const active = filter === button;
      filter.classList.toggle('active', active);
      filter.setAttribute('aria-pressed', String(active));
    });
    $$('[data-category]').forEach(cardElement => {
      cardElement.hidden = button.dataset.filter !== 'all' && cardElement.dataset.category !== button.dataset.filter;
    });
  }));
  document.querySelector('.history-back')?.addEventListener('click', () => history.length > 1 ? history.back() : location.assign('/'));
}
