export function renderGameShell() {
  return `<a class="skip-link" href="#main">Skip to active scene</a>
    <div class="game-shell" data-game-shell data-shell-state="BOOTING" aria-busy="true">
      <header class="game-hud" data-game-hud aria-label="Game controls">
        <div class="game-hud-group">
          <button class="menu-button game-control" type="button" aria-expanded="false" aria-controls="player-menu"><span aria-hidden="true">ESC</span> Menu</button>
          <button class="room-return game-control" type="button" data-room-return hidden><span aria-hidden="true">↙</span> Room</button>
        </div>
      </header>
      <p class="visually-hidden" data-scene-announcer aria-live="polite"></p>
      <div class="room-backdrop" data-room-backdrop aria-hidden="true" inert></div>
      <div class="scene-host" data-scene-host></div>
      <div class="transition-layer" data-transition-layer aria-hidden="true"></div>
    </div>`;
}
