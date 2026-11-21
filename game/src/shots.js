// The screenshot scenes behind ?shot=title|play|late|end (with &seed=N).
// Each one drives the real game into an exact, honest mid-game state — real
// finds through clickAt, a real clock, the real score — then holds still, so
// the maker's screenshots are renders of the game as it truly plays, and the
// same seed always stages the same frame.

import { PHASE } from './game.js';
import { buildRound, roundSeed } from './scenes.js';

/** Fixed clock for staged frames: every animation is settled by then. */
export const SHOT_NOW = 2000;

function findFirst(game, count, now) {
  const { state } = game;
  for (const difference of state.round.differences.slice(0, count)) {
    game.clickAt(difference.x, difference.y, 1, now);
  }
}

/**
 * Stage the named scene on `game`. Returns nothing; main.js paints the
 * state twice and raises window.__shotReady.
 */
export function stageShot(game, name, seed) {
  const { state } = game;
  game.start(seed, 0);

  if (name === 'play') {
    // Round 2, Market Day: three of seven found, four still hiding, the
    // counter and the rings telling the story at a glance.
    state.round = buildRound(1, roundSeed(seed, 1));
    state.roundIndex = 1;
    state.found = new Set();
    state.timeLeft = state.round.seconds;
    findFirst(game, 3, 900);
    state.timeLeft = 74;
    state.roundElapsedMs = 41000;
    state.score += 500; // the first round's haul, carried in
    state.totalFound += 5;
    state.misses = 1;
    state.hintsLeft = 2;
    return;
  }

  if (name === 'late') {
    // Round 4, Midnight Cove: six of ten found, the clock under half a
    // minute and burning red — the hunt at its tensest.
    state.round = buildRound(3, roundSeed(seed, 3));
    state.roundIndex = 3;
    state.found = new Set();
    state.timeLeft = state.round.seconds;
    findFirst(game, 6, 900);
    state.timeLeft = 14;
    state.roundElapsedMs = 72000;
    state.score += 1950;
    state.totalFound += 21;
    state.misses = 4;
    state.hintsLeft = 1;
    return;
  }

  if (name === 'end') {
    // The victory frame: the last round cleared, every ring on the board.
    state.round = buildRound(3, roundSeed(seed, 3));
    state.roundIndex = 3;
    state.found = new Set(state.round.differences.map((d) => d.id));
    state.totalFound = state.totalDifferences;
    state.score = 3420;
    state.best = 3420;
    state.misses = 4;
    state.hintsLeft = 1;
    state.roundElapsedMs = 63000;
    state.timeLeft = 32;
    state.phase = PHASE.VICTORY;
    state.message = 'Round clear! Time bonus +64.';
    state.messageKind = 'good';
    return;
  }

  // 'title' and anything else: the dawn round idles behind the title card.
  state.roundElapsedMs = 9000;
  state.message = '';
  state.phase = PHASE.TITLE;
}
