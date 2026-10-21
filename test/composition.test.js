/**
 * Cross-brand grammar contracts: any product can opt in without changing its
 * palette, typefaces, body styling or existing selectors.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'composition.css'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

test('opt-in composition stylesheet is shipped and exported as a subpath', () => {
  assert.equal(pkg.exports['./composition.css'], './composition.css');
  assert.ok(pkg.files.includes('composition.css'));
});

test('global document and brand selectors are not modified', () => {
  // Strip comments before matching selectors: docs are allowed to discuss
  // what the stylesheet intentionally does not change.
  const plain = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const selectors = [...plain.matchAll(/([^{}]+)\{/g)]
    .map((m) => m[1].trim())
    .filter((s) => s && !s.startsWith('@'));
  for (const selector of selectors) {
    if (selector.includes('@media')) continue;
    assert.ok(
      /\.bb-/.test(selector),
      'selector must be namespaced or composed entirely from bb classes: ' + selector,
    );
    assert.doesNotMatch(
      selector,
      /(^|[,\s])(?:html|body|:root|a|button|input)(?=[\s,{:#.>]|$)/,
      'unexpected global or element styling: ' + selector,
    );
  }
  assert.doesNotMatch(plain, /(^|\n)\s*(?:html|body|:root)\s*\{/m);
});

test('controls and choice cells guarantee accessible minimum sizes', () => {
  assert.match(css, /:where\(\.bb-control\)[\s\S]*?min-block-size:\s*44px/);
  assert.match(css, /:where\(\.bb-button\)[\s\S]*?min-block-size:\s*44px/);
  assert.match(css, /:where\(\.bb-choice-row > \*\)[\s\S]*?min-height:\s*44px/);
  assert.match(css, /\.bb-button:focus-visible/);
  assert.match(css, /:where\(\.bb-skip:focus\)/);
});

test('composition contracts do not prescribe another brand or a color palette', () => {
  const plain = css.replace(/\/\*[\s\S]*?\*\//g, '');
  assert.doesNotMatch(plain, /#[0-9a-f]{3,8}\b|\brgba?\(|\bhsla?\(/i);
  assert.doesNotMatch(plain, /font-family\s*:/);
  assert.match(plain, /--bb-action-bg/);
  assert.match(plain, /--bb-action-fg/);
});

test('phone layout avoids wrapping orphan controls and honours motion preference', () => {
  assert.match(css, /grid-template-columns:\s*repeat\(var\(--bb-choices, 2\), minmax\(0, 1fr\)\)/);
  assert.match(css, /@media \(max-width: 640px\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
});
