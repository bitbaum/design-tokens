/**
 * The faces apps load with next/font/local, and the command that writes those
 * calls for them.
 *
 * A truncated download or an HTML error page saved as .woff2 would still be
 * committed, published and built against; the browser would then fall back to
 * Arial on every page of every app that loads it, with no error anywhere. And a
 * face shipped without its licence is a face we may not redistribute.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const root = path.join(__dirname, '..');
const fonts = path.join(root, 'fonts');
/** @type {Record<string, {family: string, category: string, licence: string, variable: boolean, files: {file: string, subset: string, style: string, weight: string, unicodeRange: string, sha256: string}[]}>} */
const faces = JSON.parse(fs.readFileSync(path.join(fonts, 'faces.json'), 'utf8'));
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

/**
 * @typedef {{ file: string, weight: string, style: string }} Src
 * @typedef {{ name: string, primary: boolean, preload: boolean, family: string,
 *   variable?: string, adjustFontFallback?: string | false, src: Src[] }} Call
 * @returns {Promise<{ calls: (spec: object) => Call[], parseSpec: (text: string) => object,
 *   render: (out: string, specs: object[], argv: string[]) => string }>}
 */
const generator = () => import(path.join(root, 'next-fonts.mjs'));

test('every face in faces.json is a woff2 file matching its recorded hash, beside its licence', () => {
  for (const [slug, face] of Object.entries(faces)) {
    assert.ok(face.files.length > 0, `${slug} lists no files`);
    assert.ok(fs.existsSync(path.join(fonts, face.licence)), `${slug}: ${face.licence} is missing`);
    assert.match(fs.readFileSync(path.join(fonts, face.licence), 'utf8'), /SIL OPEN FONT LICENSE/i);
    for (const f of face.files) {
      const bytes = fs.readFileSync(path.join(fonts, f.file));
      assert.equal(bytes.subarray(0, 4).toString('latin1'), 'wOF2', `${f.file} is not woff2`);
      assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), f.sha256, f.file);
      assert.match(f.unicodeRange, /^U\+[0-9A-F]/, `${f.file} has no unicode-range`);
    }
  }
});

test('every face ships a latin subset, so the export a layout reads can be preloaded', () => {
  for (const [slug, face] of Object.entries(faces))
    assert.ok(
      face.files.some((f) => f.subset === 'latin'),
      `${slug} has no latin subset`,
    );
});

test('the package publishes the generator and the faces', () => {
  assert.ok(pkg.files.includes('next-fonts.mjs'));
  assert.ok(pkg.files.includes('fonts'));
  assert.equal(pkg.bin['design-tokens-next-fonts'], './next-fonts.mjs');
});

test('the faces tokens.css loads are still where it loads them from', () => {
  const css = fs.readFileSync(path.join(root, 'tokens.css'), 'utf8');
  for (const [, file] of css.matchAll(/url\(\.\/fonts\/([^)]+)\)/g))
    assert.ok(fs.existsSync(path.join(fonts, file)), `tokens.css loads ${file}, which is gone`);
});

test('one call per subset, in Google order, the export carrying the variable', async () => {
  const { calls, parseSpec } = await generator();
  const out = calls(parseSpec('display=space-grotesk;weight=500,700;variable=--font-display'));
  assert.deepEqual(
    out.map((c) => c.name),
    ['displayVietnamese', 'displayLatinExt', 'display'],
  );
  const [primary] = out.filter((c) => c.primary);
  assert.equal(primary.variable, '--font-display');
  assert.equal(primary.preload, true);
  assert.deepEqual(
    primary.src.map((s) => s.weight),
    ['500', '700'],
  );
  for (const c of out.filter((c) => !c.primary)) {
    assert.equal(c.preload, false);
    assert.equal(c.adjustFontFallback, false);
    assert.equal(c.family, 'display');
  }
});

test('a serif face measures its fallback against Times New Roman, as next/font/google does', async () => {
  const { calls, parseSpec } = await generator();
  const [primary] = calls(parseSpec('cormorant=cormorant-garamond;style=normal,italic')).filter(
    (c) => c.primary,
  );
  assert.equal(primary.adjustFontFallback, 'Times New Roman');
  assert.deepEqual([...new Set(primary.src.map((s) => s.style))], ['normal', 'italic']);
});

test('a static face declares one file per weight and refuses a weight it does not ship', async () => {
  const { calls, parseSpec } = await generator();
  const [primary] = calls(parseSpec('mono=ibm-plex-mono;weight=400,600')).filter((c) => c.primary);
  assert.deepEqual(
    primary.src.map((s) => s.file),
    ['ibm-plex-mono/ibm-plex-mono-400-latin.woff2', 'ibm-plex-mono/ibm-plex-mono-600-latin.woff2'],
  );
  assert.throws(() => calls(parseSpec('mono=ibm-plex-mono;weight=300')), /no normal 300/);
});

test('the export name becomes the family, so a CSS generic name is refused', async () => {
  const { parseSpec } = await generator();
  assert.throws(() => parseSpec('serif=fraunces'), /CSS keyword/);
  assert.throws(() => parseSpec('body=comic-sans'), /no face/);
  assert.throws(() => parseSpec('body=inter;colour=red'), /unknown key/);
});

test('render points at node_modules/@bitbaum/design-tokens from the output file, never at a realpath', async () => {
  const { render, parseSpec } = await generator();
  const app = fs.mkdtempSync(path.join(os.tmpdir(), 'dt-app-'));
  const installed = path.join(app, 'node_modules', '@bitbaum', 'design-tokens');
  fs.mkdirSync(installed, { recursive: true });
  fs.writeFileSync(path.join(installed, 'package.json'), '{}');
  fs.mkdirSync(path.join(app, 'src', 'app'), { recursive: true });
  const out = path.join(app, 'src', 'app', 'fonts.ts');
  const code = render(out, [parseSpec('sans=inter;variable=--font-inter')], [out]);
  assert.match(code, /from "next\/font\/local"/);
  assert.match(
    code,
    /"\.\.\/\.\.\/node_modules\/@bitbaum\/design-tokens\/fonts\/inter\/inter-latin\.woff2"/,
  );
  assert.doesNotMatch(code, /next\/font\/google/);
  fs.rmSync(app, { recursive: true, force: true });
});
