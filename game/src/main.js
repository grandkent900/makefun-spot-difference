// Boot and the one loop: input is read as it comes, the clock advances in
// real time while a round is live, and the renderer paints what is there.
// The game moves between title, play, paused, round-clear and the two end
// screens; this file owns the wiring between the player's hands, the rules
// in game.js, the sounds in audio.js and the frame in render.js.
//
// ?seed=N fixes the whole game's shuffling. ?shot=title|play|late|end (with
// &seed=N) stages that screenshot scene instead of running the loop, paints
// it twice and sets window.__shotReady for the maker's screenshot tool.

import { BEST_KEY, PANEL } from './config.js';
import { createAudio } from './audio.js';
import { BANNER_MS, createGame, PHASE } from './game.js';
import { createInput, KEY } from './input.js';
import { createRenderer } from './render.js';
import { SHOT_NOW, stageShot } from './shots.js';

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const game = createGame(seed);
const audio = createAudio();
const renderer = createRenderer(canvas);
const cursor = { side: 1, x: PANEL.width / 2, y: PANEL.height / 2, active: false };

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best then lasts this visit.
  }
}

game.state.best = readBest();

function announce(message) {
  status.textContent = message;
}

function notePhaseChange(before, now) {
  const phase = game.state.phase;
  if (phase === before) return;
  if (phase === PHASE.ROUND_CLEAR || phase === PHASE.VICTORY) {
    audio.fanfare();
    if (game.state.score > game.state.best) {
      game.state.best = game.state.score;
      saveBest(game.state.best);
    }
    announce(phase === PHASE.VICTORY ? `Victory! Final score ${game.state.score}.` : 'Round clear!');
  } else if (phase === PHASE.TIME_UP) {
    audio.timeUp();
    announce(`Out of time. You found ${game.state.totalFound} of ${game.state.totalDifferences}. Score ${game.state.score}.`);
  }
}

function startHunt(now) {
  audio.unlock();
  game.start(Math.floor(Math.random() * 4294967296), now);
  announce(`Round 1. ${game.state.round.differences.length} differences to find.`);
}

function handlePanel(side, x, y, now) {
  const { state } = game;
  audio.unlock();
  if (state.phase === PHASE.TITLE || state.phase === PHASE.TIME_UP || state.phase === PHASE.VICTORY) return;
  if (state.phase === PHASE.PAUSED) {
    game.resume(now);
    return;
  }
  if (state.phase === PHASE.ROUND_CLEAR) {
    if (now - state.phaseAt >= BANNER_MS) game.nextRound(now);
    return;
  }
  if (side < 0) return;
  const before = state.phase;
  const result = game.clickAt(x, y, side, now);
  if (result === 'found') audio.find();
  else if (result === 'miss') audio.miss();
  notePhaseChange(before, now);
}

function handleButton(name, now) {
  const { state } = game;
  audio.unlock();
  if (name === 'start' || name === 'again') {
    if (state.phase === PHASE.TITLE || state.phase === PHASE.TIME_UP || state.phase === PHASE.VICTORY) startHunt(now);
    return;
  }
  if (name === 'hint') {
    if (game.useHint(now)) audio.hint();
    return;
  }
  if (name === 'pause') {
    if (state.phase === PHASE.PLAY) game.pause(now);
    else if (state.phase === PHASE.PAUSED) game.resume(now);
    return;
  }
  if (name === 'sound') {
    audio.toggleMute();
  }
}

function handleKey(action, now) {
  const { state } = game;
  audio.unlock();
  if (action === KEY.CONFIRM) {
    if (state.phase === PHASE.TITLE || state.phase === PHASE.TIME_UP || state.phase === PHASE.VICTORY) {
      startHunt(now);
    } else if (state.phase === PHASE.ROUND_CLEAR) {
      if (now - state.phaseAt >= BANNER_MS) game.nextRound(now);
    } else if (state.phase === PHASE.PAUSED) {
      game.resume(now);
    } else if (state.phase === PHASE.PLAY && cursor.active) {
      handlePanel(cursor.side, cursor.x, cursor.y, now);
    }
    return;
  }
  if (action === KEY.HINT) {
    if (game.useHint(now)) audio.hint();
    return;
  }
  if (action === KEY.PAUSE) {
    if (state.phase === PHASE.PLAY) game.pause(now);
    else if (state.phase === PHASE.PAUSED) game.resume(now);
    return;
  }
  if (action === KEY.MUTE) audio.toggleMute();
}

function runGame() {
  createInput(canvas, {
    onMouse() {
      cursor.active = false;
    },
    onPanel(side, x, y) {
      handlePanel(side, x, y, performance.now());
    },
    onButton(name) {
      handleButton(name, performance.now());
    },
    onKey(action) {
      handleKey(action, performance.now());
    },
    onCursorMove(dx, dy) {
      cursor.active = true;
      cursor.x = Math.min(PANEL.width - 4, Math.max(4, cursor.x + dx));
      cursor.y = Math.min(PANEL.height - 4, Math.max(4, cursor.y + dy));
      // Crossing the middle of the stage hops the cursor to the other panel.
      if (dx > 0 && cursor.x >= PANEL.width - 4 && cursor.side === 0) {
        cursor.side = 1;
        cursor.x = 6;
      } else if (dx < 0 && cursor.x <= 4 && cursor.side === 1) {
        cursor.side = 0;
        cursor.x = PANEL.width - 6;
      }
    },
  });

  let last = performance.now();
  let lastWholeSecond = -1;
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, 0.25);
    last = now;
    if (game.state.phase === PHASE.PLAY) {
      const before = game.state.phase;
      game.tick(dt, now);
      const whole = Math.ceil(game.state.timeLeft);
      if (whole !== lastWholeSecond) {
        lastWholeSecond = whole;
        if (whole <= 5 && whole > 0) audio.tick();
      }
      notePhaseChange(before, now);
    }
    renderer.draw(game.state, { now, cursor, grade: game.grade() });
  }
  announce('Lantern Lane. Press Enter or click Start the Hunt.');
  requestAnimationFrame(frame);
}

function runShot(name) {
  stageShot(game, name, seed);
  let painted = 0;
  function paint() {
    renderer.draw(game.state, { now: SHOT_NOW, cursor: { active: false, side: 0, x: 0, y: 0 }, grade: game.grade() });
    painted += 1;
    if (painted < 3) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

if (shot) runShot(shot);
else runGame();
