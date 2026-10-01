const STORAGE_KEY = 'bz-portfolio-sound';
const AMBIENCE_SRC = '/assets/audio/roomtone-bedroom-yew.mp3';
const AMBIENCE_VOLUME = 0.11;

function readPreference() {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'on';
  } catch {
    return false;
  }
}

function savePreference(enabled) {
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off');
  } catch {
    // Sound still works for this visit when storage is unavailable.
  }
}

export function initAudio(button, { ambience = false, ambienceSrc = AMBIENCE_SRC } = {}) {
  let context;
  let enabled = readPreference();
  let userGestureGranted = false;
  let ambienceStarted = false;
  let ambienceUnavailable = false;
  let fadeFrame;
  let fadeGeneration = 0;

  const ambientTrack = ambience && typeof Audio !== 'undefined' ? new Audio(ambienceSrc) : null;
  if (ambientTrack) {
    ambientTrack.loop = true;
    ambientTrack.preload = 'none';
    ambientTrack.volume = 0;
    ambientTrack.addEventListener('error', () => {
      ambienceUnavailable = true;
      fadeGeneration += 1;
      if (fadeFrame) cancelAnimationFrame(fadeFrame);
    });
  }

  function update() {
    button.setAttribute('aria-pressed', String(enabled));
    button.innerHTML = `<span aria-hidden="true">${enabled ? '◉' : '○'}</span> Sound ${enabled ? 'On' : 'Off'}`;
    button.title = ambience
      ? 'Low-volume room ambience and interface sounds. Sound starts only after you interact.'
      : 'Low-volume interface sounds.';
  }

  function fadeAmbience(targetVolume, duration = 320, pauseAfter = false) {
    if (!ambientTrack || ambienceUnavailable) return;

    fadeGeneration += 1;
    const generation = fadeGeneration;
    if (fadeFrame) cancelAnimationFrame(fadeFrame);
    const initialVolume = ambientTrack.volume;
    const startedAt = performance.now();

    const step = now => {
      if (generation !== fadeGeneration) return;
      const progress = Math.min((now - startedAt) / duration, 1);
      ambientTrack.volume = initialVolume + (targetVolume - initialVolume) * progress;
      if (progress < 1) {
        fadeFrame = requestAnimationFrame(step);
      } else if (pauseAfter) {
        ambientTrack.pause();
      }
    };

    fadeFrame = requestAnimationFrame(step);
  }

  async function startAmbience() {
    if (!ambientTrack || ambienceUnavailable || !enabled || !userGestureGranted || document.hidden) return;

    try {
      ambientTrack.volume = 0;
      await ambientTrack.play();
      if (!enabled || document.hidden) {
        pauseAmbienceImmediately();
        return;
      }
      ambienceStarted = true;
      fadeAmbience(AMBIENCE_VOLUME);
    } catch {
      // Browsers may still deny media playback; keep the rest of the UI silent-safe.
    }
  }

  function stopAmbience() {
    if (!ambientTrack || ambientTrack.paused) return;
    fadeAmbience(0, 180, true);
  }

  function pauseAmbienceImmediately() {
    if (!ambientTrack) return;
    fadeGeneration += 1;
    if (fadeFrame) cancelAnimationFrame(fadeFrame);
    ambientTrack.volume = 0;
    ambientTrack.pause();
  }

  function tone(frequency = 420, duration = 0.045, volume = 0.025) {
    if (!enabled || document.hidden) return;
    const AudioContextCtor = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AudioContextCtor) return;

    try {
      context ||= new AudioContextCtor();
      if (context.state === 'suspended') context.resume().catch(() => {});
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, context.currentTime);
      gain.gain.setValueAtTime(volume, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + duration);
    } catch {
      // Audio is an enhancement, so unsupported audio APIs must not block navigation.
    }
  }

  function grantGesture(event) {
    if (userGestureGranted || button.contains(event.target)) return;
    userGestureGranted = true;
    if (enabled) startAmbience();
  }

  button.addEventListener('click', () => {
    userGestureGranted = true;
    if (enabled) tone(280, 0.06, 0.02);
    enabled = !enabled;
    savePreference(enabled);
    update();

    if (enabled) {
      tone(520, 0.08, 0.035);
      startAmbience();
    } else {
      stopAmbience();
    }
  });

  document.addEventListener('pointerdown', grantGesture, { once: true, capture: true });
  document.addEventListener('keydown', grantGesture, { once: true, capture: true });
  document.addEventListener('click', event => {
    if (event.target.closest('a, button') && !button.contains(event.target)) tone(360);
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      pauseAmbienceImmediately();
      if (context?.state === 'running') context.suspend().catch(() => {});
    } else if (enabled && userGestureGranted && ambienceStarted) {
      startAmbience();
    }
  });

  update();
  return { tone };
}
