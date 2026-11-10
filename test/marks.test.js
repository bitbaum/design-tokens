/**
 * The fleet's marks. A product draws its logo from these, so a mark that
 * cannot be drawn, or a registry that has lost a file, breaks every product
 * at once: these are the checks that stop it here.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
/** @returns {Promise<any>} */
const marks = () => import(path.join(root, 'marks/index.mjs'));
/** @returns {Promise<any>} */
const importer = () => import(path.join(root, 'scripts/marks-import.mjs'));

const PATH_DATA = /^[MmLlHhVvCcSsQqTtAaZz0-9eE\s,.+-]+$/;

test('the package exports ./marks', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  assert.equal(pkg.exports['./marks'].default, './marks/index.mjs');
  assert.ok(pkg.files.includes('marks'));
});

test('every mark file is in the registry, under its own slug', async () => {
  const { MARKS } = await marks();
  const files = fs
    .readdirSync(path.join(root, 'marks'))
    .filter(
      (f) =>
        f.endsWith('.mjs') &&
        !['index.mjs', 'registry.mjs', 'svg.mjs', 'svg-to-mark.mjs'].includes(f),
    )
    .map((f) => f.slice(0, -4))
    .sort();
  assert.deepEqual(Object.keys(MARKS).sort(), files);
  for (const [slug, mark] of Object.entries(MARKS)) assert.equal(mark.slug, slug);
  const { registrySource } = await importer();
  assert.match(registrySource(files), /export const MARKS/);
});

test('every mark can be drawn', async () => {
  const { MARKS } = await marks();
  for (const mark of Object.values(MARKS)) {
    assert.equal(mark.viewBox.length, 4, mark.slug);
    assert.ok(mark.viewBox.every(Number.isFinite), mark.slug);
    assert.ok(mark.shapes.length > 0, mark.slug);
    assert.ok(['draw', 'spin', 'turn', 'none'].includes(mark.motion), mark.slug);
    for (const shape of mark.shapes) {
      assert.match(shape.d, PATH_DATA, mark.slug);
      assert.ok(shape.paint === 'fill' || shape.paint === 'stroke', mark.slug);
    }
  }
});

test('markSvg and iconSvg write every shape, in the colour asked', async () => {
  const { MARKS, markSvg, iconSvg, ICON_STYLE } = await marks();
  for (const mark of Object.values(MARKS)) {
    const svg = markSvg(mark, { size: 32, color: '#123456' });
    assert.match(svg, /^<svg xmlns="http:\/\/www.w3.org\/2000\/svg" width="32" height="32"/);
    assert.equal(svg.split('<path ').length - 1, mark.shapes.length, mark.slug);
    assert.ok(!svg.includes('currentColor'), mark.slug);
    const icon = iconSvg(mark);
    assert.ok(icon.includes(`fill="${ICON_STYLE.canvas}"`), mark.slug);
    assert.ok(icon.includes(mark.iconInk ?? ICON_STYLE.ink), mark.slug);
  }
});

test('a mark drawn and imported again is the same mark', async () => {
  const { MARKS, markSvg, svgToMark } = await marks();
  for (const mark of Object.values(MARKS)) {
    const back = svgToMark(markSvg(mark));
    assert.deepEqual(
      back.shapes.map((/** @type {{d: string}} */ s) => s.d),
      mark.shapes.map((/** @type {{d: string}} */ s) => s.d),
      mark.slug,
    );
  }
});

test('markFor answers null for a product with no mark', async () => {
  const { markFor, MARKS } = await marks();
  assert.equal(markFor('nobody'), null);
  assert.equal(markFor('toString'), null);
  assert.equal(markFor('solon'), MARKS.solon);
});

test('the importer refuses what it cannot convert faithfully', async () => {
  const { svgToMark, MarkImportError } = await marks();
  assert.throws(
    () =>
      svgToMark('<svg viewBox="0 0 10 10"><g transform="scale(2)"><path d="M0 0h5v5z"/></g></svg>'),
    MarkImportError,
  );
});
