// The discovery lesson is session-scoped; its timers belong to the mounted Room.
export const ROOM_DISCOVERY_TIMING = Object.freeze({ introDelay: 1550, stagger: 85, introHold: 1200, manualHold: 2300 });

export function createRoomDiscovery({ show, hide, onSeen, seen = false, reduced = () => false, setTimer = setTimeout, clearTimer = clearTimeout }) {
  let available = false, disposed = false, introTimer = null, revealTimer = null, mode = null;
  const cancelIntro = () => { if (introTimer !== null) clearTimer(introTimer); introTimer = null; };
  const dismiss = () => {
    if (revealTimer !== null) clearTimer(revealTimer);
    revealTimer = null;
    if (mode !== null) hide();
    mode = null;
  };
  const remember = () => { if (!seen) { seen = true; onSeen(); } };
  const reveal = nextMode => {
    if (disposed || !available) return;
    cancelIntro(); dismiss(); remember();
    mode = nextMode;
    show(mode);
    const duration = mode === 'manual' ? ROOM_DISCOVERY_TIMING.manualHold : ROOM_DISCOVERY_TIMING.introHold + (reduced() ? 0 : ROOM_DISCOVERY_TIMING.stagger * 4);
    revealTimer = setTimer(dismiss, duration);
  };
  return {
    setAvailable(value) {
      if (disposed) return;
      available = value;
      if (!available) { cancelIntro(); dismiss(); return; }
      if (!seen && introTimer === null) introTimer = setTimer(() => { introTimer = null; reveal('intro'); }, ROOM_DISCOVERY_TIMING.introDelay);
    },
    acknowledge() { if (!disposed) { remember(); cancelIntro(); dismiss(); } },
    manual() { reveal('manual'); },
    destroy() { disposed = true; cancelIntro(); dismiss(); },
    get state() { return { seen, available, mode, disposed }; }
  };
}
