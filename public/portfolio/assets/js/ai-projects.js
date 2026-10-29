import { projects, aiResearchNotes } from './content.js?v=43292090dc3e';
import { esc } from './utils.js?v=43292090dc3e';

export const AI_PROFILE_SOURCE='https://github.com/bobbyzhang133-star/bobbyzhang133-star/blob/main/README.md';

export function aiEvidence(project) {
  const research=project.relatedResearch?projects.find(item=>item.id===project.relatedResearch):null;
  return `${(project.researchDetails||[]).map(record=>`<section><h3>${esc(record.title)}</h3><p>${esc(record.text)}</p></section>`).join('')}
    ${project.aiKind==='research'?`<section><h3>Open research questions</h3><ul>${aiResearchNotes.map(note=>`<li>${esc(note)}</li>`).join('')}</ul></section>`:''}
    ${research?`<p><a href="${research.detailRoute}">Read the Game Builder research & journal ↗</a></p>`:''}
    <p class="ai-source"><a href="${AI_PROFILE_SOURCE}" target="_blank" rel="noreferrer">Project index on GitHub ↗</a></p>`;
}

export function aiActions(project) {
  return project.externalLinks.map(link=>`<a class="select-button" href="${esc(link.url)}" target="_blank" rel="noreferrer">${esc(link.label)} ↗</a>`).join('');
}
