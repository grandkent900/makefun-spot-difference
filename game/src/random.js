// A small seeded random number generator (mulberry32) plus the handful of
// helpers the scene builder uses. The same seed always builds the same
// harbour, which is what makes the screenshot scenes repeatable and every
// round fair: the two panels are drawn from one scene, never from two rolls.

export function createRandom(seed) {
  let a = seed | 0;
  return function random() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A float in [min, max). */
export function range(random, min, max) {
  return min + random() * (max - min);
}

/** An integer in [min, max], both ends included. */
export function intRange(random, min, max) {
  return min + Math.floor(random() * (max - min + 1));
}

/** One element of a non-empty array. */
export function pick(random, items) {
  return items[Math.floor(random() * items.length)];
}

/** A shuffled copy of the array (the original is left alone). */
export function shuffled(random, items) {
  const copy = items.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const hold = copy[i];
    copy[i] = copy[j];
    copy[j] = hold;
  }
  return copy;
}
