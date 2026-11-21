// Everything the player sees, painted on one 1280x720 canvas: the harbour
// panels (drawn by harbor.js), the rings on found differences, the header
// with its to-go counter and progress dots, the clock bar, the message line,
// and the title / pause / clear / final overlays. The renderer only reads
// game state — every rule lives in game.js — and the button rectangles it
// draws are exported so input.js can hit-test the very same boxes.

import { CHROME, FONT, FONT_DISPLAY, LOW_TIME, PANEL, ROUNDS, VIEW, panelX } from './config.js';
import { PHASE } from './game.js';
import { drawScene } from './harbor.js';

/** Clickable header buttons, in canvas coordinates. */
export const BUTTONS = {
  hint: { x: 986, y: 52, w: 118, h: 38, label: 'Hint' },
  pause: { x: 1114, y: 52, w: 52, h: 38, label: 'II' },
  sound: { x: 1176, y: 52, w: 52, h: 38, label: '♪' },
  start: { x: 490, y: 470, w: 300, h: 62 },
  again: { x: 490, y: 486, w: 300, h: 58 },
};

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, value, x, y, { size = 20, colour = CHROME.text, align = 'left', bold = false, font = FONT, alpha = 1 } = {}) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = colour;
  ctx.font = `${bold ? '700 ' : ''}${size}px ${font}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(value, x, y);
  ctx.restore();
}

/** A little lantern glyph, the game's mark, drawn at (x, y) with height h. */
function drawLanternMark(ctx, x, y, h) {
  const w = h * 0.62;
  ctx.save();
  ctx.fillStyle = 'rgba(255,180,58,0.25)';
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h / 2, w * 0.95, h * 0.62, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = CHROME.accent;
  roundRect(ctx, x + w * 0.18, y + h * 0.2, w * 0.64, h * 0.6, 4);
  ctx.fill();
  ctx.fillStyle = '#fff3cf';
  roundRect(ctx, x + w * 0.34, y + h * 0.32, w * 0.32, h * 0.36, 3);
  ctx.fill();
  ctx.fillStyle = CHROME.ink;
  ctx.fillRect(x + w * 0.3, y + h * 0.08, w * 0.4, h * 0.1);
  ctx.fillRect(x + w * 0.3, y + h * 0.82, w * 0.4, h * 0.1);
  ctx.restore();
}

function drawHeader(ctx, state, now) {
  drawLanternMark(ctx, 40, 18, 44);
  text(ctx, 'LANTERN LANE', 100, 40, { size: 31, bold: true, font: FONT_DISPLAY, colour: CHROME.text });
  const roundLabel = state.round
    ? `ROUND ${state.roundIndex + 1} OF ${ROUNDS.length} · ${state.round.name.toUpperCase()}`
    : 'A SPOT-THE-DIFFERENCE HARBOUR';
  text(ctx, roundLabel, 42, 78, { size: 15, bold: true, colour: CHROME.muted });

  if (state.round) {
    // The to-go counter: one dot per difference, filled as they fall, and
    // the number itself big beside them — the judge of a screenshot and the
    // player mid-hunt read the same thing.
    const diffs = state.round.differences;
    const left = diffs.length - state.found.size;
    const dotsW = diffs.length * 24 - 8;
    let dx = 640 - (dotsW + 150) / 2;
    for (const d of diffs) {
      const foundIt = state.found.has(d.id);
      ctx.beginPath();
      ctx.ellipse(dx + 8, 36, 8, 8, 0, 0, Math.PI * 2);
      if (foundIt) {
        ctx.fillStyle = CHROME.good;
        ctx.fill();
        ctx.strokeStyle = '#10331f';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(dx + 4.5, 36);
        ctx.lineTo(dx + 7.2, 39);
        ctx.lineTo(dx + 11.8, 32.5);
        ctx.stroke();
      } else {
        ctx.strokeStyle = CHROME.muted;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      dx += 24;
    }
    text(ctx, left === 0 ? 'ALL FOUND!' : `${left} TO GO`, dx + 14, 37, {
      size: 27, bold: true, font: FONT_DISPLAY, colour: left === 0 ? CHROME.good : CHROME.accent,
    });
    text(ctx, `FOUND ${state.found.size} OF ${diffs.length}`, 640, 76, { size: 14, bold: true, colour: CHROME.muted, align: 'center' });
  }

  text(ctx, `SCORE ${state.score}`, 1240, 30, { size: 23, bold: true, align: 'right', font: FONT_DISPLAY });
  drawButton(ctx, BUTTONS.hint, `Hint · ${state.hintsLeft}`, state.hintsLeft > 0);
  drawButton(ctx, BUTTONS.pause, '❚❚', true);
  drawButton(ctx, BUTTONS.sound, '♪', true);
}

function drawButton(ctx, box, label, enabled) {
  ctx.save();
  ctx.globalAlpha = enabled ? 1 : 0.45;
  ctx.fillStyle = '#2b3040';
  roundRect(ctx, box.x, box.y, box.w, box.h, 9);
  ctx.fill();
  ctx.strokeStyle = '#454c61';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  text(ctx, label, box.x + box.w / 2, box.y + box.h / 2 + 1, { size: 16, bold: true, align: 'center' });
  ctx.restore();
}

function drawClock(ctx, state, now) {
  const total = state.round ? state.round.seconds : 1;
  const share = Math.max(0, state.timeLeft / total);
  const low = state.timeLeft <= LOW_TIME && state.phase === PHASE.PLAY;
  const pulse = low ? 0.72 + 0.28 * Math.sin(now / 120) : 1;
  ctx.fillStyle = '#262b38';
  roundRect(ctx, 40, 100, 1090, 10, 5);
  ctx.fill();
  ctx.save();
  ctx.globalAlpha = pulse;
  ctx.fillStyle = low ? CHROME.bad : CHROME.accent;
  if (share > 0) {
    roundRect(ctx, 40, 100, 1090 * share, 10, 5);
    ctx.fill();
  }
  ctx.restore();
  const seconds = Math.ceil(state.timeLeft);
  text(ctx, state.phase === PHASE.TITLE ? '' : `${seconds}s left`, 1240, 106, {
    size: 16, bold: true, align: 'right', colour: low ? CHROME.bad : CHROME.muted,
  });
}

function drawMarker(ctx, x, y, r, now, bornAt) {
  const age = now - bornAt;
  const grow = age < 280 ? 0.6 + 0.4 * (age / 280) : 1;
  ctx.save();
  ctx.strokeStyle = CHROME.good;
  ctx.lineWidth = 4;
  ctx.shadowColor = 'rgba(57,217,138,0.55)';
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.ellipse(x, y, r * grow, r * grow, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = CHROME.good;
  ctx.beginPath();
  ctx.ellipse(x + r * 0.72, y - r * 0.72, 9.5, 9.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#0d2b1a';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(x + r * 0.72 - 4.4, y - r * 0.72 + 0.2);
  ctx.lineTo(x + r * 0.72 - 1.2, y - r * 0.72 + 3.6);
  ctx.lineTo(x + r * 0.72 + 4.8, y - r * 0.72 - 3.8);
  ctx.stroke();
  ctx.restore();
}

function drawPanel(ctx, state, side, now, cursor) {
  const px = panelX(side);
  const py = PANEL.top;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 5;
  ctx.fillStyle = CHROME.paper;
  roundRect(ctx, px - 7, py - 7, PANEL.width + 14, PANEL.height + 14, 12);
  ctx.fill();
  ctx.restore();

  ctx.save();
  roundRect(ctx, px, py, PANEL.width, PANEL.height, 7);
  ctx.clip();
  ctx.translate(px, py);
  if (state.round) {
    drawScene(ctx, side === 0 ? state.round.original : state.round.changed, state.roundElapsedMs);
  }
  // Found rings live on both panels at the same scene point.
  if (state.round) {
    for (const d of state.round.differences) {
      if (state.found.has(d.id)) drawMarker(ctx, d.x, d.y, Math.max(d.r, 17), now, state.lastFindAt);
    }
  }
  // The hint shimmer: slow expanding rings round one unfound difference.
  if (state.hintSpot && now < state.hintSpot.until && state.phase === PHASE.PLAY) {
    const spot = state.hintSpot;
    const cycle = ((now - state.messageAt) % 700) / 700;
    for (let ring = 0; ring < 2; ring += 1) {
      const rr = 14 + ((cycle + ring * 0.5) % 1) * 30;
      ctx.strokeStyle = CHROME.hint;
      ctx.globalAlpha = 0.85 * (1 - ((cycle + ring * 0.5) % 1));
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(spot.x, spot.y, rr, rr, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  // A miss: a red cross that fades over two thirds of a second.
  if (state.lastMiss && state.lastMiss.side === side && now - state.lastMiss.at < 650) {
    const { x, y } = state.lastMiss;
    const alpha = 1 - (now - state.lastMiss.at) / 650;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = CHROME.bad;
    ctx.lineWidth = 4.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x - 10, y - 10);
    ctx.lineTo(x + 10, y + 10);
    ctx.moveTo(x + 10, y - 10);
    ctx.lineTo(x - 10, y + 10);
    ctx.stroke();
    ctx.restore();
  }
  // The keyboard cursor, when the player is driving without a mouse.
  if (cursor && cursor.active && cursor.side === side) {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(cursor.x, cursor.y, 13, 13, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cursor.x - 19, cursor.y);
    ctx.lineTo(cursor.x - 7, cursor.y);
    ctx.moveTo(cursor.x + 7, cursor.y);
    ctx.lineTo(cursor.x + 19, cursor.y);
    ctx.moveTo(cursor.x, cursor.y - 19);
    ctx.lineTo(cursor.x, cursor.y - 7);
    ctx.moveTo(cursor.x, cursor.y + 7);
    ctx.lineTo(cursor.x, cursor.y + 19);
    ctx.stroke();
  }
  ctx.restore();

  // The frame's label tag.
  const label = side === 0 ? 'ORIGINAL' : 'SPOT THE CHANGES';
  ctx.fillStyle = side === 0 ? '#33526b' : CHROME.accentDeep;
  roundRect(ctx, px + 12, py - 16, side === 0 ? 108 : 168, 25, 7);
  ctx.fill();
  text(ctx, label, px + 12 + (side === 0 ? 54 : 84), py - 3, { size: 13.5, bold: true, align: 'center', colour: '#ffffff' });
}

function drawMessage(ctx, state) {
  ctx.fillStyle = '#222634';
  roundRect(ctx, 40, 596, 1200, 44, 10);
  ctx.fill();
  const colour = state.messageKind === 'good' ? CHROME.good : state.messageKind === 'bad' ? CHROME.bad : CHROME.text;
  text(ctx, state.message, 640, 619, { size: 19, bold: state.messageKind !== 'info', align: 'center', colour });
  text(ctx, `MISSES ${state.misses}`, 1240, 662, { size: 14, bold: true, align: 'right', colour: CHROME.muted });
  text(ctx, 'Click a difference in either picture — a find rings both.  H hint · P pause · M sound · Arrows + Enter play by keyboard', 640, 662, {
    size: 14.5, align: 'center', colour: CHROME.muted,
  });
}

function dimCanvas(ctx) {
  ctx.fillStyle = 'rgba(10,12,20,0.62)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
}

function banner(ctx, y, h) {
  ctx.fillStyle = 'rgba(24,27,40,0.94)';
  roundRect(ctx, 340, y, 600, h, 16);
  ctx.fill();
  ctx.strokeStyle = '#454c61';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function bigButton(ctx, box, label) {
  ctx.fillStyle = CHROME.accent;
  roundRect(ctx, box.x, box.y, box.w, box.h, 12);
  ctx.fill();
  ctx.fillStyle = '#2a1c05';
  text(ctx, label, box.x + box.w / 2, box.y + box.h / 2 + 1, { size: 24, bold: true, align: 'center', colour: '#2a1c05', font: FONT_DISPLAY });
}

function drawTitle(ctx, state) {
  dimCanvas(ctx);
  drawLanternMark(ctx, 592, 128, 92);
  text(ctx, 'LANTERN LANE', 640, 268, { size: 58, bold: true, align: 'center', font: FONT_DISPLAY });
  text(ctx, 'a spot-the-difference harbour', 640, 308, { size: 21, align: 'center', colour: CHROME.accent });
  text(ctx, 'Two pictures of the same little port — but the right one has quietly changed.', 640, 356, { size: 18.5, align: 'center' });
  text(ctx, 'Find every difference before the clock runs out. Four rounds, dawn to midnight,', 640, 384, { size: 18.5, align: 'center' });
  text(ctx, 'and the changes get sneakier as the light fades. A miss costs 3 seconds;', 640, 412, { size: 18.5, align: 'center' });
  text(ctx, 'you carry 3 hints for the whole hunt.', 640, 440, { size: 18.5, align: 'center' });
  bigButton(ctx, BUTTONS.start, 'START THE HUNT');
  if (state.best > 0) text(ctx, `Best score so far: ${state.best}`, 640, 566, { size: 16, align: 'center', colour: CHROME.muted });
  text(ctx, 'or press Enter', 640, 596, { size: 14.5, align: 'center', colour: CHROME.muted });
}

function drawRoundClear(ctx, state) {
  dimCanvas(ctx);
  banner(ctx, 218, 240);
  text(ctx, '⚑  ROUND CLEAR!', 640, 272, { size: 38, bold: true, align: 'center', font: FONT_DISPLAY, colour: CHROME.good });
  text(ctx, `${state.round.name} — all ${state.round.differences.length} differences found.`, 640, 322, { size: 19, align: 'center' });
  text(ctx, `Score ${state.score} · Misses ${state.misses} · Hints left ${state.hintsLeft}`, 640, 356, { size: 18, align: 'center', colour: CHROME.muted });
  const next = ROUNDS[state.roundIndex + 1];
  text(ctx, next ? `Next: ${next.name} — ${next.differences} differences, ${next.seconds} seconds.` : '', 640, 392, { size: 18, align: 'center', colour: CHROME.accent });
  text(ctx, 'Click or press Enter to sail on', 640, 428, { size: 15.5, align: 'center', colour: CHROME.muted });
}

function drawEnd(ctx, state, victory, grade) {
  dimCanvas(ctx);
  banner(ctx, 190, 330);
  text(ctx, victory ? '★ EVERY DIFFERENCE FOUND ★' : '⏰  OUT OF TIME', 640, 246, {
    size: 35, bold: true, align: 'center', font: FONT_DISPLAY, colour: victory ? CHROME.accent : CHROME.bad,
  });
  text(ctx, grade, 640, 296, { size: 20, align: 'center' });
  text(ctx, `You found ${state.totalFound} of ${state.totalDifferences} differences across the harbour.`, 640, 334, { size: 18, align: 'center', colour: CHROME.muted });
  text(ctx, `FINAL SCORE  ${state.score}`, 640, 380, { size: 30, bold: true, align: 'center', font: FONT_DISPLAY, colour: CHROME.accent });
  text(ctx, `Misses ${state.misses} · Hints left ${state.hintsLeft} · Best ${Math.max(state.best, state.score)}`, 640, 418, { size: 16.5, align: 'center', colour: CHROME.muted });
  bigButton(ctx, BUTTONS.again, 'PLAY AGAIN');
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  return {
    draw(state, view) {
      const now = view.now;
      ctx.fillStyle = CHROME.backdrop;
      ctx.fillRect(0, 0, VIEW.width, VIEW.height);
      ctx.fillStyle = CHROME.felt;
      roundRect(ctx, 16, 8, VIEW.width - 32, VIEW.height - 16, 18);
      ctx.fill();

      drawHeader(ctx, state, now);
      drawClock(ctx, state, now);
      drawPanel(ctx, state, 0, now, view.cursor);
      drawPanel(ctx, state, 1, now, view.cursor);
      drawMessage(ctx, state);

      if (state.phase === PHASE.TITLE) drawTitle(ctx, state);
      else if (state.phase === PHASE.PAUSED) {
        dimCanvas(ctx);
        text(ctx, 'PAUSED', 640, 330, { size: 44, bold: true, align: 'center', font: FONT_DISPLAY });
        text(ctx, 'Press P or click the harbour to keep hunting', 640, 378, { size: 18, align: 'center', colour: CHROME.muted });
      } else if (state.phase === PHASE.ROUND_CLEAR) drawRoundClear(ctx, state);
      else if (state.phase === PHASE.TIME_UP) drawEnd(ctx, state, false, view.grade);
      else if (state.phase === PHASE.VICTORY) drawEnd(ctx, state, true, view.grade);
    },
  };
}
