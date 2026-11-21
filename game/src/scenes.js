// Round assembly: build a round's two pictures from one seed. The original
// scene comes from harbor.js; the changed scene is a deep clone with the
// round's chosen differences applied. Selection is seeded too, prefers a
// spread of subtlety up to the round's cap, and never places two markers
// close enough to overlap — so a round never hides two changes in the same
// eyeful, and never asks for the cat twice (gone, and also ginger).

import { ROUNDS } from './config.js';
import { buildScene, differenceCandidates } from './harbor.js';
import { createRandom, shuffled } from './random.js';

/** Two spots closer than this (scene pixels) would draw overlapping rings. */
const MIN_SPOT_DISTANCE = 38;

function cloneScene(scene) {
  return JSON.parse(JSON.stringify(scene));
}

/**
 * Build round `roundIndex` (0-based) from `seed`. Returns everything the
 * game and the renderer need: both scenes, the chosen differences (with
 * their spots, in the order they were picked), and the round's limits.
 */
export function buildRound(roundIndex, seed) {
  const spec = ROUNDS[roundIndex];
  const random = createRandom(seed);
  const original = buildScene(spec.theme, random);
  const candidates = differenceCandidates(original)
    .filter((c) => c.subtlety <= spec.maxSubtlety);

  // A difficulty lean, not a ladder: each candidate sorts by its subtlety
  // plus a seeded jitter, so a round anchors on fair finds and reaches for
  // subtle ones, but no two rounds hide quite the same set.
  const ordered = shuffled(random, candidates)
    .map((c) => ({ c, key: c.subtlety + random() * 2 }))
    .sort((a, b) => a.key - b.key)
    .map(({ c }) => c);
  const chosen = [];
  for (const candidate of ordered) {
    if (chosen.length >= spec.differences) break;
    const tooClose = chosen.some((other) => {
      const dx = other.spot.x - candidate.spot.x;
      const dy = other.spot.y - candidate.spot.y;
      return Math.hypot(dx, dy) < MIN_SPOT_DISTANCE;
    });
    if (!tooClose) chosen.push(candidate);
  }

  const changed = cloneScene(original);
  for (const difference of chosen) difference.apply(changed);

  return {
    index: roundIndex,
    name: spec.name,
    theme: spec.theme,
    seconds: spec.seconds,
    original,
    changed,
    differences: chosen.map((c) => ({
      id: c.id, label: c.label, x: c.spot.x, y: c.spot.y, r: c.spot.r,
    })),
  };
}

/** The seed of one round of one game: stable for a (gameSeed, round) pair. */
export function roundSeed(gameSeed, roundIndex) {
  return (gameSeed ^ Math.imul(roundIndex + 1, 0x9e3779b9)) >>> 0;
}
