import { projects } from '../content.js?v=3fe186ecf43b';
import { purchaseResearch, researchBlocks } from '../research-summary.js?v=3fe186ecf43b';
import { esc, isReducedMotion } from '../utils.js?v=3fe186ecf43b';
import { sceneController } from './shared.js?v=3fe186ecf43b';
import { journalMechanism } from './journal-motion.js?v=3fe186ecf43b';
import { pageFold, foldPolygon } from './book-fold.js?v=3fe186ecf43b';
import { addPageSample, pageReleaseIntent } from './book-gesture.js?v=3fe186ecf43b';

const chapters = projects.filter(project => project.category === 'research');

export const researchPages = [
  { title: 'Field Notes', kind: 'contents' },
  ...chapters.map(project => ({ title: 'Why players spend', kind: 'chapter', project })),
  ...purchaseResearch.sections.map(section => ({ ...section, kind: 'notes' }))
];

export function bookPageIndex(page, single = false, count = researchPages.length) {
  const bounded = Math.max(0, Math.min(count - 1, Math.trunc(Number(page) || 0)));
  return single ? bounded : bounded - bounded % 2;
}

export function bookDestination(page, direction, single = false, count = researchPages.length) {
  return bookPageIndex(bookPageIndex(page, single, count) + Math.sign(direction) * (single ? 1 : 2), single, count);
}

function pageContent(page) {
  const heading = `<h2 tabindex="-1">${esc(page.title)}</h2>`;
  if (page.kind === 'contents') {
    const links = researchPages.slice(1).map(({ title }, index) =>
      `<button type="button" data-book-jump="${index + 1}"><span>${esc(title)}</span><small aria-hidden="true">${String(index + 2).padStart(2, '0')}</small></button>`
    ).join('');
    return `<p class="eyebrow">Bobby Zhang / Research journal</p>${heading}<p class="book-intro">Notes on why players spend in free-to-play games.</p><nav class="book-contents" aria-label="Table of contents">${links}</nav>`;
  }
  if (page.kind === 'notes') return `<p class="eyebrow">Research notebook</p>${heading}${researchBlocks(page.blocks)}`;
  return `<p class="eyebrow">Project overview / ${esc(page.project.yearStatus)}</p>${heading}<p class="book-summary">${esc(purchaseResearch.introduction)}</p><p class="book-summary">The draft considers fear of missing out, parasocial attachment, and the appeal of expressing an ideal self. Its two cases put these ideas alongside the actual design of in-game offers.</p><a class="book-read-link" href="${page.project.detailRoute}">Open project notes <span aria-hidden="true">↗</span></a><p class="book-availability">${esc(purchaseResearch.status)}</p>`;
}

function pageMarkup(index, side = '') {
  const page = researchPages[index];
  if (!page) return '<div class="book-page book-blank" aria-hidden="true"></div>';
  return `<article class="book-page journal-page ${side}" data-page-index="${index}" data-page-kind="${page.kind}" aria-label="Page ${index + 1}: ${esc(page.title)}"><div class="book-page-content">${pageContent(page)}</div><div class="book-folio"><span>FIELD NOTES</span><span>${String(index + 1).padStart(2, '0')}</span></div></article>`;
}

export function renderResearch({ preview: isPreview = false } = {}) {
  const id = isPreview ? '' : ' id="main"';
  return `<main${id} class="game-scene object-scene research-scene" data-scene="research" tabindex="-1" aria-labelledby="research-title">
    <h1 class="visually-hidden" id="research-title">Field Notes</h1>
    <div class="object-stage book-object-shell" data-object-interface="book">
      <div class="journal-body"><div class="book-cover" aria-hidden="true"><img class="journal-binding-art" src="/assets/room/master/journal-binding.svg" alt=""></div>
      <section class="open-book scene-surface flipbook" data-category-interface data-book data-keyboard-surface tabindex="0" aria-label="Research flipbook" aria-describedby="book-help">
        <div class="flipbook-viewport" data-book-viewport>
          <div class="book-resting-pages" data-book-pages>${pageMarkup(0, 'page-left')}${pageMarkup(1, 'page-right')}</div>
          <div class="book-spine" aria-hidden="true"></div>
          <div class="book-turning-leaf" data-book-leaf aria-hidden="true" inert hidden></div>
          <button class="book-edge book-edge-prev" type="button" data-book-edge="-1" aria-label="Turn previous page" tabindex="-1" disabled></button>
          <button class="book-edge book-edge-next" type="button" data-book-edge="1" aria-label="Turn next page" tabindex="-1"></button>
        </div>
        <div class="book-reader-controls" role="group" aria-label="Book navigation">
          <button type="button" data-book-direction="-1" aria-label="Previous page" disabled><span aria-hidden="true">‹</span></button>
          <button type="button" class="book-contents-control" data-book-jump="0">Contents</button>
          <span class="book-counter" data-book-counter role="status" aria-live="polite">Pages 1–2 / ${researchPages.length}</span>
          <button type="button" data-book-direction="1" aria-label="Next page"><span aria-hidden="true">›</span></button>
        </div>
        <p id="book-help" class="book-help">Pull the page edge from any height · Or use ← →</p>
      </section></div>
      ${journalMechanism(pageMarkup(0, 'page-left'))}
    </div>
  </main>`;
}

export function mountResearch(root) {
  const lifecycle = sceneController();
  const { signal } = lifecycle;
  const surface = root.querySelector('[data-book]');
  const viewport = surface.querySelector('[data-book-viewport]');
  const pages = surface.querySelector('[data-book-pages]');
  const leaf = surface.querySelector('[data-book-leaf]');
  const counter = surface.querySelector('[data-book-counter]');
  const media = window.matchMedia('(max-width: 680px) and (orientation: portrait)');
  let single = media.matches;
  let index = 0;
  let readingPage = 0;
  let turn = null;
  let gesture = null;
  let frame = 0;
  let suppressUntil = 0;

  function paint() {
    surface.dataset.bookMode = single ? 'single' : 'spread';
    surface.dataset.bookPage = String(index + 1);
    pages.innerHTML = pageMarkup(index, 'page-left') + (single ? '' : pageMarkup(index + 1, 'page-right'));
    const facing = !single && index + 1 < researchPages.length;
    counter.textContent = `${facing ? 'Pages' : 'Page'} ${index + 1}${facing ? `–${index + 2}` : ''} / ${researchPages.length}`;
    surface.querySelectorAll('[data-book-direction], [data-book-edge]').forEach(button => {
      const direction = Number(button.dataset.bookDirection || button.dataset.bookEdge);
      button.disabled = bookDestination(index, direction, single) === index;
    });
  }

  function finish(commit = true) {
    cancelAnimationFrame(frame);
    const jumpPage = turn && commit ? turn.jumpPage : undefined;
    if (turn && commit) {
      index = turn.to;
      readingPage = jumpPage ?? index;
    }
    const refocus = pages.contains(document.activeElement);
    turn = null;
    leaf.hidden = true;
    leaf.innerHTML = '';
    surface.removeAttribute('data-turning');
    pages.inert = false;
    paint();
    if (jumpPage !== undefined) focusPage(jumpPage);
    else if (refocus) surface.focus({ preventScroll: true });
  }

  function focusPage(page) {
    const heading = pages.querySelector(`[data-page-index="${page}"] h2`);
    if (!heading) return;
    heading.parentElement.scrollTop = 0;
    heading.focus({ preventScroll: true });
  }

  function fold(point) {
    const shape = pageFold(point, turn.width, turn.height, turn.grabY, turn.direction);
    turn.point = shape.position;
    turn.progress = shape.progress;
    if (isReducedMotion()) return;
    leaf.dataset.foldAngle = shape.angle.toFixed(2);
    leaf.dataset.grabY=turn.grabY.toFixed(2);
    leaf.dataset.foldX=shape.position.x.toFixed(2);leaf.dataset.foldY=shape.position.y.toFixed(2);
    turn.front.style.transform = `translateX(${shape.frontX}px)`;
    turn.front.style.clipPath = foldPolygon(shape.front);
    turn.back.style.transform = `matrix(${shape.matrix.map(n => n.toFixed(6)).join(',')})`;
    turn.back.style.clipPath = foldPolygon(shape.back);
    const diagonal = Math.hypot(turn.width, turn.height);
    for (const [face, sign] of [[turn.front, turn.direction], [turn.back, -turn.direction]]) {
      const shade = face.querySelector('.book-fold-shade');
      const x = sign > 0 ? shape.midpoint.x : turn.width - shape.midpoint.x;
      const rotation = Math.atan2(sign * shape.normal.y, shape.normal.x) * 180 / Math.PI;
      shade.style.height = `${diagonal * 2}px`;
      shade.style.transformOrigin = `45px ${diagonal}px`;
      shade.style.transform = `translate(${x - 45}px,${shape.midpoint.y - diagonal}px) rotate(${rotation}deg)`;
      shade.style.opacity = String(shape.shadow);
    }
  }

  function begin(to, corner = 'bottom') {
    if (turn || to === index) return false;
    const direction = to > index ? 1 : -1;
    const rect = viewport.getBoundingClientRect();
    const width = rect.width / (single ? 1 : 2);
    const grabY=typeof corner==='number'?Math.max(0,Math.min(rect.height,corner)):corner==='top'?0:rect.height;
    turn = { to, direction, progress: 0, grabY, width, height: rect.height,
      point: { x: width, y: grabY },
      top: rect.top };
    if (isReducedMotion()) return true;
    surface.dataset.turning = direction > 0 ? 'forward' : 'backward';
    leaf.dataset.direction = String(direction);
    const frontIndex = single ? index : index + (direction > 0 ? 1 : 0);
    const backIndex = single ? to : to + (direction > 0 ? 0 : 1);
    const front = pageMarkup(frontIndex), back = pageMarkup(backIndex);
    const scrollTop = pages.querySelector(`[data-page-index="${frontIndex}"] .book-page-content`)?.scrollTop || 0;
    leaf.style.setProperty('--paper-width', `${width}px`);
    leaf.innerHTML = `<div class="book-leaf-face leaf-front">${front}<span class="book-fold-shade"></span></div><div class="book-leaf-face leaf-back">${back}<span class="book-fold-shade"></span></div>`;
    turn.front = leaf.querySelector('.leaf-front');
    turn.back = leaf.querySelector('.leaf-back');
    leaf.querySelectorAll('.leaf-front .book-page-content').forEach(content => { content.scrollTop = scrollTop; });
    pages.innerHTML = single ? pageMarkup(to, 'page-left') : direction > 0
      ? pageMarkup(index, 'page-left') + pageMarkup(to + 1, 'page-right')
      : pageMarkup(to, 'page-left') + pageMarkup(index + 1, 'page-right');
    pages.inert = true;
    leaf.hidden = false;
    fold(turn.point);
    return true;
  }

  function settle(commit = true, automatic = false, intent = {}) {
    if (!turn) return;
    if (isReducedMotion()) { finish(commit); return; }
    const start = { ...turn.point };
    const end = { x: (commit ? -1 : 1) * turn.width, y: turn.grabY };
    const distance=Math.hypot(end.x-start.x,end.y-start.y);
    const duration = intent.flick?Math.max(180,Math.min(650,distance/Math.max(.6,Math.abs(intent.velocity))*.8)):Math.max(220,distance/(2*turn.width)*(automatic?1350:900));
    const started = performance.now();
    const tick = now => {
      if (!turn || signal.aborted) return;
      const time = Math.min(1, (now - started) / duration);
      const eased = intent.flick?1-(1-time)**3:time * time * (3 - 2 * time);
      const lift = automatic ? Math.sin(eased * Math.PI) * turn.height * .16 * (turn.grabY < turn.height/2 ? 1 : -1) : 0;
      fold({ x: start.x + (end.x - start.x) * eased, y: start.y + (end.y - start.y) * eased + lift });
      if (time < 1) frame = requestAnimationFrame(tick);
      else finish(commit);
    };
    frame = requestAnimationFrame(tick);
  }

  function go(to, jump = false) {
    if (gesture || turn) return;
    const page = bookPageIndex(to, true);
    const target = bookPageIndex(page, single);
    if (target === index) {
      if (jump) {
        readingPage = page;
        focusPage(page);
      }
      return;
    }
    if (pages.contains(document.activeElement)) surface.focus({ preventScroll: true });
    if (begin(target)) {
      if (jump) turn.jumpPage = page;
      settle(true, true);
    }
  }

  surface.addEventListener('click', event => {
    if (viewport.contains(event.target) && performance.now() < suppressUntil) { event.preventDefault(); return; }
    const direction = event.target.closest('[data-book-direction], [data-book-edge]');
    const jump = event.target.closest('[data-book-jump]');
    if (direction) go(bookDestination(index, Number(direction.dataset.bookDirection || direction.dataset.bookEdge), single));
    else if (jump) go(Number(jump.dataset.bookJump), true);
  }, { signal });

  surface.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.target.closest('input, textarea, select')) return;
    let target;
    if (['ArrowRight', 'PageDown'].includes(event.key)) target = bookDestination(index, 1, single);
    else if (['ArrowLeft', 'PageUp'].includes(event.key)) target = bookDestination(index, -1, single);
    else if (event.key === 'Home') target = 0;
    else if (event.key === 'End') target = researchPages.length - 1;
    else return;
    event.preventDefault();
    go(target);
  }, { signal });

  viewport.addEventListener('pointerdown', event => {
    if (turn || gesture || !event.isPrimary || event.button !== 0) return;
    if (event.target.closest('a, button:not([data-book-edge])')) return;
    const rect = viewport.getBoundingClientRect();
    const x = event.clientX - rect.left;
    if (event.pointerType === 'mouse' && x > 48 && x < rect.width - 48) return;
    // Take ownership before the browser starts a text-selection drag. Touch
    // keeps its native vertical reading scroll until a horizontal pull wins.
    if(event.pointerType!=='touch')event.preventDefault();
    const selection=document.getSelection?.();
    if(selection&&(viewport.contains(selection.anchorNode)||viewport.contains(selection.focusNode)))selection.removeAllRanges();
    viewport.dataset.bookGrabbed='true';
    gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, pointerType: event.pointerType, width: rect.width / (single ? 1 : 2), active: false,
      grabY: event.clientY - rect.top, samples:[],
      edge: Number(event.target.closest('[data-book-edge]')?.dataset.bookEdge || 0) };
    suppressUntil = 0;
    addPageSample(gesture.samples,event.clientX,Number.isFinite(event.timeStamp)?event.timeStamp:performance.now());
    viewport.setPointerCapture(event.pointerId);
  }, { signal });

  for(const type of ['selectstart','dragstart'])viewport.addEventListener(type,event=>{
    if(gesture||turn)event.preventDefault();
  },{signal});

  viewport.addEventListener('pointermove', event => {
    if (!gesture || event.pointerId !== gesture.id) return;
    const dx = event.clientX - gesture.x;
    const dy = event.clientY - gesture.y;
    if (!gesture.active) {
      if (gesture.pointerType === 'touch' && Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { releaseGesture(); return; }
      if (Math.hypot(dx, dy) < 8) return;
      const direction = single ? (dx <= 0 ? 1 : -1) : gesture.x < viewport.getBoundingClientRect().left + gesture.width ? -1 : 1;
      if (!single && ((gesture.x < viewport.getBoundingClientRect().left + gesture.width) === (direction > 0))) { releaseGesture(); return; }
      if (!begin(bookDestination(index, direction, single), gesture.grabY)) { releaseGesture(); return; }
      gesture.active = true;
    }
    event.preventDefault();
    addPageSample(gesture.samples,event.clientX,Number.isFinite(event.timeStamp)?event.timeStamp:performance.now());
    fold({ x: turn.width+turn.direction*dx, y: event.clientY - turn.top });
  }, { signal });

  function releaseGesture() {
    if (!gesture) return;
    const id = gesture.id;
    gesture = null;
    delete viewport.dataset.bookGrabbed;
    if (viewport.hasPointerCapture(id)) viewport.releasePointerCapture(id);
  }
  function endGesture(event, cancel = false) {
    if (!gesture || event.pointerId !== gesture.id) return;
    const { active, edge, samples } = gesture;
    const now=Number.isFinite(event.timeStamp)?event.timeStamp:performance.now();
    if(active&&!cancel&&Number.isFinite(event.clientX)){
      addPageSample(samples,event.clientX,now);
      // The final release may contain motion not delivered by pointermove.
      if(Number.isFinite(event.clientY))fold({x:turn.width+turn.direction*(event.clientX-gesture.x),y:event.clientY-turn.top});
    }
    const intent=active?pageReleaseIntent(samples,{direction:turn.direction,progress:turn.progress,width:turn.width,now,cancelled:cancel}):null;
    releaseGesture();
    if (active || edge) suppressUntil = performance.now() + 350;
    if (active) settle(intent.commit,false,intent);
    else if (edge && !cancel) go(bookDestination(index, edge, single));
  }
  viewport.addEventListener('pointerup', event => endGesture(event), { signal });
  viewport.addEventListener('pointercancel', event => endGesture(event, true), { signal });
  viewport.addEventListener('lostpointercapture', event => endGesture(event, true), { signal });
  window.addEventListener('resize', () => {
    releaseGesture();
    finish(false);
    single = media.matches;
    index = bookPageIndex(readingPage, single);
    paint();
  }, { signal });
  signal.addEventListener('abort', () => {
    releaseGesture();
    cancelAnimationFrame(frame);
    turn = null;
  }, { once: true });
  paint();
  return lifecycle;
}
