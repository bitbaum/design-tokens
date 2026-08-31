/**
 * Contrast invariants — the ones a person cannot check by looking.
 *
 * The accent is the fleet's single action colour, so a label placed on it is
 * placed on it in THREE products at once. White on #ff5c00 is 3.10:1, below
 * the 4.5:1 WCAG AA floor for normal text, and that one pairing put Solon's
 * "Open the Dashboard", OrangeCat's "Get Started" and FleetCrown's "Launch
 * agent" under the floor simultaneously. Nobody noticed for months, because
 * an orange button with a white label looks completely normal.
 *
 * A ratio is arithmetic, so it can be pinned. This file pins the pairings the
 * fleet actually relies on: if someone brightens --on-accent to "soften" the
 * buttons, or lightens --public-accent, the build says so here rather than in
 * an accessibility complaint three products later.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const css = fs.readFileSync(path.join(__dirname, '..', 'tokens.css'), 'utf8');

/**
 * The first definition of a custom property, as written.
 * @param {string} name
 * @returns {string}
 */
function tokenValue(name) {
  const m = css.match(new RegExp(`${name}\\s*:\\s*([^;]+);`));
  assert.ok(m, `${name} is not defined in tokens.css`);
  return m[1].trim();
}

/**
 * `0 0% 8%` (an HSL triple, as shadcn-style tokens are stored) → sRGB.
 * @param {string} triple
 * @returns {number[]}
 */
function hslTripleToRgb(triple) {
  const [h, s, l] = triple.split(/\s+/).map((/** @type {string} */ p) => parseFloat(p));
  const S = s / 100;
  const L = l / 100;
  const c = (1 - Math.abs(2 * L - 1)) * S;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = L - c / 2;
  const [r, g, b] =
    h < 60
      ? [c, x, 0]
      : h < 120
        ? [x, c, 0]
        : h < 180
          ? [0, c, x]
          : h < 240
            ? [0, x, c]
            : h < 300
              ? [x, 0, c]
              : [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

/**
 * @param {string} hex
 * @returns {number[]}
 */
function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}

/**
 * @param {number[]} rgb
 * @returns {number}
 */
function luminance(rgb) {
  const [r, g, b] = rgb.map((/** @type {number} */ v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * @param {number[]} a
 * @param {number[]} b
 * @returns {number}
 */
function ratio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const AA_NORMAL = 4.5;

test('--on-accent clears AA on --public-accent', () => {
  const accent = hexToRgb(tokenValue('--public-accent'));
  const onAccent = hslTripleToRgb(tokenValue('--on-accent'));
  const r = ratio(onAccent, accent);
  assert.ok(
    r >= AA_NORMAL,
    `text on the accent is ${r.toFixed(2)}:1, needs ${AA_NORMAL}. ` +
      `Darken --on-accent or darken --public-accent — but do not "fix" this by ` +
      `putting white back on the button: white is 3.10:1 here.`,
  );
});

test('white is NOT an acceptable label on the accent', () => {
  // The negative side of the same rule. If this ever passes, the accent has
  // been darkened enough that `text-white` is legitimate again — at which
  // point --on-accent has become dead weight and should be reconsidered
  // deliberately, not left as a token nobody can explain.
  const accent = hexToRgb(tokenValue('--public-accent'));
  const r = ratio([255, 255, 255], accent);
  assert.ok(
    r < AA_NORMAL,
    `white on the accent is now ${r.toFixed(2)}:1. The accent changed; ` +
      `revisit whether --on-accent is still the right pairing.`,
  );
});

test('--on-accent does not flip between themes', () => {
  // The accent is theme-independent, so its label must be too. A label that
  // inverted with the theme would be unreadable in one of them — which is
  // exactly why no existing text token could be reused for this role.
  const defs = [...css.matchAll(/--on-accent\s*:\s*([^;]+);/g)].map((m) => m[1].trim());
  assert.equal(
    defs.length,
    1,
    `--on-accent is defined ${defs.length} times (${defs.join(' | ')}); it must be ` +
      `declared once, outside any theme block, like --public-accent.`,
  );
});
