// The harbour itself: one little port town drawn entirely with canvas paths,
// as pure data plus a painter. buildScene makes the scene for one round (the
// left, original picture); the right picture is the same data with a handful
// of differences applied to a clone, so the two panels can never drift apart
// except exactly where a difference says so.
//
// Everything a player can spot is a field in the scene data — a window's lit
// flag, the lighthouse's stripe colour, the cat's coat — and differenceCandidates
// names each change, where its marker goes, and how subtle it is. Rounds pick
// from the catalogue by subtlety, so later rounds hide meaner changes.

import { pick, range } from './random.js';

/** The scene's own coordinate frame: the inside of one picture panel. */
export const SCENE = { width: 592, height: 452, shoreY: 272, quayY: 372 };

/** Per-hour looks: sky, sea, light. The town is the same; the hour is not. */
const THEMES = {
  dawn: {
    skyTop: '#7d9cc0', skyMid: '#d99a6c', skyLow: '#f6cf8d', sea: '#49748f', seaDeep: '#3a637e',
    hills: '#6d7f95', rock: '#5d5a63', quay: '#8a6a4e', quayDark: '#77593f',
    celestial: 'sun', stars: 0, windowsLit: 0.45, lanternsOn: true, beam: false,
  },
  day: {
    skyTop: '#5f9fd8', skyMid: '#9cc8ec', skyLow: '#d8eefb', sea: '#3d7ea3', seaDeep: '#2f6889',
    hills: '#7d9b76', rock: '#767a72', quay: '#9a7856', quayDark: '#86664a',
    celestial: 'sun', stars: 0, windowsLit: 0.08, lanternsOn: false, beam: false,
  },
  dusk: {
    skyTop: '#463a75', skyMid: '#a34d68', skyLow: '#ef8f4c', sea: '#33506e', seaDeep: '#2a425c',
    hills: '#4c4460', rock: '#4a4450', quay: '#7d5c40', quayDark: '#6a4d34',
    celestial: 'moon', stars: 26, windowsLit: 0.85, lanternsOn: true, beam: true,
  },
  night: {
    skyTop: '#0d1730', skyMid: '#1d2f52', skyLow: '#33507c', sea: '#1c2f47', seaDeep: '#162539',
    hills: '#232c40', rock: '#2c2c34', quay: '#6b4f36', quayDark: '#593f2b',
    celestial: 'moon', stars: 70, windowsLit: 0.9, lanternsOn: true, beam: true,
  },
};

const WALLS = ['#e8d8b0', '#dfc9a8', '#e3b7a0', '#d9e2e8', '#ecd9c0'];
const ROOFS = ['#a34a3a', '#7a4a56', '#546a7a', '#8a5a3a'];
const SAILS = ['#f6efdd', '#f2d8a0', '#e8eef2'];
const AWNING_PAIRS = [['#c2452d', '#f3e3c2'], ['#2d6a8a', '#f3e3c2'], ['#3f7a4a', '#f3e3c2']];

/** Point on the sagging bunting string, t in [0, 1] from end to end. */
export function buntingPoint(t) {
  const x0 = 176, y0 = 148, x1 = 556, y1 = 136, sag = 30;
  const x = x0 + (x1 - x0) * t;
  const y = y0 + (y1 - y0) * t + Math.sin(Math.PI * t) * sag;
  return { x, y };
}

/**
 * Build the original scene for a round. `random` is the round's seeded
 * generator; the layout is fixed (so the town is learnable) while the small
 * dressing — which windows are lit, the gulls, the stars — comes from the seed.
 */
export function buildScene(themeName, random) {
  const theme = THEMES[themeName];
  const scene = {
    theme: themeName,
    palette: theme,
    stars: [],
    clouds: [],
    gulls: [],
    houses: [],
    flags: [],
  };

  for (let i = 0; i < theme.stars; i += 1) {
    scene.stars.push({ x: range(random, 8, 584), y: range(random, 6, 150), r: range(random, 0.7, 1.7) });
  }
  scene.clouds = [
    { x: 96, y: 52, s: 1.0 }, { x: 268, y: 34, s: 0.7 }, { x: 428, y: 84, s: 0.85 }, { x: 40, y: 118, s: 0.6 },
  ];
  const gullCount = themeName === 'night' ? 0 : 3;
  for (let i = 0; i < gullCount; i += 1) {
    scene.gulls.push({ x: 210 + i * 88 + range(random, -14, 14), y: 74 + (i % 2) * 30 + range(random, -8, 8), s: range(random, 0.8, 1.15) });
  }

  // The four houses of the back shore, left to right.
  const houseSpecs = [
    { x: 168, w: 96, h: 96 }, { x: 270, w: 88, h: 122 }, { x: 364, w: 104, h: 86 }, { x: 474, w: 90, h: 108 },
  ];
  houseSpecs.forEach((spec, index) => {
    const top = SCENE.shoreY - spec.h;
    const rows = spec.h > 110 ? 3 : 2;
    const windows = [];
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < 2; col += 1) {
        windows.push({
          x: spec.x + 16 + col * (spec.w - 52),
          y: top + 26 + row * 30,
          w: 20, h: 24,
          lit: random() < theme.windowsLit,
        });
      }
    }
    scene.houses.push({
      ...spec, top,
      wall: WALLS[index % WALLS.length],
      roof: ROOFS[index % ROOFS.length],
      doorColor: index % 2 === 0 ? '#5a3a2a' : '#33526b',
      doorX: spec.x + spec.w / 2 - 11,
      chimney: { x: spec.x + spec.w - 30, y: top - 16, smoke: index === 1 || index === 3 },
      windows,
    });
  });

  // Bunting strung across the rooftops.
  for (let i = 0; i < 9; i += 1) {
    const t = (i + 0.5) / 9;
    const p = buntingPoint(t);
    scene.flags.push({ x: p.x, y: p.y, color: pick(random, ['#e4572e', '#f2b33d', '#3f8a5a', '#3a6ea8', '#c2456e']), gone: false });
  }

  scene.lighthouse = { stripe: '#d84a35', lampOn: themeName === 'dusk' || themeName === 'night', doorOpen: false };
  scene.celestial = { x: 516, y: 56, r: 23, phase: themeName === 'dusk' ? 'crescent' : 'full', gone: false };
  scene.sailboat = { x: 318, y: 330, sail: SAILS[0], flag: true, hull: '#7a4a2e' };
  scene.rowboat = { x: 452, y: 350, color: '#3f6a8a', oars: true };
  scene.buoy = { x: 196, y: 332, color: '#d84a35' };
  scene.stall = {
    x: 392, awning: AWNING_PAIRS[0], signSymbol: 'fish',
    apples: 5, oranges: 4,
  };
  scene.crates = { cat: { color: '#2e2a33', present: true } };
  scene.barrels = { count: 2 };
  scene.lanterns = [
    { x: 232, on: theme.lanternsOn }, { x: 560, on: theme.lanternsOn },
  ];
  scene.signpost = { symbol: 'anchor' };
  return scene;
}

/**
 * The catalogue of differences this scene can hide. Each entry knows the
 * change it makes to a cloned scene, the point its marker belongs at, the
 * radius a click must land within, a plain-words label (used by the hint
 * toast's flavour text and the round recap), and a subtlety from 1 (a
 * lighthouse changing colour) to 4 (one flag of nine changing colour).
 */
export function differenceCandidates(scene) {
  const theme = scene.theme;
  const all = [
    {
      id: 'lighthouse-stripe', subtlety: 1, label: 'The lighthouse changed its stripes',
      spot: { x: 78, y: 210, r: 28 },
      apply(s) { s.lighthouse.stripe = '#3a6ea8'; },
    },
    {
      id: 'lighthouse-lamp', subtlety: 2, label: 'The lighthouse lamp went out',
      themes: ['dawn', 'dusk', 'night'],
      spot: { x: 78, y: 128, r: 22 },
      apply(s) { s.lighthouse.lampOn = !s.lighthouse.lampOn; },
    },
    {
      id: 'lighthouse-door', subtlety: 4, label: 'The lighthouse door stands open',
      spot: { x: 78, y: 252, r: 18 },
      apply(s) { s.lighthouse.doorOpen = true; },
    },
    {
      id: 'sail-colour', subtlety: 1, label: 'The sailboat flies a different sail',
      spot: { x: 330, y: 262, r: 30 },
      apply(s) { s.sailboat.sail = '#e4572e'; },
    },
    {
      id: 'sail-flag', subtlety: 3, label: 'The sailboat lost its pennant',
      spot: { x: 328, y: 216, r: 16 },
      apply(s) { s.sailboat.flag = false; },
    },
    {
      id: 'buoy-colour', subtlety: 2, label: 'The buoy changed colour',
      spot: { x: 196, y: 332, r: 18 },
      apply(s) { s.buoy.color = '#3f8a5a'; },
    },
    {
      id: 'cat-gone', subtlety: 1, label: 'The cat slipped away',
      spot: { x: 72, y: 348, r: 24 },
      apply(s) { s.crates.cat.present = false; },
    },
    {
      id: 'cat-coat', subtlety: 2, label: 'The cat changed its coat',
      spot: { x: 72, y: 348, r: 24 },
      apply(s) { s.crates.cat.color = '#d88f3a'; },
    },
    {
      id: 'barrel-count', subtlety: 3, label: 'A barrel rolled away',
      spot: { x: 189, y: 420, r: 24 },
      apply(s) { s.barrels.count = 1; },
    },
    {
      id: 'lantern-out', subtlety: 2, label: 'A quay lantern went dark',
      themes: ['dawn', 'dusk', 'night'],
      spot: { x: 560, y: 318, r: 20 },
      apply(s) { s.lanterns[1].on = false; },
    },
    {
      id: 'signpost-symbol', subtlety: 3, label: 'The signpost shows a different mark',
      spot: { x: 300, y: 344, r: 20 },
      apply(s) { s.signpost.symbol = 'star'; },
    },
    {
      id: 'stall-awning', subtlety: 2, label: 'The market stall got a new awning',
      spot: { x: 466, y: 336, r: 32 },
      apply(s) { s.stall.awning = AWNING_PAIRS[1]; },
    },
    {
      id: 'stall-apples', subtlety: 3, label: 'Someone took apples from the stall',
      spot: { x: 430, y: 385, r: 20 },
      apply(s) { s.stall.apples = 3; },
    },
    {
      id: 'stall-sign', subtlety: 4, label: 'The stall sign changed its catch',
      spot: { x: 466, y: 372, r: 16 },
      apply(s) { s.stall.signSymbol = 'star'; },
    },
    {
      id: 'rowboat-oars', subtlety: 4, label: 'The rowboat lost its oars',
      spot: { x: 476, y: 356, r: 24 },
      apply(s) { s.rowboat.oars = false; },
    },
    {
      id: 'rowboat-colour', subtlety: 2, label: 'The rowboat was repainted',
      spot: { x: 476, y: 352, r: 26 },
      apply(s) { s.rowboat.color = '#8a3a3a'; },
    },
    {
      id: 'celestial-phase', subtlety: 2, label: 'The moon changed its face',
      themes: ['dusk', 'night'],
      spot: { x: 516, y: 56, r: 26 },
      apply(s) { s.celestial.phase = s.celestial.phase === 'full' ? 'crescent' : 'full'; },
    },
    {
      id: 'flag-gone', subtlety: 3, label: 'A festival flag is missing',
      spot: (() => { const f = scene.flags[4]; return { x: f.x, y: f.y + 8, r: 16 }; })(),
      apply(s) { s.flags[4].gone = true; },
    },
    {
      id: 'flag-colour', subtlety: 4, label: 'One festival flag changed colour',
      spot: (() => { const f = scene.flags[6]; return { x: f.x, y: f.y + 8, r: 15 }; })(),
      apply(s) { s.flags[6].color = '#3a6ea8'; },
    },
    {
      id: 'gull-gone', subtlety: 3, label: 'A gull left the sky',
      themes: ['dawn', 'day', 'dusk'],
      spot: (() => { const g = scene.gulls[1] || { x: 300, y: 90 }; return { x: g.x, y: g.y, r: 18 }; })(),
      apply(s) { s.gulls.splice(1, 1); },
    },
  ];

  // One window per house that can flip its light — the workhorse difference,
  // at a subtlety that grows the later the round.
  scene.houses.forEach((house, houseIndex) => {
    const win = house.windows[houseIndex % house.windows.length];
    all.push({
      id: `window-${houseIndex}`, subtlety: theme === 'day' ? 3 : 2,
      label: 'A window changed its light',
      spot: { x: win.x + win.w / 2, y: win.y + win.h / 2, r: 17 },
      apply(s) {
        const w = s.houses[houseIndex].windows[houseIndex % house.windows.length];
        w.lit = !w.lit;
      },
    });
    all.push({
      id: `roof-${houseIndex}`, subtlety: 3,
      label: 'A roof was retiled',
      spot: { x: house.x + house.w / 2, y: house.top - 6, r: 22 },
      apply(s) { s.houses[houseIndex].roof = '#3f5a46'; },
    });
  });
  const smoky = scene.houses.findIndex((h) => h.chimney.smoke);
  if (smoky >= 0) {
    const house = scene.houses[smoky];
    all.push({
      id: 'chimney-smoke', subtlety: 3, label: 'A chimney stopped smoking',
      spot: { x: house.chimney.x + 6, y: house.chimney.y - 16, r: 18 },
      apply(s) { s.houses[smoky].chimney.smoke = false; },
    });
  }
  if (theme === 'night' && scene.stars.length > 12) {
    const star = scene.stars[10];
    all.push({
      id: 'star-gone', subtlety: 4, label: 'A bright star went out',
      spot: { x: star.x, y: star.y, r: 15 },
      apply(s) { s.stars.splice(10, 1); },
    });
  }
  return all.filter((c) => !c.themes || c.themes.includes(theme));
}

// ---------------------------------------------------------------------------
// The painter. Everything below only reads scene data, so the left and right
// panels — drawn from the original and the cloned-and-changed scene — are the
// same code path with different data. `t` is milliseconds since the round
// started and drives only the shared, gentle motion (water, lamp flicker,
// the lighthouse beam), never anything a difference could hide behind.
// ---------------------------------------------------------------------------

function path(ctx, points) {
  ctx.beginPath();
  points.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath();
}

function ellipse(ctx, x, y, rx, ry) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
}

function drawSky(ctx, scene, t) {
  const p = scene.palette;
  const sky = ctx.createLinearGradient(0, 0, 0, SCENE.shoreY);
  sky.addColorStop(0, p.skyTop);
  sky.addColorStop(0.62, p.skyMid);
  sky.addColorStop(1, p.skyLow);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, SCENE.width, SCENE.shoreY);

  ctx.fillStyle = '#ffffff';
  for (const star of scene.stars) {
    ctx.globalAlpha = 0.55 + 0.35 * Math.sin(t / 700 + star.x);
    ellipse(ctx, star.x, star.y, star.r, star.r);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // The sun or the moon, top right.
  const c = scene.celestial;
  if (!c.gone) {
    if (scene.palette.celestial === 'sun') {
      ctx.fillStyle = '#ffd873';
      ellipse(ctx, c.x, c.y, c.r + 9, c.r + 9);
      ctx.globalAlpha = 0.35;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#ffdf8a';
      ellipse(ctx, c.x, c.y, c.r, c.r);
      ctx.fill();
    } else {
      ctx.fillStyle = '#f4ecd8';
      ellipse(ctx, c.x, c.y, c.r, c.r);
      ctx.fill();
      if (c.phase === 'crescent') {
        ctx.fillStyle = p.skyTop;
        ellipse(ctx, c.x + 10, c.y - 5, c.r - 3, c.r - 3);
        ctx.fill();
      } else {
        ctx.fillStyle = 'rgba(190,180,150,0.5)';
        ellipse(ctx, c.x - 7, c.y + 4, 4.5, 4.5);
        ctx.fill();
        ellipse(ctx, c.x + 6, c.y - 8, 3.2, 3.2);
        ctx.fill();
      }
    }
  }

  // Soft clouds: three overlapping ellipses apiece, paler than the sky.
  ctx.fillStyle = scene.theme === 'night' || scene.theme === 'dusk' ? 'rgba(230,230,245,0.16)' : 'rgba(255,255,255,0.75)';
  for (const cloud of scene.clouds) {
    const { x, y, s } = cloud;
    ellipse(ctx, x, y, 34 * s, 13 * s);
    ctx.fill();
    ellipse(ctx, x + 24 * s, y + 3 * s, 24 * s, 10 * s);
    ctx.fill();
    ellipse(ctx, x - 26 * s, y + 4 * s, 22 * s, 9 * s);
    ctx.fill();
  }

  // Gulls: two arcs and a body tick.
  ctx.strokeStyle = scene.theme === 'day' || scene.theme === 'dawn' ? '#3c4a56' : 'rgba(240,240,250,0.8)';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  for (const gull of scene.gulls) {
    const flap = Math.sin(t / 480 + gull.x) * 3;
    ctx.beginPath();
    ctx.arc(gull.x - 7 * gull.s, gull.y + flap * 0.4, 7 * gull.s, Math.PI * 1.15, Math.PI * 1.85);
    ctx.arc(gull.x + 7 * gull.s, gull.y + flap * 0.4, 7 * gull.s, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
  }
}

function drawHillsAndShore(ctx, scene) {
  const p = scene.palette;
  ctx.fillStyle = p.hills;
  path(ctx, [[0, 272], [0, 238], [70, 224], [150, 240], [168, 232], [592, 226], [592, 272]]);
  ctx.fill();
  // The shore strip the houses stand on.
  ctx.fillStyle = scene.theme === 'day' ? '#8aa06a' : '#5c6650';
  ctx.fillRect(140, 258, 452, 14);
}

function drawLighthouse(ctx, scene, t) {
  const p = scene.palette;
  const lh = scene.lighthouse;
  // Rocky point jutting into the sea.
  ctx.fillStyle = p.rock;
  path(ctx, [[0, 452], [0, 268], [38, 252], [86, 246], [128, 258], [148, 286], [138, 330], [110, 372], [96, 452]]);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  path(ctx, [[38, 252], [86, 246], [128, 258], [118, 276], [60, 272], [30, 264]]);
  ctx.fill();

  // The beam, at the hours the lamp is lit: a slow sweep, same in both panels.
  if (lh.lampOn && p.beam) {
    const sway = Math.sin(t / 2600) * 0.16;
    ctx.save();
    ctx.translate(78, 128);
    ctx.rotate(sway);
    const beamGrad = ctx.createLinearGradient(0, 0, 330, 0);
    beamGrad.addColorStop(0, 'rgba(255,224,150,0.34)');
    beamGrad.addColorStop(1, 'rgba(255,224,150,0)');
    ctx.fillStyle = beamGrad;
    path(ctx, [[6, -4], [330, -34], [330, 30]]);
    ctx.fill();
    ctx.restore();
  }

  // Tower: a slight taper, two stripes of the stripe colour.
  ctx.fillStyle = '#f2ead8';
  path(ctx, [[60, 272], [64, 148], [92, 148], [96, 272]]);
  ctx.fill();
  ctx.fillStyle = lh.stripe;
  path(ctx, [[62.5, 226], [93.5, 226], [94.5, 198], [61.8, 198]]);
  ctx.fill();
  path(ctx, [[64.8, 172], [91.2, 172], [92, 150], [64, 150]]);
  ctx.fill();
  // Gallery, lamp room and cap.
  ctx.fillStyle = '#33302e';
  ctx.fillRect(56, 140, 44, 8);
  ctx.fillStyle = lh.lampOn ? '#ffd873' : '#6a7076';
  ctx.fillRect(66, 116, 24, 24);
  ctx.strokeStyle = '#33302e';
  ctx.lineWidth = 2;
  ctx.strokeRect(66, 116, 24, 24);
  if (lh.lampOn) {
    ctx.fillStyle = 'rgba(255,216,115,0.35)';
    ellipse(ctx, 78, 128, 24, 24);
    ctx.fill();
  }
  ctx.fillStyle = '#a33327';
  path(ctx, [[62, 116], [78, 100], [94, 116]]);
  ctx.fill();
  // Door, open or shut.
  ctx.fillStyle = lh.doorOpen ? '#241d16' : '#5a3a2a';
  ctx.fillRect(70, 240, 16, 32);
  if (lh.doorOpen) {
    ctx.fillStyle = '#7a4a2e';
    path(ctx, [[86, 240], [97, 246], [97, 272], [86, 272]]);
    ctx.fill();
  }
}

function drawHouse(ctx, house, theme) {
  const { x, w, top } = house;
  const base = SCENE.shoreY;
  // Chimney and its smoke first, behind the roof.
  ctx.fillStyle = '#8a7a6a';
  ctx.fillRect(house.chimney.x, house.chimney.y, 13, 22);
  if (house.chimney.smoke) {
    ctx.fillStyle = theme === 'night' || theme === 'dusk' ? 'rgba(220,220,235,0.35)' : 'rgba(255,255,255,0.65)';
    ellipse(ctx, house.chimney.x + 8, house.chimney.y - 12, 7, 5);
    ctx.fill();
    ellipse(ctx, house.chimney.x + 13, house.chimney.y - 24, 10, 7);
    ctx.fill();
    ellipse(ctx, house.chimney.x + 20, house.chimney.y - 38, 13, 9);
    ctx.fill();
  }
  // Walls and roof.
  ctx.fillStyle = house.wall;
  ctx.fillRect(x, top, w, base - top);
  ctx.fillStyle = house.roof;
  path(ctx, [[x - 7, top + 2], [x + w / 2, top - 24], [x + w + 7, top + 2]]);
  ctx.fill();
  // Windows: warm when lit, pale glass when not.
  for (const win of house.windows) {
    ctx.fillStyle = win.lit ? '#ffca6a' : theme === 'day' ? '#bcd8ea' : '#4a5a72';
    ctx.fillRect(win.x, win.y, win.w, win.h);
    ctx.strokeStyle = 'rgba(40,32,24,0.55)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(win.x, win.y, win.w, win.h);
    ctx.beginPath();
    ctx.moveTo(win.x + win.w / 2, win.y);
    ctx.lineTo(win.x + win.w / 2, win.y + win.h);
    ctx.stroke();
  }
  // Door.
  ctx.fillStyle = house.doorColor;
  ctx.fillRect(house.doorX, base - 34, 22, 34);
  ctx.fillStyle = '#f2c94c';
  ellipse(ctx, house.doorX + 16, base - 17, 2.2, 2.2);
  ctx.fill();
}

function drawBunting(ctx, scene) {
  ctx.strokeStyle = 'rgba(30,26,22,0.65)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  for (let i = 0; i <= 40; i += 1) {
    const p = buntingPoint(i / 40);
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  ctx.stroke();
  for (const flag of scene.flags) {
    if (flag.gone) continue;
    ctx.fillStyle = flag.color;
    path(ctx, [[flag.x - 8, flag.y], [flag.x + 8, flag.y], [flag.x, flag.y + 15]]);
    ctx.fill();
  }
}

function drawSea(ctx, scene, t) {
  const p = scene.palette;
  const sea = ctx.createLinearGradient(0, SCENE.shoreY, 0, SCENE.quayY);
  sea.addColorStop(0, p.sea);
  sea.addColorStop(1, p.seaDeep);
  ctx.fillStyle = sea;
  ctx.fillRect(0, SCENE.shoreY, SCENE.width, SCENE.quayY - SCENE.shoreY);
  // Drifting sparkle lines, seeded per row so both panels agree.
  ctx.strokeStyle = 'rgba(255,255,255,0.20)';
  ctx.lineWidth = 1.6;
  for (let row = 0; row < 6; row += 1) {
    const y = 288 + row * 14;
    const drift = Math.sin(t / 1400 + row * 1.7) * 6;
    for (let i = 0; i < 5; i += 1) {
      const x = ((i * 137 + row * 61 + drift) % 620) - 14;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 22 - row * 2, y);
      ctx.stroke();
    }
  }
}

function drawSailboat(ctx, boat, t) {
  const bob = Math.sin(t / 900) * 2;
  const { x } = boat;
  const y = boat.y + bob;
  // Hull and its reflection.
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ellipse(ctx, x + 6, y + 16, 46, 5);
  ctx.fill();
  ctx.fillStyle = boat.hull;
  path(ctx, [[x - 42, y], [x + 46, y], [x + 34, y + 14], [x - 30, y + 14]]);
  ctx.fill();
  ctx.fillStyle = '#5a3a22';
  ctx.fillRect(x - 42, y - 3, 88, 4);
  // Mast, boom and the two sails.
  ctx.strokeStyle = '#4a3826';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x + 2, y - 2);
  ctx.lineTo(x + 2, y - 118);
  ctx.stroke();
  ctx.fillStyle = boat.sail;
  path(ctx, [[x + 7, y - 112], [x + 7, y - 10], [x + 44, y - 10]]);
  ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.10)';
  path(ctx, [[x - 3, y - 104], [x - 3, y - 10], [x - 34, y - 10]]);
  ctx.fill();
  ctx.strokeStyle = 'rgba(60,50,40,0.5)';
  ctx.lineWidth = 1.2;
  path(ctx, [[x + 7, y - 112], [x + 7, y - 10], [x + 44, y - 10]]);
  ctx.stroke();
  if (boat.flag) {
    ctx.fillStyle = '#d84a35';
    path(ctx, [[x + 2, y - 118], [x + 20, y - 113], [x + 2, y - 107]]);
    ctx.fill();
  }
}

function drawRowboat(ctx, boat, t) {
  const bob = Math.sin(t / 1100 + 2) * 1.6;
  const { x } = boat;
  const y = boat.y + bob;
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ellipse(ctx, x + 26, y + 12, 40, 4.5);
  ctx.fill();
  ctx.fillStyle = boat.color;
  path(ctx, [[x - 14, y], [x + 66, y], [x + 54, y + 11], [x - 4, y + 11]]);
  ctx.fill();
  ctx.fillStyle = '#e8dcc2';
  ctx.fillRect(x + 8, y + 2, 36, 3.5);
  if (boat.oars) {
    ctx.strokeStyle = '#8a6a42';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + 16, y + 2);
    ctx.lineTo(x + 2, y + 16);
    ctx.moveTo(x + 38, y + 2);
    ctx.lineTo(x + 52, y + 16);
    ctx.stroke();
  }
}

function drawBuoy(ctx, buoy, t) {
  const bob = Math.sin(t / 800 + 1) * 2.4;
  const y = buoy.y + bob;
  ctx.fillStyle = 'rgba(0,0,0,0.16)';
  ellipse(ctx, buoy.x, y + 12, 16, 3.6);
  ctx.fill();
  ctx.fillStyle = buoy.color;
  path(ctx, [[buoy.x - 11, y + 10], [buoy.x - 6, y - 8], [buoy.x + 6, y - 8], [buoy.x + 11, y + 10]]);
  ctx.fill();
  ctx.fillStyle = '#f2ead8';
  ctx.fillRect(buoy.x - 8, buoy.y + bob - 1, 16, 4);
  ctx.fillStyle = '#33302e';
  ctx.fillRect(buoy.x - 2, y - 16, 4, 9);
}

function drawQuay(ctx, scene, t) {
  const p = scene.palette;
  // The wooden quay across the bottom of the picture.
  ctx.fillStyle = p.quay;
  ctx.fillRect(0, SCENE.quayY, SCENE.width, SCENE.height - SCENE.quayY);
  ctx.fillStyle = p.quayDark;
  for (let i = 0; i < 5; i += 1) ctx.fillRect(0, SCENE.quayY + 16 + i * 16, SCENE.width, 2);
  for (let i = 0; i < 9; i += 1) ctx.fillRect(36 + i * 68, SCENE.quayY, 2, SCENE.height - SCENE.quayY);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(0, SCENE.quayY, SCENE.width, 4);

  drawCratesAndCat(ctx, scene);
  drawBarrels(ctx, scene);
  drawLantern(ctx, scene.lanterns[0], t);
  drawSignpost(ctx, scene);
  drawStall(ctx, scene);
  drawLantern(ctx, scene.lanterns[1], t);
}

function drawCratesAndCat(ctx, scene) {
  const crate = (x, y, s) => {
    ctx.fillStyle = '#a97d4f';
    ctx.fillRect(x, y, s, s);
    ctx.strokeStyle = '#7d5a36';
    ctx.lineWidth = 2.4;
    ctx.strokeRect(x, y, s, s);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + s, y + s);
    ctx.moveTo(x + s, y);
    ctx.lineTo(x, y + s);
    ctx.stroke();
  };
  crate(22, 402, 40);
  crate(66, 402, 40);
  crate(44, 362, 40);
  const cat = scene.crates.cat;
  if (cat.present) {
    const x = 64, y = 362;
    ctx.fillStyle = cat.color;
    ellipse(ctx, x, y - 6, 13, 9); // body
    ctx.fill();
    ellipse(ctx, x + 11, y - 15, 7.5, 7); // head
    ctx.fill();
    path(ctx, [[x + 5, y - 20], [x + 7, y - 27], [x + 11, y - 21]]); // ears
    ctx.fill();
    path(ctx, [[x + 15, y - 21], [x + 18, y - 27], [x + 19, y - 20]]);
    ctx.fill();
    ctx.strokeStyle = cat.color; // tail curling up the crate side
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x - 13, y - 8, 8, Math.PI * 0.4, Math.PI * 1.5);
    ctx.stroke();
    ctx.fillStyle = '#f2c94c'; // eyes
    ellipse(ctx, x + 9, y - 15, 1.4, 1.8);
    ctx.fill();
    ellipse(ctx, x + 14, y - 15, 1.4, 1.8);
    ctx.fill();
  }
}

function drawBarrels(ctx, scene) {
  for (let i = 0; i < scene.barrels.count; i += 1) {
    const x = 138 + i * 36;
    ctx.fillStyle = '#8a5f36';
    ctx.beginPath();
    ctx.moveTo(x, 404);
    ctx.quadraticCurveTo(x - 5, 422, x, 440);
    ctx.lineTo(x + 30, 440);
    ctx.quadraticCurveTo(x + 35, 422, x + 30, 404);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#5f4126';
    ctx.fillRect(x - 3, 412, 36, 3.4);
    ctx.fillRect(x - 3, 428, 36, 3.4);
    ellipse(ctx, x + 15, 404, 15, 4);
    ctx.fillStyle = '#a97d4f';
    ctx.fill();
  }
}

function drawLantern(ctx, lantern, t) {
  const { x } = lantern;
  ctx.fillStyle = '#2e2c30';
  ctx.fillRect(x - 3, 344, 6, 98);
  ctx.fillRect(x - 12, 338, 24, 5);
  if (lantern.on) {
    const flicker = 0.82 + 0.1 * Math.sin(t / 130 + x);
    ctx.fillStyle = `rgba(255,196,92,${0.26 * flicker})`;
    ellipse(ctx, x, 320, 20, 20);
    ctx.fill();
  }
  ctx.fillStyle = '#2e2c30';
  path(ctx, [[x - 9, 312], [x + 9, 312], [x + 5, 304], [x - 5, 304]]);
  ctx.fill();
  ctx.fillStyle = lantern.on ? '#ffc45c' : '#5a6068';
  ctx.fillRect(x - 6, 312, 12, 15);
  ctx.strokeStyle = '#2e2c30';
  ctx.lineWidth = 1.6;
  ctx.strokeRect(x - 6, 312, 12, 15);
}

function drawSignpost(ctx, scene) {
  const { x } = { x: 300 };
  ctx.fillStyle = '#6a4a2c';
  ctx.fillRect(x - 3, 356, 6, 86);
  ctx.fillStyle = '#8a6238';
  ctx.fillRect(x - 30, 322, 60, 36);
  ctx.strokeStyle = '#5f4126';
  ctx.lineWidth = 2.4;
  ctx.strokeRect(x - 30, 322, 60, 36);
  ctx.fillStyle = '#f4ead8';
  ctx.strokeStyle = '#f4ead8';
  if (scene.signpost.symbol === 'anchor') {
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, 328);
    ctx.lineTo(x, 348);
    ctx.moveTo(x - 8, 334);
    ctx.lineTo(x + 8, 334);
    ctx.moveTo(x - 9, 342);
    ctx.quadraticCurveTo(x, 354, x + 9, 342);
    ctx.stroke();
    ellipse(ctx, x, 328, 3.4, 3.4);
    ctx.fill();
  } else {
    const cx = x, cy = 340;
    ctx.beginPath();
    for (let i = 0; i < 10; i += 1) {
      const r = i % 2 === 0 ? 11 : 4.6;
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const px = cx + Math.cos(a) * r;
      const py = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }
}

function drawStall(ctx, scene) {
  const stall = scene.stall;
  const { x } = stall;
  // Posts and counter.
  ctx.fillStyle = '#6a4a2c';
  ctx.fillRect(x, 348, 7, 94);
  ctx.fillRect(x + 141, 348, 7, 94);
  ctx.fillStyle = '#8a6238';
  ctx.fillRect(x - 8, 396, 164, 12);
  ctx.fillRect(x - 4, 408, 156, 34);
  ctx.fillStyle = '#77552f';
  ctx.fillRect(x - 4, 420, 156, 3);
  // Awning: alternating stripes sloping down toward the front.
  const [c1, c2] = stall.awning;
  for (let i = 0; i < 8; i += 1) {
    ctx.fillStyle = i % 2 === 0 ? c1 : c2;
    path(ctx, [
      [x - 14 + i * 22, 348 - (i % 2) * 0],
      [x - 14 + (i + 1) * 22, 348],
      [x - 6 + (i + 1) * 22, 322],
      [x - 6 + i * 22, 322],
    ]);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fillRect(x - 14, 345, 176, 4);
  // The hanging sign under the awning, with its catch drawn on it.
  ctx.fillStyle = '#4a3826';
  ctx.fillRect(x + 52, 356, 44, 26);
  ctx.fillStyle = '#f4ead8';
  if (stall.signSymbol === 'fish') {
    ellipse(ctx, x + 71, 369, 12, 6);
    ctx.fill();
    path(ctx, [[x + 81, 369], [x + 90, 362], [x + 90, 376]]);
    ctx.fill();
    ctx.fillStyle = '#4a3826';
    ellipse(ctx, x + 66, 367, 1.8, 1.8);
    ctx.fill();
  } else {
    const cx = x + 74, cy = 369;
    ctx.beginPath();
    for (let i = 0; i < 10; i += 1) {
      const r = i % 2 === 0 ? 9.5 : 4;
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const px = cx + Math.cos(a) * r;
      const py = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }
  // Goods: a pile of apples, a row of oranges, and three fish on the counter.
  const fruit = (cx, cy, r, colour) => {
    ctx.fillStyle = colour;
    ellipse(ctx, cx, cy, r, r);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ellipse(ctx, cx - r * 0.3, cy - r * 0.3, r * 0.32, r * 0.24);
    ctx.fill();
  };
  const appleAt = [[414, 390], [430, 390], [446, 390], [422, 378], [438, 378]];
  for (let i = 0; i < stall.apples; i += 1) fruit(appleAt[i][0], appleAt[i][1], 8, '#c23b2a');
  const orangeAt = [[486, 390], [502, 390], [518, 390], [494, 379]];
  for (let i = 0; i < stall.oranges; i += 1) fruit(orangeAt[i][0], orangeAt[i][1], 7.5, '#e8862e');
  // Three silvery fish laid out at the counter's right end.
  ctx.fillStyle = '#9fb6c4';
  for (let i = 0; i < 3; i += 1) {
    ellipse(ctx, 528 + i * 12, 390 - (i % 2) * 3, 9, 3.6);
    ctx.fill();
  }
}

/** Paint the whole scene into a 592x452 frame at the context's origin. */
export function drawScene(ctx, scene, t) {
  drawSky(ctx, scene, t);
  drawHillsAndShore(ctx, scene);
  drawLighthouse(ctx, scene, t);
  for (const house of scene.houses) drawHouse(ctx, house, scene.theme);
  drawBunting(ctx, scene);
  drawSea(ctx, scene, t);
  drawSailboat(ctx, scene.sailboat, t);
  drawRowboat(ctx, scene.rowboat, t);
  drawBuoy(ctx, scene.buoy, t);
  drawQuay(ctx, scene, t);
}

