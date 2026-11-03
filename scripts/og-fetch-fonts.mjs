// Writes og/: the faces for generated images (next/og's ImageResponse, i.e.
// opengraph-image, twitter-image, icon), from Google Fonts, once, by a person.
//
//   node scripts/og-fetch-fonts.mjs
//
// The image renderer (satori) reads TTF, OTF and WOFF, not WOFF2, and draws a
// variable font at its default instance, so these are static instances, one
// file per weight, asked for with the user agent next/og itself sends when it
// fetches a font ("Make sure it returns TTF"). Each is stored as WOFF (the TTF,
// table by table through zlib; satori inflates it) inside a JS module as
// base64, so an image route on any runtime and any bundler can import it: no
// file system, no URL, no network.
//
// Each face also records the code points it covers. Satori asks Google (and
// jsdelivr, for emoji) for any character no given font covers; ogText() uses
// this to drop such characters before they reach it.
import { deflateSync } from 'node:zlib';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OG = join(ROOT, 'og');

// next 16.4 dist/compiled/@vercel/og/index.node.js, loadGoogleFont.
const UA =
  'Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_6_8; de-at) AppleWebKit/533.21.1 ' +
  '(KHTML, like Gecko) Version/5.0.5 Safari/533.21.1';

// What the fleet's images draw with. Geist 400 is the face next/og falls back
// to when it is given none (its bundled Geist-Regular.ttf, the same version),
// so an app that passes ogFonts() draws exactly what it drew before. Add a
// face here, run this, release: a face it lacks is added, never fetched.
export const OG_FACES = [
  { slug: 'geist', family: 'Geist', weights: [400] },
  { slug: 'inter', family: 'Inter', weights: [400, 600] },
];

async function get(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res;
}

/** The sfnt's tables, by tag. */
export function tables(ttf) {
  const v = new DataView(ttf.buffer, ttf.byteOffset, ttf.byteLength);
  const out = {};
  for (let i = 0, n = v.getUint16(4); i < n; i++) {
    const at = 12 + i * 16;
    const tag = String.fromCharCode(...ttf.subarray(at, at + 4));
    out[tag] = {
      checksum: v.getUint32(at + 4),
      data: ttf.subarray(v.getUint32(at + 8), v.getUint32(at + 8) + v.getUint32(at + 12)),
    };
  }
  return out;
}

/** WOFF 1.0 (W3C): the same tables, each zlib-compressed when that is smaller. */
export function toWoff(ttf) {
  const t = tables(ttf);
  const tags = Object.keys(t).sort();
  const pad = (n) => (n + 3) & ~3;
  const entries = tags.map((tag) => {
    const orig = t[tag].data;
    const z = deflateSync(orig, { level: 9 });
    return { tag, orig, comp: z.length < orig.length ? z : orig, checksum: t[tag].checksum };
  });
  let offset = 44 + 20 * entries.length;
  const total = entries.reduce((n, e) => n + pad(e.comp.length), offset);
  const out = new Uint8Array(total);
  const v = new DataView(out.buffer);
  const sfntSize = 12 + 16 * entries.length + entries.reduce((n, e) => n + pad(e.orig.length), 0);
  out.set([0x77, 0x4f, 0x46, 0x46]); // wOFF
  v.setUint32(4, new DataView(ttf.buffer, ttf.byteOffset).getUint32(0)); // flavor
  v.setUint32(8, total);
  v.setUint16(12, entries.length);
  v.setUint32(16, sfntSize);
  entries.forEach((e, i) => {
    const at = 44 + 20 * i;
    out.set(
      [...e.tag].map((c) => c.charCodeAt(0)),
      at,
    );
    v.setUint32(at + 4, offset);
    v.setUint32(at + 8, e.comp.length);
    v.setUint32(at + 12, e.orig.length);
    v.setUint32(at + 16, e.checksum);
    out.set(e.comp, offset);
    offset += pad(e.comp.length);
  });
  return out;
}

/** Code points the font maps to a glyph, as [first, last] ranges (cmap 3/10 or 3/1). */
export function coverage(ttf) {
  const cmap = tables(ttf).cmap.data;
  const v = new DataView(cmap.buffer, cmap.byteOffset, cmap.byteLength);
  const subtables = [];
  for (let i = 0, n = v.getUint16(2); i < n; i++)
    subtables.push({
      p: v.getUint16(4 + i * 8),
      e: v.getUint16(6 + i * 8),
      off: v.getUint32(8 + i * 8),
    });
  const pick =
    subtables.find((s) => s.p === 3 && s.e === 10) ?? subtables.find((s) => s.p === 3 && s.e === 1);
  if (!pick) throw new Error('no Unicode cmap');
  const o = pick.off;
  const points = [];
  const format = v.getUint16(o);
  if (format === 12) {
    for (let i = 0, n = v.getUint32(o + 12); i < n; i++) {
      const g = o + 16 + i * 12;
      const [start, end, glyph] = [v.getUint32(g), v.getUint32(g + 4), v.getUint32(g + 8)];
      for (let c = start; c <= end; c++) if (glyph + (c - start) !== 0) points.push(c);
    }
  } else if (format === 4) {
    const segs = v.getUint16(o + 6) / 2;
    const ends = o + 14,
      starts = ends + segs * 2 + 2,
      deltas = starts + segs * 2,
      ranges = deltas + segs * 2;
    for (let s = 0; s < segs; s++) {
      const end = v.getUint16(ends + s * 2),
        start = v.getUint16(starts + s * 2);
      const delta = v.getInt16(deltas + s * 2),
        rangeOffset = v.getUint16(ranges + s * 2);
      for (let c = start; c <= end && c !== 0xffff; c++) {
        let glyph;
        if (rangeOffset === 0) glyph = (c + delta) & 0xffff;
        else {
          const at = ranges + s * 2 + rangeOffset + (c - start) * 2;
          glyph = v.getUint16(at);
          if (glyph !== 0) glyph = (glyph + delta) & 0xffff;
        }
        if (glyph !== 0) points.push(c);
      }
    }
  } else throw new Error(`cmap format ${format}`);
  points.sort((a, b) => a - b);
  const out = [];
  for (const c of points) {
    const last = out[out.length - 1];
    if (last && c <= last[1] + 1) last[1] = Math.max(last[1], c);
    else out.push([c, c]);
  }
  return out;
}

async function main() {
  rmSync(join(OG, 'faces'), { recursive: true, force: true });
  mkdirSync(join(OG, 'faces'), { recursive: true });
  const manifest = {};
  for (const face of OG_FACES) {
    const query = `${face.family.replace(/ /g, '+')}:wght@${face.weights.join(';')}`;
    const css = await (await get(`https://fonts.googleapis.com/css2?family=${query}`)).text();
    const blocks = [
      ...css.matchAll(/font-weight: (\d+);[^}]*src: url\(([^)]+)\) format\('truetype'\)/g),
    ];
    if (blocks.length !== face.weights.length)
      throw new Error(`${face.family}: ${blocks.length} TTFs`);
    manifest[face.slug] = { family: face.family, weights: {} };
    for (const [, weight, url] of blocks) {
      const ttf = new Uint8Array(await (await get(url)).arrayBuffer());
      if (new DataView(ttf.buffer).getUint32(0) !== 0x00010000)
        throw new Error(`${url} is not TrueType`);
      if (tables(ttf).fvar) throw new Error(`${url} is variable`);
      const woff = toWoff(ttf);
      const file = `faces/${face.slug}-${weight}.mjs`;
      writeFileSync(
        join(OG, file),
        `// ${face.family} ${weight}, static, WOFF, base64. Generated by scripts/og-fetch-fonts.mjs\n` +
          `// from ${url} — SIL Open Font License, fonts/${face.slug}/OFL.txt.\n` +
          `export default ${JSON.stringify(Buffer.from(woff).toString('base64'))};\n`,
      );
      manifest[face.slug].weights[weight] = { file, bytes: woff.length, coverage: coverage(ttf) };
      console.log(`${face.family} ${weight}: ${ttf.length} → ${woff.length} bytes`);
    }
  }
  const loaders = Object.entries(manifest)
    .flatMap(([slug, f]) =>
      Object.keys(f.weights).map(
        (w) => `  '${slug}-${w}': () => import('./faces/${slug}-${w}.mjs'),`,
      ),
    )
    .join('\n');
  writeFileSync(
    join(OG, 'faces.generated.mjs'),
    `// Generated by scripts/og-fetch-fonts.mjs. Do not edit; run it.\n` +
      `export const FACES = ${JSON.stringify(
        Object.fromEntries(
          Object.entries(manifest).map(([slug, f]) => [
            slug,
            {
              family: f.family,
              weights: Object.fromEntries(
                Object.entries(f.weights).map(([w, x]) => [w, { coverage: x.coverage }]),
              ),
            },
          ]),
        ),
      )};\n\n` +
      `// One literal import per file, so a bundler emits each face as its own chunk\n` +
      `// and an image route loads only the faces it asks for.\n` +
      `export const LOADERS = {\n${loaders}\n};\n`,
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
