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

test('--on-accent is one literal for the orange default and is never redefined in `.dark`', () => {
  // The default accent is theme-independent, so its label must be too. A label
  // that inverted with the theme would be unreadable in one of them. (A brand
  // theme may instead derive both from the theme's own ink and paper, below.)
  assert.match(tokenValue('--on-accent'), /^\d+ \d+% \d+%$/, 'the default label is an HSL triple');
  assert.ok(!/--on-accent/.test(darkBlock()), 'a `.dark` block must not redefine --on-accent');
});

// ── The text ramp people read ───────────────────────────────────────────
// Secondary and tertiary text carry dates, counts, hints and captions in every
// product. Tertiary sat at 2.8:1 on the light page and 3.6:1 on the dark
// raised surface (measured on orangecat.ch, 2026-11-12). Muted is left out on
// purpose: it is for disabled and decorative text, which AA exempts.

/**
 * A token's value inside the `.dark` block.
 * @param {string} name
 * @returns {string}
 */
function darkValue(name) {
  const m = darkBlock().match(new RegExp(`${name}\\s*:\\s*([^;]+);`));
  assert.ok(m, `${name} is not defined in .dark`);
  return m[1].trim();
}

for (const text of ['--text-secondary', '--text-tertiary']) {
  // Overlay too: menus, popovers and sheets put the same small text on it.
  for (const surface of [
    '--surface-page',
    '--surface-base',
    '--surface-raised',
    '--surface-overlay',
  ]) {
    test(`${text} clears AA on ${surface}, light and dark`, () => {
      const light = ratio(hslTripleToRgb(tokenValue(text)), hslTripleToRgb(tokenValue(surface)));
      const dark = ratio(hslTripleToRgb(darkValue(text)), hslTripleToRgb(darkValue(surface)));
      assert.ok(light >= AA_NORMAL, `light ${text} on ${surface} is ${light.toFixed(2)}:1`);
      assert.ok(dark >= AA_NORMAL, `dark ${text} on ${surface} is ${dark.toFixed(2)}:1`);
    });
  }
}

test('Bitcoin-orange TEXT clears AA on page, base and raised, light and dark', () => {
  // --bitcoin-orange is 2.29:1 on white: BTC amounts on light cards were
  // unreadable (orangecat.ch, 2026-11-12). Text takes --bitcoin-orange-text.
  const lightText = hexToRgb(tokenValue('--bitcoin-orange-text'));
  const darkText = hexToRgb(tokenValue('--bitcoin-orange')); // .dark points it here
  assert.match(darkValue('--bitcoin-orange-text'), /var\(--bitcoin-orange\)/);
  for (const surface of ['--surface-page', '--surface-base', '--surface-raised']) {
    const light = ratio(lightText, hslTripleToRgb(tokenValue(surface)));
    const dark = ratio(darkText, hslTripleToRgb(darkValue(surface)));
    assert.ok(light >= AA_NORMAL, `light Bitcoin text on ${surface} is ${light.toFixed(2)}:1`);
    assert.ok(dark >= AA_NORMAL, `dark Bitcoin text on ${surface} is ${dark.toFixed(2)}:1`);
  }
});

test('light --status-positive text clears AA on page, base and raised', () => {
  for (const surface of ['--surface-page', '--surface-base', '--surface-raised']) {
    const r = ratio(
      hslTripleToRgb(tokenValue('--status-positive')),
      hslTripleToRgb(tokenValue(surface)),
    );
    assert.ok(r >= AA_NORMAL, `positive on ${surface} is ${r.toFixed(2)}:1`);
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

const SOLON = `[data-brand='solon']`;
const SOLON_DARK = `.dark[data-brand='solon']`;

/**
 * Solon's resolved pairings in one theme. Its accent and label are the theme's
 * own ink and paper (--text-primary, --text-inverted), so they are read from
 * the theme's text tokens, exactly as the cascade resolves them.
 * @param {'light' | 'dark'} theme
 */
function solon(theme) {
  const scope = (/** @type {string} */ name) =>
    theme === 'dark' ? blockValue('.dark', name) : tokenValue(name);
  return {
    accent: hslTripleToRgb(scope('--text-primary')),
    label: hslTripleToRgb(scope('--text-inverted')),
    page: hslTripleToRgb(scope('--surface-page')),
    hover: hexToRgb(blockValue(theme === 'dark' ? SOLON_DARK : SOLON, '--accent-hover')),
  };
}

test('the default accent is still OrangeCat and Loki orange', () => {
  assert.equal(tokenValue('--public-accent'), '#ff5c00', 'the default must not change');
});

test("Solon: the accent and its label are the theme's own ink and paper", () => {
  assert.equal(blockValue(SOLON, '--public-accent'), 'hsl(var(--text-primary))');
  assert.equal(blockValue(SOLON, '--on-accent'), 'var(--text-inverted)');
  assert.ok(!/--public-accent|--on-accent/.test(block(SOLON_DARK)), 'derived, so no dark copy');
});

for (const theme of /** @type {const} */ (['light', 'dark'])) {
  test(`Solon ${theme}: the accent is AA text on the page, and the label is AA on the accent`, () => {
    const { accent, label, page } = solon(theme);
    const onPage = ratio(accent, page);
    const labelOnAccent = ratio(label, accent);
    assert.ok(onPage >= AA_NORMAL, `accent on the ${theme} page is ${onPage.toFixed(2)}:1`);
    assert.ok(labelOnAccent >= AA_NORMAL, `label on the accent is ${labelOnAccent.toFixed(2)}:1`);
    // Measured when the theme was chosen: about 16:1 light, 15.7:1 dark.
    assert.ok(onPage > 15, `expected about 16:1, got ${onPage.toFixed(2)}`);
  });

  test(`Solon ${theme}: the hover is pinned, steps toward the page and keeps the label at AA`, () => {
    const { accent, label, page, hover } = solon(theme);
    assert.equal(
      blockValue(theme === 'dark' ? SOLON_DARK : SOLON, '--accent-hover'),
      theme === 'dark' ? '#d4d4d4' : '#333333',
    );
    assert.ok(ratio(label, hover) >= AA_NORMAL, `label on the hover is ${ratio(label, hover)}`);
    assert.ok(
      Math.abs(luminance(hover) - luminance(page)) < Math.abs(luminance(accent) - luminance(page)),
      'the hover must sit between the accent and the page',
    );
  });
}

test("Solon: its mark is the authorised owl, drawn in the fleet's near-white ink", async () => {
  const { MARKS } = await import('../marks/index.mjs');
  const mark = MARKS.solon;
  // One filled evenodd shape. This is the drawing that was authorised; change
  // it deliberately (and update this) rather than by accident.
  assert.equal(mark.shapes.length, 1);
  assert.equal(mark.shapes[0].fillRule, 'evenodd');
  assert.ok(mark.shapes[0].d.startsWith('M93.35 44.93 L92.93 42.94'));
  assert.equal(
    mark.iconInk,
    undefined,
    'monochrome: the default icon ink, not a colour of its own',
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
