#!/usr/bin/env node
// Maintainer tool: download the faces in FACES from Google Fonts into fonts/,
// with their licences, and write fonts/faces.json.
//
//   node scripts/fetch-fonts.mjs
//
// Apps must never fetch fonts at build time (a failed request to Google Fonts
// fails a `next/font/google` build), so the files are committed here and apps
// load them with `next/font/local`. This script is how they got here, and how
// they are refreshed: it asks Google exactly what `next/font/google` asks
// (same user agent, so the same woff2 files and the same unicode-range split)
// and records every file with the range Google serves it under. Nothing in a
// build or a test runs it.
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FONTS = join(ROOT, 'fonts');

// The user agent `next/font/google` sends (next 16.4, fetch-resource.js). The
// file format Google returns depends on it.
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36';

// What Google serves a current Chrome on Windows or Linux: the same faces
// with TrueType hinting kept (a `prep` program), which those platforms use to
// fit stems to the pixel grid. next/font/google asks as a Mac, so it got the
// unhinted files above; a site that downloaded its faces from a browser
// (OrangeCat's src/fonts, until 2026-11) has these. They draw differently on
// Windows and Linux, so both are shipped and an app keeps the ones it had.
const HINTED_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// One entry per family. `axes` is the css2 query. A variable family is asked
// for its whole weight axis, and only that axis (plus ital): that is what
// `next/font/google` asks for, and Google serves the same file for a list of
// weights as for the range. `licence` is the family's directory in
// github.com/google/fonts.
export const FACES = [
  { slug: 'inter', family: 'Inter', axes: 'wght@100..900', licence: 'ofl/inter' },
  {
    slug: 'space-grotesk',
    family: 'Space Grotesk',
    axes: 'wght@300..700',
    licence: 'ofl/spacegrotesk',
  },
  {
    slug: 'ibm-plex-mono',
    family: 'IBM Plex Mono',
    axes: 'wght@400;500;600',
    licence: 'ofl/ibmplexmono',
    static: true,
  },
  {
    slug: 'fraunces',
    family: 'Fraunces',
    axes: 'ital,wght@0,100..900;1,100..900',
    licence: 'ofl/fraunces',
    category: 'serif',
  },
  {
    slug: 'cormorant-garamond',
    family: 'Cormorant Garamond',
    axes: 'ital,wght@0,300..700;1,300..700',
    licence: 'ofl/cormorantgaramond',
    category: 'serif',
  },
  { slug: 'dm-sans', family: 'DM Sans', axes: 'wght@100..1000', licence: 'ofl/dmsans' },
  { slug: 'geist', family: 'Geist', axes: 'wght@100..900', licence: 'ofl/geist' },
  { slug: 'geist-mono', family: 'Geist Mono', axes: 'wght@100..900', licence: 'ofl/geistmono' },
  {
    slug: 'jetbrains-mono',
    family: 'JetBrains Mono',
    axes: 'wght@100..800',
    licence: 'ofl/jetbrainsmono',
  },
  { slug: 'montserrat', family: 'Montserrat', axes: 'wght@100..900', licence: 'ofl/montserrat' },
];

async function get(url, ua = UA) {
  const res = await fetch(url, { headers: { 'User-Agent': ua } });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res;
}

/** The @font-face blocks of a css2 response, with the subset comment Google puts before each. */
export function parseCss(css) {
  return [...css.matchAll(/\/\* ([\w-]+) \*\/\s*@font-face \{([^}]*)\}/g)].map(
    ([, subset, body]) => ({
      subset,
      style: /font-style: (\w+);/.exec(body)[1],
      weight: /font-weight: ([\d ]+);/.exec(body)[1],
      url: /src: url\(([^)]+)\)/.exec(body)[1],
      unicodeRange: /unicode-range: ([^;]+);/.exec(body)[1],
    }),
  );
}

async function main() {
  const manifest = {};
  for (const face of FACES) {
    const dir = join(FONTS, face.slug);
    mkdirSync(dir, { recursive: true });
    const query = `${face.family.replace(/ /g, '+')}:${face.axes}`;
    const css = await (
      await get(`https://fonts.googleapis.com/css2?family=${query}&display=swap`)
    ).text();
    const files = [];
    for (const f of parseCss(css)) {
      const parts = [
        face.slug,
        face.static ? f.weight : null,
        f.style === 'italic' ? 'italic' : null,
        f.subset,
      ];
      const file = `${face.slug}/${parts.filter(Boolean).join('-')}.woff2`;
      const bytes = Buffer.from(await (await get(f.url)).arrayBuffer());
      if (bytes.subarray(0, 4).toString('latin1') !== 'wOF2')
        throw new Error(`${f.url} is not woff2`);
      writeFileSync(join(FONTS, file), bytes);
      files.push({
        url: f.url,
        file,
        subset: f.subset,
        style: f.style,
        weight: f.weight,
        unicodeRange: f.unicodeRange,
        sha256: createHash('sha256').update(bytes).digest('hex'),
      });
    }
    // The hinted variant of each file: same subsets and ranges, other bytes.
    // Stored under hinted/ only where it differs.
    const hintedCss = await (
      await get(`https://fonts.googleapis.com/css2?family=${query}&display=swap`, HINTED_UA)
    ).text();
    for (const h of parseCss(hintedCss)) {
      const f = files.find(
        (x) => x.subset === h.subset && x.style === h.style && x.weight === h.weight,
      );
      if (!f || f.unicodeRange !== h.unicodeRange)
        throw new Error(
          `${face.family} ${h.style} ${h.weight} ${h.subset}: no matching unhinted face`,
        );
      const bytes = Buffer.from(await (await get(h.url, HINTED_UA)).arrayBuffer());
      if (bytes.subarray(0, 4).toString('latin1') !== 'wOF2')
        throw new Error(`${h.url} is not woff2`);
      const sha256 = createHash('sha256').update(bytes).digest('hex');
      if (sha256 === f.sha256) continue;
      const file = f.file.replace(`${face.slug}/`, `${face.slug}/hinted/`);
      mkdirSync(join(dir, 'hinted'), { recursive: true });
      writeFileSync(join(FONTS, file), bytes);
      f.hinted = { file, sha256 };
    }
    for (const f of files) delete f.url;
    const licence = await (
      await get(`https://raw.githubusercontent.com/google/fonts/main/${face.licence}/OFL.txt`)
    ).text();
    writeFileSync(join(dir, 'OFL.txt'), licence);
    manifest[face.slug] = {
      family: face.family,
      category: face.category ?? 'sans-serif',
      licence: `${face.slug}/OFL.txt`,
      source: `https://fonts.googleapis.com/css2?family=${query}`,
      variable: !face.static,
      files,
    };
    console.log(`${face.family}: ${files.length} files`);
  }
  writeFileSync(join(FONTS, 'faces.json'), JSON.stringify(manifest, null, 2) + '\n');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
