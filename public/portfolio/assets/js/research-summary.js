import { esc } from './utils.js?v=3fe186ecf43b';

export const purchaseResearch = {
  introduction: 'What makes spending feel worthwhile in a game that is free to start? This draft looks at how reward guarantees, limited-time offers, and attachment to characters or public figures can shape the purchase decision.',
  status: 'Draft overview. The full 29-page draft is not included in this journal.',
  sections: [
    {
      title: 'Cases & approach',
      blocks: [
        {
          title: 'A comparison framework',
          text: 'Compare the reward, price, deadline, and certainty of each offer. Separate what the game shows from what might motivate the player.'
        },
        {
          title: 'Genshin Impact · Character Event Wish',
          text: 'Wishes pair random rewards with a guarantee after a set number of attempts. Could seeing progress toward that guarantee encourage another pull?',
          source: ['HoYoverse · Wish guarantee', 'https://support.hoyoverse.com/hc/en-us/articles/50333940684953-How-does-the-Wish-guarantee-system-work']
        },
        {
          title: 'League of Legends · Hall of Legends',
          text: 'Riot’s 2024 event honored Faker with commemorative cosmetics. What might make a fixed offer tied to fandom appealing?',
          source: ['Riot Games · Hall of Legends event', 'https://www.leagueoflegends.com/en-au/news/game-updates/patch-14-12-notes/']
        }
      ]
    },
    {
      title: 'Related research',
      blocks: [
        {
          title: 'Why players buy in-game content',
          text: 'Hamari and colleagues grouped purchase motivations using player survey data and examined how those motivations related to spending. Their study provides a model for separating motives such as social interaction and smoother play.',
          source: ['Hamari et al. (2017) · Computers in Human Behavior', 'https://doi.org/10.1016/j.chb.2016.11.045']
        },
        {
          title: 'Spending on randomized rewards',
          text: 'Zendle and Cairns found an association between loot-box spending and problem gambling severity in a survey. The survey leaves the direction of that relationship unresolved.',
          source: ['Zendle & Cairns (2018) · PLOS ONE', 'https://doi.org/10.1371/journal.pone.0206767']
        }
      ]
    },
    {
      title: 'Open questions',
      blocks: [
        { title: 'Time pressure', text: 'How does an offer’s deadline affect how much time players spend comparing alternatives?' },
        { title: 'Fandom and identity', text: 'When does a parasocial bond with a public figure, or the appeal of expressing an ideal version of oneself, make a cosmetic feel more valuable?' },
        { title: 'Reward guarantees', text: 'Does a visible guarantee help players set a budget, encourage more pulls as they approach it, or do both for different players?' }
      ]
    }
  ]
};

export function researchBlocks(blocks) {
  return blocks.map(({ title, text, source }) =>
    `<section class="research-note"><h3>${esc(title)}</h3><p>${esc(text)}</p>${source ? `<a class="book-source-link" href="${esc(source[1])}" target="_blank" rel="noreferrer">${esc(source[0])} <span aria-hidden="true">↗</span></a>` : ''}</section>`
  ).join('');
}
