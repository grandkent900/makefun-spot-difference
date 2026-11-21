// The game itself, with no drawing and no DOM: rounds, the clock, the score,
// finds and misses, hints and the messages that narrate them. The renderer
// reads this state; main.js feeds it clicks, keys and time. Keeping the
// rules here (and only here) is what lets the screenshot scenes stage exact
// mid-game states by driving the same functions a player drives.

import { HINTS_PER_GAME, HINT_PULSE_MS, ROUNDS, SCORE } from './config.js';
import { buildRound, roundSeed } from './scenes.js';

export const PHASE = {
  TITLE: 'title',
  PLAY: 'play',
  PAUSED: 'paused',
  ROUND_CLEAR: 'round-clear',
  TIME_UP: 'time-up',
  VICTORY: 'victory',
};

/** Milliseconds a round-clear or final banner needs before input moves on. */
export const BANNER_MS = 1400;

export function createGame(gameSeed) {
  const state = {
    phase: PHASE.TITLE,
    seed: gameSeed,
    roundIndex: 0,
    round: null,
    found: new Set(),
    score: 0,
    hintsLeft: HINTS_PER_GAME,
    misses: 0,
    totalFound: 0,
    totalDifferences: ROUNDS.reduce((sum, r) => sum + r.differences, 0),
    timeLeft: 0,
    roundElapsedMs: 0,
    message: '',
    messageKind: 'info', // 'info' | 'good' | 'bad'
    messageAt: 0,
    lastFindAt: -10000,
    lastMiss: null, // { x, y, side, at } in scene coordinates
    hintSpot: null, // { x, y, until } in scene coordinates
    phaseAt: 0,
    best: 0,
  };

  function say(message, kind, now) {
    state.message = message;
    state.messageKind = kind;
    state.messageAt = now;
  }

  function loadRound(index, now) {
    state.roundIndex = index;
    state.round = buildRound(index, roundSeed(state.seed, index));
    state.found = new Set();
    state.timeLeft = state.round.seconds;
    state.roundElapsedMs = 0;
    state.hintSpot = null;
    state.lastMiss = null;
    state.phase = PHASE.PLAY;
    state.phaseAt = now;
    say(`Round ${index + 1}: ${state.round.name}. ${state.round.differences.length} differences hide here — find them all!`, 'info', now);
  }

  return {
    state,

    /** From the title (or a finished game) into round 1 with a fresh seed. */
    start(seed, now) {
      state.seed = seed;
      state.score = 0;
      state.hintsLeft = HINTS_PER_GAME;
      state.misses = 0;
      state.totalFound = 0;
      loadRound(0, now);
    },

    /** Advance the clock; returns true when the round's time ran out. */
    tick(dtSeconds, now) {
      if (state.phase !== PHASE.PLAY) return false;
      state.roundElapsedMs += dtSeconds * 1000;
      state.timeLeft = Math.max(0, state.timeLeft - dtSeconds);
      if (state.timeLeft <= 0) {
        state.phase = PHASE.TIME_UP;
        state.phaseAt = now;
        return true;
      }
      return false;
    },

    /**
     * A click (or an Enter press) at scene coordinates on either panel.
     * Returns 'found' | 'already' | 'miss' | null (not playing).
     */
    clickAt(x, y, side, now) {
      if (state.phase !== PHASE.PLAY) return null;
      for (const difference of state.round.differences) {
        const dx = x - difference.x;
        const dy = y - difference.y;
        if (Math.hypot(dx, dy) <= Math.max(difference.r, 15)) {
          if (state.found.has(difference.id)) {
            say('Already found — that ring is yours.', 'info', now);
            return 'already';
          }
          state.found.add(difference.id);
          state.totalFound += 1;
          state.lastFindAt = now;
          const points = SCORE.findBase + state.found.size * 5;
          state.score += points;
          const left = state.round.differences.length - state.found.size;
          if (left === 0) {
            const bonus = Math.round(state.timeLeft) * SCORE.clearBonusPerSecond;
            state.score += bonus;
            state.phase = state.roundIndex + 1 >= ROUNDS.length ? PHASE.VICTORY : PHASE.ROUND_CLEAR;
            state.phaseAt = now;
            say(`Round clear! Time bonus +${bonus}.`, 'good', now);
          } else {
            say(`Found it! +${points} — ${left} to go.`, 'good', now);
          }
          return 'found';
        }
      }
      state.misses += 1;
      state.lastMiss = { x, y, side, at: now };
      state.timeLeft = Math.max(0, state.timeLeft - SCORE.missSeconds);
      say(`Not there — the clock loses ${SCORE.missSeconds} seconds.`, 'bad', now);
      if (state.timeLeft <= 0) {
        state.phase = PHASE.TIME_UP;
        state.phaseAt = now;
      }
      return 'miss';
    },

    /** Spend a hint: pulse one unfound difference (the first by id order shuffled by seed). */
    useHint(now) {
      if (state.phase !== PHASE.PLAY) return false;
      if (state.hintsLeft <= 0) {
        say('No hints left — trust your eyes.', 'bad', now);
        return false;
      }
      const remaining = state.round.differences.filter((d) => !state.found.has(d.id));
      if (remaining.length === 0) return false;
      const target = remaining[(state.totalFound + state.misses) % remaining.length];
      state.hintsLeft -= 1;
      state.score = Math.max(0, state.score - SCORE.hintCost);
      state.hintSpot = { x: target.x, y: target.y, until: now + HINT_PULSE_MS };
      say(`A hint shimmers somewhere in the scene… (-${SCORE.hintCost})`, 'info', now);
      return true;
    },

    /** Move on from a round-clear banner: the next round, if there is one. */
    nextRound(now) {
      if (state.phase !== PHASE.ROUND_CLEAR) return;
      loadRound(state.roundIndex + 1, now);
    },

    pause(now) {
      if (state.phase !== PHASE.PLAY) return;
      state.phase = PHASE.PAUSED;
      state.phaseAt = now;
    },

    resume(now) {
      if (state.phase !== PHASE.PAUSED) return;
      state.phase = PHASE.PLAY;
      state.phaseAt = now;
    },

    /** The standing grade for a finished game, by share of differences found. */
    grade() {
      const share = state.totalFound / state.totalDifferences;
      if (state.phase === PHASE.VICTORY) return 'Harbour Master — every difference found!';
      if (share >= 0.8) return 'Eagle Eye — the harbour barely fooled you.';
      if (share >= 0.55) return 'Keen Spotter — a fine haul of finds.';
      if (share >= 0.3) return 'Promising Watcher — the town kept some secrets.';
      return 'Sleepy Gull — the differences are still out there.';
    },
  };
}
