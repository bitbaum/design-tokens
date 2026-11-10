/**
 * Contrast invariants — the ones a person cannot check by looking.
 *
 * The accent is the fleet's single action colour, so a label placed on it is
 * placed on it in THREE products at once. White on #ff5c00 is 3.10:1, below
 * the 4.5:1 WCAG AA floor for normal text, and that one pairing put Solon's
 * "Open the Dashboard", OrangeCat's "Get Started" and Loki's "Launch
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

test('--on-accent clears AA on the default --public-accent', () => {
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

test('white is NOT an acceptable label on the default (OrangeCat, Loki) accent', () => {
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
  // It is declared once for the default accent and once per brand, never in
  // a `.dark` block.
  const defs = [...css.matchAll(/--on-accent\s*:\s*([^;]+);/g)].map((m) => m[1].trim());
  assert.equal(
    defs.length,
    1 + BRANDS.length,
    `--on-accent is defined ${defs.length} times (${defs.join(' | ')}); expected once ` +
      `for the default accent and once per brand (${BRANDS.join(', ')}).`,
  );
  for (const rule of [darkBlock(), ...BRANDS.map((b) => block(`.dark[data-brand='${b}']`))]) {
    assert.ok(!/--on-accent/.test(rule), 'a `.dark` block must not redefine --on-accent');
  }
});

// ── Per-app brand themes ────────────────────────────────────────────────
// `[data-brand="<slug>"]` on <html> replaces the accent for one product while
// :root stays the OrangeCat/Loki orange. Every brand's pairings are pinned.

/**
 * The declarations of the first rule whose selector is exactly `selector`.
 * @param {string} selector
 * @returns {string}
 */
function block(selector) {
  const start = css.indexOf(`${selector} {`);
  assert.ok(start >= 0, `tokens.css has no \`${selector}\` rule`);
  return css.slice(start, css.indexOf('}', start));
}

function darkBlock() {
  return block('.dark');
}

/**
 * @param {string} selector
 * @param {string} name
 * @returns {string}
 */
function blockValue(selector, name) {
  const m = block(selector).match(new RegExp(`${name}\\s*:\\s*([^;]+);`));
  assert.ok(m, `${name} is not set in \`${selector}\``);
  return m[1].trim();
}

const BRANDS = ['solon'];
const WHITE = [255, 255, 255];
const LIGHT_PAGE = hslTripleToRgb('0 0% 97%');
const DARK_PAGE = hslTripleToRgb('0 0% 7%');
const UI_FLOOR = 3;

test('the page surfaces the brand ratios are measured on are the real ones', () => {
  const light = /--surface-page\s*:\s*([^;]+);/.exec(css);
  assert.equal(light && light[1].trim(), '0 0% 97%');
  const dark = /--surface-page\s*:\s*([^;]+);/.exec(darkBlock());
  assert.equal(dark && dark[1].trim(), '0 0% 7%');
});

test('Solon: the accent is #2f6fa0 and the default accent is still orange', () => {
  assert.equal(blockValue(`[data-brand='solon']`, '--public-accent'), '#2f6fa0');
  assert.equal(tokenValue('--public-accent'), '#ff5c00', 'the default must not change');
});

test('Solon: white on the accent clears AA (5.38:1)', () => {
  const accent = hexToRgb(blockValue(`[data-brand='solon']`, '--public-accent'));
  const r = ratio(WHITE, accent);
  assert.ok(r >= AA_NORMAL, `white on the Solon accent is ${r.toFixed(2)}:1, needs ${AA_NORMAL}`);
  assert.ok(r > 5.3 && r < 5.5, `expected about 5.38:1, got ${r.toFixed(2)}`);
});

test('Solon: --on-accent is white and clears AA on the accent', () => {
  const onAccent = blockValue(`[data-brand='solon']`, '--on-accent');
  assert.deepEqual(hslTripleToRgb(onAccent).map(Math.round), WHITE);
  const r = ratio(
    hslTripleToRgb(onAccent),
    hexToRgb(blockValue(`[data-brand='solon']`, '--public-accent')),
  );
  assert.ok(r >= AA_NORMAL, `the Solon label is ${r.toFixed(2)}:1`);
});

test('Solon: the accent is AA text on the light page and UI-grade on the dark page', () => {
  const accent = hexToRgb(blockValue(`[data-brand='solon']`, '--public-accent'));
  const onLight = ratio(accent, LIGHT_PAGE);
  const onDark = ratio(accent, DARK_PAGE);
  assert.ok(onLight >= AA_NORMAL, `accent on the light page is ${onLight.toFixed(2)}:1`);
  assert.ok(onDark >= UI_FLOOR, `accent on the dark page is ${onDark.toFixed(2)}:1`);
  // Pinned so nobody reads "it clears the UI floor" as "it is body text":
  // it is not 4.5:1 on the dark page, so running text keeps --accent-text.
  assert.ok(onDark < AA_NORMAL, `accent on the dark page is now ${onDark.toFixed(2)}:1`);
});

test('Solon: the hovers are pinned and keep white at AA', () => {
  const light = blockValue(`[data-brand='solon']`, '--accent-hover');
  const dark = blockValue(`.dark[data-brand='solon']`, '--accent-hover');
  assert.equal(light, '#285f8a');
  assert.equal(dark, '#3374a8');
  assert.ok(ratio(WHITE, hexToRgb(light)) >= AA_NORMAL);
  assert.ok(ratio(WHITE, hexToRgb(dark)) >= AA_NORMAL);
  // The dark hover is the lighter sibling, and it still stands off the dark page.
  assert.ok(
    luminance(hexToRgb(dark)) >
      luminance(hexToRgb(blockValue(`[data-brand='solon']`, '--public-accent'))),
  );
  assert.ok(ratio(hexToRgb(dark), DARK_PAGE) >= UI_FLOOR);
  // #3a84b8 is the line: white on it is 4.06:1.
  assert.ok(ratio(WHITE, hexToRgb('#3a84b8')) < AA_NORMAL);
});

test('Solon: its mark is drawn in the Solon accent', async () => {
  const { MARKS } = await import('../marks/index.mjs');
  assert.equal(
    String(MARKS.solon.iconInk).toLowerCase(),
    blockValue(`[data-brand='solon']`, '--public-accent'),
  );
});

test('the glow follows the active accent instead of hard-coding orange', () => {
  assert.ok(!/--public-glow-accent\s*:\s*rgb\(/.test(css), 'the glow must be derived');
  assert.match(css, /--public-glow-accent\s*:\s*color-mix\([^;]*var\(--public-accent\)/);
});

test('the map scale reads without colour: luminance rises at every step', () => {
  // Viridis is chosen because it survives every colour-vision deficiency, and
  // it does so because lightness alone orders it. A step swapped for a
  // "nicer" hue that breaks the order makes the map lie to a reader who cannot
  // tell hues apart.
  const steps = [1, 2, 3, 4, 5, 6, 7].map((i) =>
    luminance(hexToRgb(tokenValue(`--map-scale-${i}`))),
  );
  for (let i = 1; i < steps.length; i++) {
    assert.ok(
      steps[i] > steps[i - 1],
      `--map-scale-${i + 1} is not lighter than --map-scale-${i}; the scale must be monotone in luminance`,
    );
  }
});

test('the darkest map step stands off the dark page', () => {
  const dark = css.slice(css.indexOf('.dark {'));
  const match = /--surface-page\s*:\s*([^;]+);/.exec(dark);
  assert.ok(match, '--surface-page is not defined in the dark theme');
  const page = hslTripleToRgb(match[1].trim());
  const r = ratio(hexToRgb(tokenValue('--map-scale-1')), page);
  assert.ok(
    r >= 1.5,
    `--map-scale-1 is ${r.toFixed(2)}:1 on the dark page; an area would vanish into it`,
  );
});
