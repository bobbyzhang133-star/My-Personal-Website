import { renderRoom, mountRoom, alignRoomGeometry } from './room.js?v=5d56ac3eab02';
import { renderGames, mountGames } from './games.js?v=5d56ac3eab02';
import { renderFilms, mountFilms } from './films.js?v=5d56ac3eab02';
import { renderResearch, mountResearch } from './research.js?v=5d56ac3eab02';
import { renderMusic, mountMusic } from './music.js?v=5d56ac3eab02';
import { renderAI, mountAI } from './ai.js?v=5d56ac3eab02';

export const sceneRegistry = {
  home: { path: '/', title: 'Creative Room', render: renderRoom, mount: mountRoom, align: alignRoomGeometry },
  games: { path: '/games/', title: 'Games · Character Select', render: renderGames, mount: mountGames },
  films: { path: '/films/', title: 'Films · Archive', render: renderFilms, mount: mountFilms },
  research: { path: '/research/', title: 'Research · Field Notes', render: renderResearch, mount: mountResearch },
  music: { path: '/music/', title: 'Music · Studio Session', render: renderMusic, mount: mountMusic },
  ai: { path: '/ai/', title: 'AI · Creative System', render: renderAI, mount: mountAI }
};
