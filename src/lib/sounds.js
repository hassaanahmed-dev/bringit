const MUTE_KEY = 'bringit.muted';

export function isMuted() {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

export function setMuted(muted) {
  try {
    localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
  } catch {
    /* ignore */
  }
}

let audioCtx = null;
function ctx() {
  if (!audioCtx) {
    try {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (Ctor) audioCtx = new Ctor();
    } catch {
      audioCtx = null;
    }
  }
  return audioCtx;
}

function beep(freq, start, dur, gainV) {
  const c = ctx();
  if (!c) return;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = 'square';
  osc.frequency.value = freq;
  const t0 = c.currentTime + start;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gainV, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g);
  g.connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function vibrate(pattern) {
  try {
    if ('vibrate' in navigator) navigator.vibrate(pattern);
  } catch {
    /* ignore */
  }
}

function resume() {
  try {
    ctx()?.resume?.();
  } catch {
    /* ignore */
  }
}

// New order appeared in the feed.
export function playPing() {
  if (isMuted()) return;
  resume();
  beep(1320, 0, 0.09, 0.05);
  beep(1760, 0.09, 0.12, 0.05);
  vibrate(120);
}

// Incoming chat message.
export function playMessage() {
  if (isMuted()) return;
  resume();
  beep(880, 0, 0.08, 0.05);
  beep(1175, 0.08, 0.1, 0.05);
  vibrate(60);
}

// Status milestone (paid, delivered).
export function playMilestone() {
  if (isMuted()) return;
  resume();
  beep(660, 0, 0.1, 0.05);
  beep(990, 0.1, 0.1, 0.05);
  vibrate([60, 40, 60]);
}
