import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';
import { projects } from '../public/portfolio/assets/js/content.js';

const root = new URL('../public/portfolio/', import.meta.url);
const routes = ['', 'games/', 'films/', 'music/', 'research/', 'ai/', 'projects/', 'skills-experience/', 'resume/', 'about/'];
const detailRoutes = projects.map(project => project.detailRoute.replace(/^\//, ''));

test('every portfolio route has a static entry document', async () => {
  await Promise.all([...routes.map(route => access(new URL(`${route}index.html`, root))), ...detailRoutes.map(route => access(new URL(route, root)))]);
});

test('routes use shared CSS and JavaScript modules', async () => {
  const pages = await Promise.all(routes.map(route => readFile(new URL(`${route}index.html`, root), 'utf8')));
  for (const html of pages) {
    assert.match(html, /\/assets\/css\/site\.css/);
    assert.match(html, /type="module" src="\/assets\/js\/site\.js"/);
    assert.match(html, /<meta name="viewport"/);
  }
});

test('shared content contains the complete inventory and accessibility support', async () => {
  const [content, site, css] = await Promise.all([readFile(new URL('assets/js/content.js', root), 'utf8'),readFile(new URL('assets/js/site.js', root), 'utf8'),readFile(new URL('assets/css/site.css', root), 'utf8')]);
  assert.equal((content.match(/detailRoute:/g) || []).length, 14);
  assert.equal((content.match(/^ {2}\['/gm) || []).length, 10);
  assert.match(site, /Skip to content/);
  assert.match(site, /aria-current/);
  assert.match(site, /initAudio/);
  assert.match(site, /Player Menu/);
  assert.match(site, /data-carousel="games"/);
  assert.match(site, /data-film-browser/);
  assert.match(site, /data-book/);
  assert.match(site, /data-studio/);
  assert.match(site, /data-ai-system/);
  assert.match(await readFile(new URL('assets/js/audio.js', root), 'utf8'), /localStorage/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
});

test('Home Room uses layered pixel assets without CSS-drawn interactables', async () => {
  const [site, css, credits] = await Promise.all([
    readFile(new URL('assets/js/site.js', root), 'utf8'),
    readFile(new URL('assets/css/site.css', root), 'utf8'),
    readFile(new URL('CREDITS.md', root), 'utf8')
  ]);
  const roomAssets = [
    'cool-school-wall.png',
    'cool-school-floor.png',
    'cool-school-window.png',
    'cool-school-book.png',
    'cool-school-computer.png',
    'camera-original.svg',
    'guitar-original.svg',
    'rug-original.svg',
    'lighting-overlay-original.svg',
    'bird-temporary-sprites.svg'
  ];

  await Promise.all(roomAssets.map(asset => access(new URL(`assets/room/pixel/${asset}`, root))));
  assert.match(site, /room-background/);
  assert.match(site, /room-furniture/);
  assert.match(site, /room-foreground/);
  assert.match(site, /room-lighting/);
  assert.match(site, /data-asset-status="temporary"/);
  assert.match(site, /data-state="idle"/);
  assert.match(site, /walk-left/);
  assert.match(site, /walk-right/);
  assert.match(site, /if \(page === 'home'\) return `<a class="skip-link"/);
  assert.match(site, /class="room-controls"/);
  assert.match(css, /\.room-controls \.room-control/);
  assert.match(css, /--object-glow:/);
  assert.match(css, /drop-shadow\(1px 0 0 var\(--object-glow\)\)/);
  assert.doesNotMatch(site, /css-book|css-computer|Pip/);
  assert.doesNotMatch(css, /\.css-book|\.css-computer|\.desk\s*\{|\.lamp\s*\{/);
  assert.match(credits, /Cool School tileset/);
  assert.match(credits, /CC0 1\.0/);
  assert.match(credits, /actual One Last Bird sprite was not found/);
});
