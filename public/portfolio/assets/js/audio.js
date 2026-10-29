const STORAGE_KEY = 'bz-portfolio-sound';
const AMBIENCE_SRC = '/assets/audio/roomtone-bedroom-yew.mp3';
const AMBIENCE_VOLUME = 0.11;

function readPreference(defaultEnabled, storageKey) {
  try {
    const stored = localStorage.getItem(storageKey);
    return stored === 'on' || (stored !== 'off' && defaultEnabled);
  } catch {
    return defaultEnabled;
  }
}

function savePreference(enabled, storageKey) {
  try {
    localStorage.setItem(storageKey, enabled ? 'on' : 'off');
  } catch {
    // Sound still works for this visit when storage is unavailable.
  }
}

export function initAudio(button, { ambience = false, ambienceSrc = AMBIENCE_SRC, defaultEnabled = false, storageKey = STORAGE_KEY } = {}) {
  let context;
  let enabled = readPreference(defaultEnabled, storageKey);
  let userGestureGranted = false;
  let ambienceStarted = false;
  let ambienceUnavailable = false;
  let fadeFrame;
  let fadeGeneration = 0;
  let ambienceActive = ambience;

  const ambientTrack = ambience && typeof Audio !== 'undefined' ? new Audio(ambienceSrc) : null;
  if (ambientTrack) {
    ambientTrack.loop = true;
    ambientTrack.preload = 'none';
    ambientTrack.volume = 0;
    ambientTrack.hidden = true;
    ambientTrack.dataset.portfolioAmbience = '';
    document.body.append(ambientTrack);
    ambientTrack.addEventListener('error', () => {
      ambienceUnavailable = true;
      fadeGeneration += 1;
      if (fadeFrame) cancelAnimationFrame(fadeFrame);
    });
  }

  function update() {
    button.setAttribute('aria-pressed', String(enabled));
    button.innerHTML = button.matches('[data-sound-toggle]')
      ? `<b>Sound ${enabled ? 'on' : 'off'}</b><span>Room ambience and interface sounds</span>`
      : `<span aria-hidden="true">${enabled ? '◉' : '○'}</span> Sound ${enabled ? 'On' : 'Off'}`;
    button.title = ambience
      ? 'Low-volume room ambience and interface sounds. Your browser may wait for the first interaction.'
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
      const progress = Math.max(0, Math.min((now - startedAt) / duration, 1));
      const nextVolume = initialVolume + (targetVolume - initialVolume) * progress;
      ambientTrack.volume = Math.max(0, Math.min(nextVolume, 1));
      if (progress < 1) {
        fadeFrame = requestAnimationFrame(step);
      } else if (pauseAfter) {
        ambientTrack.pause();
      }
    };

    fadeFrame = requestAnimationFrame(step);
  }

  async function startAmbience(attemptAutoplay = false) {
    if (!ambientTrack || ambienceUnavailable || !ambienceActive || !enabled || (!userGestureGranted && !attemptAutoplay) || document.hidden) return;

    try {
      ambientTrack.volume = 0;
      await ambientTrack.play();
      if (!ambienceActive || !enabled || document.hidden) {
        pauseAmbienceImmediately();
        return;
      }
      ambienceStarted = true;
      userGestureGranted = true;
      fadeAmbience(AMBIENCE_VOLUME);
    } catch {
      // Autoplay denial is not a mute preference. Retry on the next real gesture.
      userGestureGranted = false;
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
    savePreference(enabled, storageKey);
    update();

    if (enabled) {
      tone(520, 0.08, 0.035);
      startAmbience();
    } else {
      stopAmbience();
    }
  });

  document.addEventListener('pointerdown', grantGesture, { capture: true });
  document.addEventListener('keydown', grantGesture, { capture: true });
  document.addEventListener('click', event => {
    if (event.target.closest('a, button') && !button.contains(event.target)) tone(360);
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      pauseAmbienceImmediately();
      if (context?.state === 'running') context.suspend().catch(() => {});
    } else if (ambienceActive && enabled && userGestureGranted && ambienceStarted) {
      startAmbience();
    }
  });

  update();
  if (enabled) startAmbience(true);
  return {
    tone,
    setAmbienceActive(active) {
      ambienceActive = Boolean(active);
      if (ambienceActive) startAmbience();
      else stopAmbience();
    }
  };
}
