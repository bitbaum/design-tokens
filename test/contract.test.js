/**
 * The contract this package exists to keep.
 *
 * `tailwind-preset.js` says it in its own docstring: "Every value here resolves
 * to a var — never a literal. That is the whole point: retheming edits
 * tokens.css, and nothing in any app changes."
 *
 * Nothing enforced that. A preset entry naming `--surface-modal` while
 * tokens.css spells it `--surface-modal-bg` produces no error anywhere: the CSS
 * var is simply undefined, `hsl(var(--surface-modal) / 1)` is an invalid color,
 * and the utility silently renders as nothing in every consuming app. The
 * failure surfaces as "that panel looks wrong on FleetCrown", days later, in a
 * different repo.
 *
 * These tests are deliberately about the SEAM (preset <-> tokens.css <-> package
 * manifest), not about whether a particular colour is pretty. They are the
 * invariants that cannot be checked from inside any single file.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'tokens.css'), 'utf8');
const presetSource = fs.readFileSync(path.join(root, 'tailwind-preset.js'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

/**
 * Custom properties DEFINED anywhere in the given CSS (`--name:` on the left).
 * @param {string} source
 * @returns {Set<string>}
 */
function definedTokens(source) {
  const defined = new Set();
  for (const m of source.matchAll(/(^|[;{\s])(--[a-z0-9-]+)\s*:/gi)) defined.add(m[2]);
  return defined;
}

/**
 * Custom properties REFERENCED via `var(--name)`.
 * @param {string} source
 * @returns {Set<string>}
 */
function referencedTokens(source) {
  const referenced = new Set();
  for (const m of source.matchAll(/var\(\s*(--[a-z0-9-]+)/gi)) referenced.add(m[1]);
  return referenced;
}

test('every token the preset references is defined in tokens.css', () => {
  const defined = definedTokens(css);
  const referenced = referencedTokens(presetSource);

  assert.ok(referenced.size > 0, 'preset references no tokens at all — parser is wrong');

  const missing = [...referenced].filter((t) => !defined.has(t)).sort();
  assert.deepEqual(
    missing,
    [],
    `preset maps utilities onto tokens that tokens.css does not define:\n  ${missing.join('\n  ')}`,
  );
});

test('the preset contains no literal colour values', () => {
  // The stated rule: values resolve to vars, never literals. A hex or rgb()
  // here is a second source of truth that retheming cannot reach.
  const offenders = presetSource
    .split('\n')
    .map((text, i) => ({ line: i + 1, text }))
    // Strip comments — the docstring legitimately talks about literals.
    .filter(({ text }) => !/^\s*(\/\/|\*|\/\*)/.test(text))
    .filter(({ text }) => /#[0-9a-f]{3,8}\b|\brgba?\(|\bhsla\(/i.test(text))
    .map(({ line, text }) => `${line}: ${text.trim()}`);

  assert.deepEqual(offenders, [], `literal colour(s) in the preset:\n  ${offenders.join('\n  ')}`);
});

test('the preset is requireable and has the shape Tailwind expects', () => {
  const preset = require(path.join(root, 'tailwind-preset.js'));
  assert.ok(preset.theme, 'preset must expose `theme`');
  assert.ok(preset.theme.extend, 'preset must use `theme.extend`, not replace the theme');
  assert.ok(
    Object.keys(preset.theme.extend).length > 0,
    'preset extends nothing — it would be a no-op for every consumer',
  );
});

test('every path the manifest advertises actually exists', () => {
  // A published package is its `files` + `exports`, not its working tree. A
  // path that is listed but absent ships a package that breaks on the
  // consumer's `npm install`, long after CI here went green.
  for (const entry of pkg.files ?? []) {
    assert.ok(
      fs.existsSync(path.join(root, entry)),
      `\`files\` lists "${entry}" but it is missing`,
    );
  }
  for (const [name, target] of Object.entries(pkg.exports ?? {})) {
    if (typeof target !== 'string') continue;
    if (target.includes('*')) {
      // Wildcard export: assert the directory it points into exists.
      const dir = target.split('*')[0];
      assert.ok(
        fs.existsSync(path.join(root, dir)),
        `export "${name}" points into missing "${dir}"`,
      );
      continue;
    }
    assert.ok(fs.existsSync(path.join(root, target)), `export "${name}" -> missing "${target}"`);
  }
});

test('every font the CSS asks the browser to download is shipped', () => {
  // An @font-face src url(...) that resolves inside this package must exist,
  // or consumers get a 404 and a silent fallback face.
  const urls = [...css.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)].map((m) => m[1]);
  const local = urls.filter((u) => !/^(https?:)?\/\//.test(u) && !u.startsWith('data:'));
  assert.ok(local.length > 0, 'no local font urls found — parser is wrong');

  const missing = [
    ...new Set(
      local
        .map((u) => u.replace(/^\.?\//, '').split('?')[0])
        .filter((rel) => !fs.existsSync(path.join(root, rel))),
    ),
  ].sort();
  assert.deepEqual(
    missing,
    [],
    `tokens.css requests font files that are not in the package:\n  ${missing.join('\n  ')}`,
  );
});

test('.dark overrides tokens rather than introducing new ones', () => {
  // v1.0.0 made `:root` the light theme and `.dark` an override layer. A token
  // that exists ONLY under .dark is undefined in light mode — the exact class
  // of bug that renders as "invisible text in light theme".
  // Anchor on the SELECTOR, not the bare string: tokens.css discusses `:root`
  // and `.dark` in a comment long before it declares them, and matching the
  // prose truncates the :root block to a fraction of its tokens — which then
  // reports ~40 false "dark-only" tokens. Found the hard way.
  const rootStart = css.search(/^:root\s*\{/m);
  const darkStart = css.search(/^\.dark\s*\{/m);
  assert.ok(rootStart !== -1, 'no `:root {` block found in tokens.css');
  assert.ok(darkStart > rootStart, 'expected the `:root {` block before `.dark {`');

  const inRoot = definedTokens(css.slice(rootStart, darkStart));
  const inDark = definedTokens(css.slice(darkStart, css.indexOf('}', darkStart)));
  assert.ok(inRoot.size > 0 && inDark.size > 0, 'failed to parse :root / .dark — parser is wrong');

  const darkOnly = [...inDark].filter((t) => !inRoot.has(t)).sort();
  assert.deepEqual(
    darkOnly,
    [],
    `token(s) defined only under .dark, so they are undefined in light mode:\n  ${darkOnly.join('\n  ')}`,
  );
});
