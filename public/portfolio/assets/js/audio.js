const STORAGE_KEY = 'bz-portfolio-sound';

export function initAudio(button) {
  let context;
  let enabled = localStorage.getItem(STORAGE_KEY) === 'on';

  function update() {
    button.setAttribute('aria-pressed', String(enabled));
    button.innerHTML = `<span aria-hidden="true">${enabled ? '◉' : '○'}</span> Sound ${enabled ? 'On' : 'Off'}`;
    button.title = 'Interface sounds only. Room ambience is awaiting a verified licensed asset.';
  }

  function tone(frequency = 420, duration = 0.045, volume = 0.025) {
    if (!enabled || document.hidden) return;
    context ||= new AudioContext();
    if (context.state === 'suspended') context.resume();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, context.currentTime);
    gain.gain.setValueAtTime(volume, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + duration);
  }

  button.addEventListener('click', () => {
    enabled = !enabled;
    localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off');
    update();
    tone(520, 0.08, 0.035);
  });

  document.addEventListener('click', event => {
    if (event.target.closest('a, button') && !event.target.closest('.sound-button')) tone(360);
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && context?.state === 'running') context.suspend();
  });
  update();
  return { tone };
}
