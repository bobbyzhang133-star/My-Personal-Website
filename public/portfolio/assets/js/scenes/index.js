import { renderRoom, mountRoom, alignRoomGeometry, prepareRoomArtwork, copyRoomArtwork } from './room.js?v=3fe186ecf43b';
import { renderGames, mountGames } from './games.js?v=3fe186ecf43b';
import { renderFilms, mountFilms } from './films.js?v=3fe186ecf43b';
import { renderResearch, mountResearch } from './research.js?v=3fe186ecf43b';
import { renderMusic, mountMusic } from './music.js?v=3fe186ecf43b';
import { renderAI, mountAI } from './ai.js?v=3fe186ecf43b';

export const sceneRegistry = {
  home: { path: '/', title: 'Creative Room', render: renderRoom, mount: mountRoom, align: alignRoomGeometry, ready: prepareRoomArtwork, copyArtwork: copyRoomArtwork },
  games: { path: '/games/', title: 'Games · Character Select', render: renderGames, mount: mountGames },
  films: { path: '/films/', title: 'Films · Archive', render: renderFilms, mount: mountFilms },
  research: { path: '/research/', title: 'Research · Field Notes', render: renderResearch, mount: mountResearch },
  music: { path: '/music/', title: 'Music · Studio Session', render: renderMusic, mount: mountMusic },
  ai: { path: '/ai/', title: 'AI · Creative System', render: renderAI, mount: mountAI }
};
