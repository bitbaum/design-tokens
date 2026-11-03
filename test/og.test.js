/**
 * The faces for generated images. A face that is not WOFF, or a coverage table
 * that claims a character the font lacks, would send next/og back to Google at
 * render time, which is what this module exists to stop.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
/** @returns {Promise<{ ogFonts: (...s: string[]) => Promise<{name: string, data: ArrayBuffer, weight: number, style: string}[]>, ogText: (t: string | null, ...s: string[]) => string }>} */
const og = () => import(path.join(root, 'og/index.mjs'));
/** @returns {Promise<{ FACES: Record<string, {family: string, weights: Record<string, {coverage: [number, number][]}>}>, LOADERS: Record<string, () => Promise<{default: string}>> }>} */
const generated = () => import(path.join(root, 'og/faces.generated.mjs'));
/** @returns {Promise<{ coverage: (ttf: Uint8Array) => [number, number][], toWoff: (ttf: Uint8Array) => Uint8Array, tables: (ttf: Uint8Array) => Record<string, {data: Uint8Array}> }>} */
const script = () => import(path.join(root, 'scripts/og-fetch-fonts.mjs'));

test('ogFonts() is Geist 400 as WOFF, the face next/og falls back to', async () => {
  const fonts = await (await og()).ogFonts();
  assert.deepEqual(
    fonts.map((f) => [f.name, f.weight, f.style]),
    [['Geist', 400, 'normal']],
  );
  assert.equal(Buffer.from(fonts[0].data).subarray(0, 4).toString('latin1'), 'wOFF');
});

test('every face loads, is WOFF, and has a licence beside the web faces', async () => {
  const { FACES, LOADERS } = await generated();
  for (const [slug, face] of Object.entries(FACES)) {
    assert.ok(fs.existsSync(path.join(root, 'fonts', slug, 'OFL.txt')), `${slug} has no OFL.txt`);
    for (const weight of Object.keys(face.weights)) {
      const { default: data } = await LOADERS[`${slug}-${weight}`]();
      const bytes = Buffer.from(data, 'base64');
      assert.equal(bytes.subarray(0, 4).toString('latin1'), 'wOFF', `${slug} ${weight}`);
      assert.equal(bytes.readUInt32BE(8), bytes.length, `${slug} ${weight}: WOFF length`);
    }
  }
  const { ogFonts } = await og();
  assert.deepEqual(
    (await ogFonts('inter:400,600')).map((f) => [f.name, f.weight]),
    [
      ['Inter', 400],
      ['Inter', 600],
    ],
  );
});

test('a face or weight the package lacks is an error, not a fetch', async () => {
  const { ogFonts } = await og();
  await assert.rejects(ogFonts('roboto'), /no face "roboto".*added to the package/);
  await assert.rejects(ogFonts('geist:900'), /Geist in 400, not 900/);
});

test('ogText keeps what the faces draw and drops what they do not', async () => {
  const { ogText } = await og();
  assert.equal(ogText('Zürich — Жизнь 2026'), 'Zürich — Жизнь 2026');
  assert.equal(ogText('Price ₿ 0.01 ✓ 🐾'), 'Price 0.01');
  assert.equal(ogText('Price ₿ ✓', 'inter'), 'Price ₿ ✓');
  assert.equal(ogText('a 👩‍👩‍👧 b'), 'a b');
  assert.equal(ogText('Hallo🐾 Welt'), 'Hallo Welt');
  assert.equal(ogText(null), '');
});

test('ogText leaves out a word missing a letter, never half of it', async () => {
  const { ogText } = await og();
  // Geist has λ (a maths symbol) and not the rest of the Greek alphabet.
  assert.equal(ogText('Athen Ελλάδα 2026'), 'Athen 2026');
  assert.equal(ogText('Athen Ελλάδα 2026', 'geist', 'inter:400'), 'Athen Ελλάδα 2026');
  assert.equal(ogText('東京 Tokyo'), 'Tokyo');
});

test('WOFF keeps every table; coverage reads format 4 the way the font does', async () => {
  const { coverage, toWoff, tables } = await script();
  const { default: data } = await (await generated()).LOADERS['geist-400']();
  const woff = Buffer.from(data, 'base64');
  const n = woff.readUInt16BE(12);
  const zlib = require('node:zlib');
  /** @type {Record<string, Buffer>} */
  const back = {};
  for (let i = 0; i < n; i++) {
    const at = 44 + 20 * i;
    const [off, comp, orig] = [
      woff.readUInt32BE(at + 4),
      woff.readUInt32BE(at + 8),
      woff.readUInt32BE(at + 12),
    ];
    const raw = woff.subarray(off, off + comp);
    back[woff.subarray(at, at + 4).toString('latin1')] = comp < orig ? zlib.inflateSync(raw) : raw;
  }
  assert.ok(back.cmap && back.glyf && back.head, 'core tables present');
  // Rebuild an sfnt holding only cmap and check coverage against the stored table.
  const cmap = back.cmap;
  const sfnt = Buffer.alloc(12 + 16 + cmap.length);
  sfnt.writeUInt32BE(0x00010000, 0);
  sfnt.writeUInt16BE(1, 4);
  sfnt.write('cmap', 12, 'latin1');
  sfnt.writeUInt32BE(28, 20);
  sfnt.writeUInt32BE(cmap.length, 24);
  cmap.copy(sfnt, 28);
  const { FACES } = await generated();
  assert.deepEqual(coverage(new Uint8Array(sfnt)), FACES.geist.weights['400'].coverage);
  assert.equal(Object.keys(tables(new Uint8Array(sfnt)))[0], 'cmap');
  assert.equal(
    toWoff(new Uint8Array(sfnt)).subarray(0, 4).toString(),
    'wOFF'
      .split('')
      .map((c) => c.charCodeAt(0))
      .join(','),
  );
});
