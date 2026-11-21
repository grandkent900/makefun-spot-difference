// Pointer and keyboard input, translated into the game's own coordinates.
// The canvas is a fixed 1280x720 stage scaled by CSS, so every event is
// mapped through the canvas's on-screen rectangle first; a click then lands
// in a header button, in one of the two panels (as scene coordinates), or
// nowhere that matters. The keyboard drives a crosshair cursor over the
// panels, so the whole game plays without a mouse: arrows move, Enter or
// Space checks the spot, H hints, P pauses, M mutes.

import { PANEL, VIEW, panelX } from './config.js';
import { BUTTONS } from './render.js';

/** A pointer event's point in canvas coordinates. */
export function canvasPoint(canvas, event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * VIEW.width,
    y: ((event.clientY - rect.top) / rect.height) * VIEW.height,
  };
}

/** Which panel a canvas point is in, and where in scene coordinates; else null. */
export function panelPoint(point) {
  for (let side = 0; side <= 1; side += 1) {
    const px = panelX(side);
    if (point.x >= px && point.x < px + PANEL.width && point.y >= PANEL.top && point.y < PANEL.top + PANEL.height) {
      return { side, x: point.x - px, y: point.y - PANEL.top };
    }
  }
  return null;
}

/** The name of the button a canvas point falls in ('hint', 'pause', …), or null. */
export function buttonAt(point) {
  for (const [name, box] of Object.entries(BUTTONS)) {
    if (point.x >= box.x && point.x < box.x + box.w && point.y >= box.y && point.y < box.y + box.h) return name;
  }
  return null;
}

export const KEY = { CONFIRM: 'confirm', HINT: 'hint', PAUSE: 'pause', MUTE: 'mute' };

/**
 * Wire the listeners. `handlers` is { onPanel(side, x, y), onButton(name),
 * onKey(action), onCursorMove(dx, dy), onMouse() } — main.js owns what each
 * means in the current phase; this module owns only the mapping.
 */
export function createInput(canvas, handlers) {
  canvas.addEventListener('pointerdown', (event) => {
    handlers.onMouse();
    const point = canvasPoint(canvas, event);
    const button = buttonAt(point);
    if (button) {
      handlers.onButton(button);
      return;
    }
    const panel = panelPoint(point);
    if (panel) handlers.onPanel(panel.side, panel.x, panel.y);
    else handlers.onPanel(-1, point.x, point.y);
  });

  window.addEventListener('keydown', (event) => {
    const step = event.shiftKey ? 34 : 13;
    switch (event.key) {
      case 'ArrowLeft': handlers.onCursorMove(-step, 0); event.preventDefault(); break;
      case 'ArrowRight': handlers.onCursorMove(step, 0); event.preventDefault(); break;
      case 'ArrowUp': handlers.onCursorMove(0, -step); event.preventDefault(); break;
      case 'ArrowDown': handlers.onCursorMove(0, step); event.preventDefault(); break;
      case 'Enter':
      case ' ': handlers.onKey(KEY.CONFIRM); event.preventDefault(); break;
      case 'h': case 'H': handlers.onKey(KEY.HINT); break;
      case 'p': case 'P': case 'Escape': handlers.onKey(KEY.PAUSE); break;
      case 'm': case 'M': handlers.onKey(KEY.MUTE); break;
      default: break;
    }
  });
}
