// All of Lantern Lane's sounds are synthesised here with WebAudio: no audio
// files, nothing to load, and every note is the game's own. A find rings a
// little rising chime, a miss thuds, a hint shimmers, and clearing a round
// plays a short fanfare. The context is created lazily on the first user
// gesture (browsers refuse sound before one) and M or the speaker button
// mutes the whole game.

/** One soft oscillator note with a quick attack and an exponential fade. */
function note(ctx, out, { freq, at = 0, dur = 0.18, type = 'sine', gain = 0.16 }) {
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  const start = ctx.currentTime + at;
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  amp.gain.setValueAtTime(0.0001, start);
  amp.gain.exponentialRampToValueAtTime(gain, start + 0.012);
  amp.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(amp).connect(out);
  osc.start(start);
  osc.stop(start + dur + 0.05);
}

export function createAudio() {
  let ctx = null;
  let out = null;
  let muted = false;

  /** Create (or resume) the context; call from any click or key handler. */
  function unlock() {
    if (ctx === null) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      out = ctx.createGain();
      out.gain.value = 0.5;
      out.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
  }

  function play(notes) {
    if (muted || ctx === null) return;
    for (const n of notes) note(ctx, out, n);
  }

  return {
    unlock,
    get muted() {
      return muted;
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    /** A find: two bright notes and a sparkle on top. */
    find() {
      play([
        { freq: 659.25, dur: 0.14, type: 'triangle', gain: 0.2 },
        { freq: 987.77, at: 0.07, dur: 0.2, type: 'triangle', gain: 0.2 },
        { freq: 1318.5, at: 0.13, dur: 0.26, type: 'sine', gain: 0.12 },
      ]);
    },
    /** A miss: one low, dull thud. */
    miss() {
      play([{ freq: 138, dur: 0.16, type: 'sine', gain: 0.28 }]);
    },
    /** A hint: a slow shimmering arpeggio, quieter than a find. */
    hint() {
      play([
        { freq: 523.25, dur: 0.3, type: 'sine', gain: 0.1 },
        { freq: 783.99, at: 0.09, dur: 0.3, type: 'sine', gain: 0.1 },
        { freq: 1046.5, at: 0.18, dur: 0.36, type: 'sine', gain: 0.1 },
      ]);
    },
    /** The clock's last seconds: a soft wooden tick. */
    tick() {
      play([{ freq: 1560, dur: 0.05, type: 'square', gain: 0.05 }]);
    },
    /** Round cleared: a four-note fanfare. */
    fanfare() {
      play([
        { freq: 523.25, dur: 0.16, type: 'triangle', gain: 0.2 },
        { freq: 659.25, at: 0.1, dur: 0.16, type: 'triangle', gain: 0.2 },
        { freq: 783.99, at: 0.2, dur: 0.16, type: 'triangle', gain: 0.2 },
        { freq: 1046.5, at: 0.3, dur: 0.34, type: 'triangle', gain: 0.22 },
      ]);
    },
    /** The clock ran out: a falling pair of notes. */
    timeUp() {
      play([
        { freq: 392, dur: 0.22, type: 'triangle', gain: 0.2 },
        { freq: 261.63, at: 0.16, dur: 0.4, type: 'triangle', gain: 0.2 },
      ]);
    },
    /** Buttons and panel clicks: a tiny blip so the page feels alive. */
    blip() {
      play([{ freq: 880, dur: 0.06, type: 'sine', gain: 0.07 }]);
    },
  };
}
