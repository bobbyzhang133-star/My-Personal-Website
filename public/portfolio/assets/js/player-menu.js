import { $, $$, esc, isReducedMotion } from './utils.js?v=43292090dc3e';

const MOTION_KEY = 'bz-portfolio-motion';

function storedMotion() {
  try {
    return localStorage.getItem(MOTION_KEY) === 'reduced';
  } catch {
    return false;
  }
}

export function playerMenuMarkup({gameProject=null,sceneStyle='default'}={}) {
  const style=gameProject?'game':sceneStyle==='studio'?'studio':'default';
  return `<div class="menu-backdrop" data-menu-backdrop data-menu-style="${style}" hidden></div>
    <aside class="player-menu" id="player-menu" data-menu-style="${style}" aria-labelledby="player-menu-title" aria-modal="true" role="dialog" hidden>
      <div class="pause-status"><span class="status-dot" aria-hidden="true"></span> ${gameProject?esc(gameProject.title):style==='studio'?'Creative studio':'Player Menu'}</div>
      <button class="menu-close" type="button" aria-label="Close Player Menu">×</button>
      <div class="menu-heading"><p class="eyebrow">Game paused</p><h2 id="player-menu-title">Player Menu</h2><p>Choose a route or return to the world.</p></div>
      <nav aria-label="Player Menu" data-menu-main>
        <button class="menu-continue" type="button"><b>Continue</b><span>Return to the current scene</span></button>
        <a href="/projects/"><b>Projects</b><span>Mission Board</span></a>
        <a href="/skills-experience/"><b>Skills &amp; Experience</b><span>Skill Tree</span></a>
        <a href="/resume/"><b>Resume</b><span>Player Dossier</span></a>
        <a href="/about/"><b>About &amp; Contact</b><span>Player Profile</span></a>
        <button type="button" data-menu-view="credits"><b>Credits</b><span>Art, audio, and type</span></button>
        <button type="button" data-menu-view="settings"><b>Settings</b><span>Motion and sound</span></button>
        <button class="menu-room" type="button" data-menu-room><b>Return to Room</b><span>Creative Studio</span></button>
      </nav>
      <section class="menu-panel" data-menu-panel="credits" tabindex="-1" hidden>
        <button class="menu-panel-back" type="button" data-menu-view="main">← Player Menu</button>
        <p class="eyebrow">Credits</p><h3>Built from a small, credited toolkit.</h3>
        <p>${gameProject?'This game UI references the supplied artwork and original menus/HUDs where available. It controls a shortened portfolio interpretation, not the original executable. Supplied game assets are not claimed as CC0; source details and the UI font license are recorded in the complete credits.':'The studio is derived from one approved master composition, with five matching object cutouts. Its bird is a master-derived interpretation of the original game character. The mint laptop reference derives from NettySvit’s CC0 tileset. Room ambience is leonelmail’s CC0 “Roomtone Bedroom Yew.” Pixelify Sans is licensed under the SIL Open Font License.'}</p>
        <a href="/CREDITS.md" target="_blank" rel="noreferrer">Read complete asset credits ↗</a>
      </section>
      <section class="menu-panel" data-menu-panel="settings" tabindex="-1" hidden>
        <button class="menu-panel-back" type="button" data-menu-view="main">← Player Menu</button>
        <p class="eyebrow">Settings</p><h3>Make the world comfortable.</h3>
        ${style==='studio'?'<button class="setting-toggle" type="button" data-sound-toggle aria-pressed="true"><b>Sound on</b><span>Room ambience and interface sounds</span></button>':''}
        <button class="setting-toggle" type="button" data-motion-toggle aria-pressed="false"><b>Reduce motion</b><span>Skip camera travel and idle movement</span></button>
        <p>${style==='studio'?'Sound is enabled by default. If your browser blocks autoplay, it starts with your first interaction. Your mute choice is remembered.':'Sound is controlled from the corner HUD and remains off until you choose to enable it.'}</p>
      </section>
      <p class="menu-help">Esc close · Tab navigate · Enter select</p>
    </aside>`;
}

export function initPlayerMenu({ onReturnRoom = () => {}, onMotionChange = () => {} } = {}) {
  const menu = $('#player-menu');
  const backdrop = $('[data-menu-backdrop]');
  const opener = $('.menu-button');
  const closeButton = $('.menu-close', menu);
  const continueButton = $('.menu-continue', menu);
  const main = $('[data-menu-main]', menu);
  const panels = $$('[data-menu-panel]', menu);
  const motionToggle = $('[data-motion-toggle]', menu);
  let previousFocus;

  const applyMotion = reduced => {
    document.documentElement.dataset.motion = reduced ? 'reduced' : 'system';
    motionToggle.setAttribute('aria-pressed', String(reduced));
    motionToggle.querySelector('b').textContent = reduced ? 'Reduced motion on' : 'Reduce motion';
    onMotionChange(reduced || isReducedMotion());
  };

  const showView = view => {
    const isMain = view === 'main';
    main.hidden = !isMain;
    panels.forEach(panel => { panel.hidden = panel.dataset.menuPanel !== view; });
    if (!isMain) $('[data-menu-panel]:not([hidden])', menu)?.focus({ preventScroll: true });
    else continueButton.focus({ preventScroll: true });
  };

  const setOpen = (open, { restore = true } = {}) => {
    if (open) previousFocus = document.activeElement;
    menu.hidden = !open;
    backdrop.hidden = !open;
    opener?.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('menu-open', open);
    $('#app').inert = open;
    if (open) {
      showView('main');
      closeButton.focus({ preventScroll: true });
    } else if (restore) {
      if (previousFocus?.isConnected && !previousFocus.closest('[inert]')) previousFocus.focus({ preventScroll: true });
      else opener?.focus({ preventScroll: true });
    }
  };

  opener?.addEventListener('click', () => setOpen(true));
  closeButton.addEventListener('click', () => setOpen(false));
  continueButton.addEventListener('click', () => setOpen(false));
  backdrop.addEventListener('click', () => setOpen(false));
  $$('[data-menu-view]', menu).forEach(button => button.addEventListener('click', () => showView(button.dataset.menuView)));
  $('[data-menu-room]', menu).addEventListener('click', () => {
    setOpen(false, { restore: false });
    onReturnRoom();
  });
  motionToggle.addEventListener('click', () => {
    const reduced = motionToggle.getAttribute('aria-pressed') !== 'true';
    try {
      localStorage.setItem(MOTION_KEY, reduced ? 'reduced' : 'system');
    } catch {
      // The setting still applies for this visit when storage is unavailable.
    }
    applyMotion(reduced);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      event.preventDefault();
      if (menu.hidden) setOpen(true);
      else setOpen(false);
      return;
    }
    if (event.key !== 'Tab' || menu.hidden) return;
    const focusable = $$('button:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])', menu).filter(element => !element.hidden && !element.closest('[hidden]'));
    const first = focusable[0];
    const last = focusable.at(-1);
    if (!menu.contains(document.activeElement)) {
      event.preventDefault();
      first.focus();
    } else if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  applyMotion(storedMotion());
  return {
    closeForNavigation: () => { if (!menu.hidden) setOpen(false, { restore: false }); },
    isOpen: () => !menu.hidden
  };
}
