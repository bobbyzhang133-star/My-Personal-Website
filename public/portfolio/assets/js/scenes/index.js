import { renderRoom, mountRoom, alignRoomGeometry, prepareRoomJournal, copyRoomJournal } from './room.js?v=260ff82f01eb';
import { renderGames, mountGames } from './games.js?v=260ff82f01eb';
import { renderFilms, mountFilms } from './films.js?v=260ff82f01eb';
import { renderResearch, mountResearch } from './research.js?v=260ff82f01eb';
import { renderMusic, mountMusic } from './music.js?v=260ff82f01eb';
import { renderAI, mountAI } from './ai.js?v=260ff82f01eb';

export const sceneRegistry = {
  home: { path: '/', title: 'Creative Room', render: renderRoom, mount: mountRoom, align: alignRoomGeometry, ready: prepareRoomJournal, copyArtwork: copyRoomJournal },
  games: { path: '/games/', title: 'Games · Character Select', render: renderGames, mount: mountGames },
  films: { path: '/films/', title: 'Films · Archive', render: renderFilms, mount: mountFilms },
  research: { path: '/research/', title: 'Research · Field Notes', render: renderResearch, mount: mountResearch },
  music: { path: '/music/', title: 'Music · Studio Session', render: renderMusic, mount: mountMusic },
  ai: { path: '/ai/', title: 'AI · Creative System', render: renderAI, mount: mountAI }
};
