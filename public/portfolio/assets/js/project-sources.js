import { esc } from './utils.js?v=43292090dc3e';

// Keep embedding URLs in content; direct links must open the original file viewer.
export function originalSourceUrl(url) {
  return url.replace(/^(https:\/\/drive\.google\.com\/file\/d\/[^/]+)\/preview(?=\?|$)/, '$1/view');
}

export function projectSources(project) {
  const links = project.externalLinks.map(link => ({ ...link, url: originalSourceUrl(link.url) }));
  if (project.demoVideo) links.push({ label: 'Watch original gameplay recording', url: project.demoVideo });
  return links;
}

export function sourceLinks(project, className = 'text-link') {
  return projectSources(project).map(link => `<a class="${className}" href="${esc(link.url)}" target="_blank" rel="noopener noreferrer">${esc(link.label)} <span aria-hidden="true">↗</span></a>`).join('');
}

export function gameSources(project) {
  return `<section class="world-original-sources" aria-label="Original game sources"><h3>Original game & media</h3>${sourceLinks(project, 'game-control') || '<p>The original release link has not been supplied yet.</p>'}${project.demoVideo ? '<p>Original gameplay recording. A public playable build link has not been supplied.</p>' : ''}</section>`;
}
