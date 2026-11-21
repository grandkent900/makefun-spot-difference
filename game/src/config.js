// Every tuning number for Lantern Lane in one place. The playfield is a fixed
// 1280x720 logical canvas; the renderer scales it to the window, so no rule
// below depends on the size of the screen it happens to run on.

/** Logical canvas size, in pixels. */
export const VIEW = { width: 1280, height: 720 };

/** The two picture panels: each scene is drawn into a 592x452 frame. */
export const PANEL = { width: 592, height: 452, top: 128, gap: 24, firstX: 40 };
export const PANEL_Y = PANEL.top;
export function panelX(side) {
  return PANEL.firstX + side * (PANEL.width + PANEL.gap);
}

/** Scoring: what a find pays, what a miss and a hint cost. */
export const SCORE = {
  findBase: 100,
  /** Extra points per whole second left on the clock when a round is cleared. */
  clearBonusPerSecond: 2,
  hintCost: 40,
  missSeconds: 3,
};

/** Hints a player carries for the whole game (all four rounds). */
export const HINTS_PER_GAME = 3;

/** Seconds the clock flashes red under, and the hint ring stays lit. */
export const LOW_TIME = 15;
export const HINT_PULSE_MS = 1600;

/**
 * The four rounds of one game. Each round is the same little harbour at a
 * different hour: the light changes, the crowd changes, and the differences
 * grow in number and subtlety (maxSubtlety is the hardest kind allowed in).
 */
export const ROUNDS = [
  { name: 'Dawn Harbour', theme: 'dawn', differences: 5, seconds: 120, maxSubtlety: 2 },
  { name: 'Market Day', theme: 'day', differences: 7, seconds: 115, maxSubtlety: 3 },
  { name: 'Festival Dusk', theme: 'dusk', differences: 9, seconds: 105, maxSubtlety: 3 },
  { name: 'Midnight Cove', theme: 'night', differences: 10, seconds: 95, maxSubtlety: 4 },
];

/** Colours of the page around the pictures (the scenes carry their own skies). */
export const CHROME = {
  backdrop: '#171a26',
  felt: '#20242f',
  paper: '#f4ead8',
  ink: '#23202b',
  accent: '#ffb43a',
  accentDeep: '#e07f2e',
  good: '#39d98a',
  bad: '#ff5d5d',
  hint: '#57c7ff',
  muted: '#9aa3b2',
  text: '#f2ede1',
};

export const FONT = '"Avenir Next", "Segoe UI", system-ui, -apple-system, sans-serif';
export const FONT_DISPLAY = '"Trebuchet MS", "Avenir Next", "Segoe UI", system-ui, sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'lantern-lane.best';
