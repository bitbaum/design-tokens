#!/usr/bin/env node
// Write an app's `next/font/local` module for faces this package ships.
//
//   design-tokens-next-fonts <out-file> "<export>=<face>[;key=value]..." ... [--check]
//
//   keys:  weight=500,700        weights to declare (default: the face's whole range)
//          style=normal,italic   styles to declare (default: normal)
//          variable=--font-x     the CSS variable the export sets
//          subsets=latin,...     subsets to declare (default: every subset shipped)
//          preload=latin,...     subsets to preload (default: latin; "none" for none)
//          display=swap          font-display (default: swap)
//          hinting=on            the TrueType-hinted files (default: off, the
//                                unhinted ones next/font/google downloaded)
//
//   --check   exit 1 if <out-file> is not what this command would write
//
// WHY A GENERATOR
//
// `next/font/google` downloads its faces at build time, so a build depends on
// Google answering; these faces are committed in fonts/ instead. `next/font`
// accepts only literal options in the calling module, so no helper can call
// `localFont` for an app. And one call can carry only one `unicode-range`,
// while Google splits a face into subsets (latin, latin-ext, cyrillic …) that
// a page downloads only when its text needs them. Keeping that split means one
// call per subset, all naming the same family — the same @font-face rules
// `next/font/google` produced: the same files, weights, styles, ranges and
// preloads. That is long and mechanical, so it is written by this command from
// fonts/faces.json and checked with --check, not typed by hand.
//
// The family is the export's name, not "Inter": Turbopack names the family in
// `.variable` after the const and ignores a `font-family` declaration there
// (webpack honours it), so the export carries no declaration and every other
// subset declares the export's name. Both bundlers then agree. The fallback
// face is measured from the file (next/font/local) rather than taken from
// Google's table, so it differs by about one percent; it shows only until the
// face has loaded.
//
// The export named in the spec is the call for the first preloaded subset
// (latin): it carries `.variable`, `.className` and `.style`. The other
// subsets are exported as `<export><Subset>` because next/font requires every
// call to be assigned to a module-level const; nothing needs to read them.
import { existsSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const PKG = '@bitbaum/design-tokens';
export const faces = JSON.parse(readFileSync(join(here, 'fonts', 'faces.json'), 'utf8'));

/** "sans=inter;weight=500,700;variable=--font-inter" → a spec object. */
export function parseSpec(text) {
  const [head, ...pairs] = text.split(';').map((s) => s.trim());
  const [name, face] = head.split('=');
  if (!/^[A-Za-z_$][\w$]*$/.test(name ?? ''))
    throw new Error(`"${text}": the export name must be an identifier`);
  // The export's name becomes the font-family name, so it must not be a CSS generic family.
  if (
    /^(serif|sans-serif|monospace|cursive|fantasy|system-ui|math|emoji|fangsong|ui-\w+|inherit|initial|unset|default)$/i.test(
      name,
    )
  )
    throw new Error(
      `"${text}": "${name}" is a CSS keyword; it names the font family, so pick another`,
    );
  if (!faces[face])
    throw new Error(`"${text}": no face "${face}"; shipped: ${Object.keys(faces).join(', ')}`);
  const spec = { name, face };
  for (const pair of pairs) {
    const [key, value] = pair.split('=');
    if (!['weight', 'style', 'variable', 'subsets', 'preload', 'display', 'hinting'].includes(key))
      throw new Error(`"${text}": unknown key "${key}"`);
    spec[key] = value;
  }
  return spec;
}

const list = (v) =>
  v
    ? v
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : undefined;
const camel = (s) => s.replace(/(^|-)(\w)/g, (_, __, c) => c.toUpperCase());

/** The localFont calls for one spec, as plain data. */
export function calls(spec) {
  const face = faces[spec.face];
  const styles = list(spec.style) ?? ['normal'];
  if (spec.hinting && !['on', 'off'].includes(spec.hinting))
    throw new Error(`hinting=${spec.hinting}: on or off`);
  // Google serves a Mac the unhinted files (what next/font/google got) and a
  // current Chrome on Windows or Linux the hinted ones, which those platforms
  // draw differently. An app keeps whichever it had.
  const hinted = spec.hinting === 'on';
  const weights = list(spec.weight);
  const preload = spec.preload === 'none' ? [] : (list(spec.preload) ?? ['latin']);
  const shipped = [...new Set(face.files.map((f) => f.subset))];
  const subsets = list(spec.subsets) ?? shipped;
  for (const s of [...subsets, ...preload])
    if (!shipped.includes(s))
      throw new Error(`${spec.face} has no subset "${s}"; shipped: ${shipped.join(', ')}`);
  // Google's order is kept, because it decides which file wins a character two
  // subsets both list. The export itself is latin when latin is declared,
  // else the first preloaded subset, else the first: it is the file measured
  // for the fallback metrics, and a cyrillic file has no latin letters to
  // measure (Inter's gives size-adjust 100% where latin gives 107.89%).
  const ordered = shipped.filter((s) => subsets.includes(s));
  const primary = ordered.includes('latin')
    ? 'latin'
    : (ordered.find((s) => preload.includes(s)) ?? ordered[0]);
  return ordered.map((subset) => {
    const isPrimary = subset === primary;
    const src = [];
    for (const style of styles) {
      const files = face.files
        .filter((f) => f.subset === subset && f.style === style)
        .map((f) => (hinted ? { ...f, file: f.hinted?.file ?? f.file } : f));
      if (!files.length) throw new Error(`${spec.face} has no ${style} ${subset} file`);
      if (face.variable) {
        for (const weight of weights ?? [files[0].weight])
          src.push({ file: files[0].file, weight, style });
      } else {
        for (const weight of weights ?? files.map((f) => f.weight)) {
          const file = files.find((f) => f.weight === weight);
          if (!file)
            throw new Error(
              `${spec.face} has no ${style} ${weight} file; shipped: ${files.map((f) => f.weight)}`,
            );
          src.push({ file: file.file, weight, style });
        }
      }
    }
    return {
      name: isPrimary ? spec.name : spec.name + camel(subset),
      primary: isPrimary,
      src,
      variable: isPrimary ? spec.variable : undefined,
      display: spec.display ?? 'swap',
      preload: preload.includes(subset),
      adjustFontFallback: isPrimary
        ? face.category === 'serif'
          ? 'Times New Roman'
          : undefined
        : false,
      family: spec.name,
      unicodeRange: face.files.find((f) => f.subset === subset).unicodeRange,
    };
  });
}

/** Where the package sits as seen from `dir`: node_modules/@bitbaum/design-tokens, not its realpath. */
export function packageDir(dir) {
  for (let d = resolve(dir); ; d = dirname(d)) {
    const candidate = join(d, 'node_modules', ...PKG.split('/'));
    if (existsSync(join(candidate, 'package.json'))) return candidate;
    if (dirname(d) === d) throw new Error(`${PKG} is not installed above ${dir}`);
  }
}

export function render(out, specs, argv) {
  const base = relative(dirname(resolve(out)), packageDir(dirname(resolve(out))))
    .split(sep)
    .join('/');
  const q = JSON.stringify;
  const lines = [
    '// Generated by @bitbaum/design-tokens. Do not edit; to change it, run:',
    `//   pnpm exec design-tokens-next-fonts ${argv.map((a) => (/^[\w./@-]+$/.test(a) ? a : `'${a}'`)).join(' ')}`,
    '// The faces ship in the package (fonts/faces.json): no build fetches fonts.',
    'import localFont from "next/font/local";',
  ];
  for (const spec of specs) {
    for (const c of calls(spec)) {
      const opts = [
        `src: [${c.src.map((s) => `{ path: ${q(`${base}/fonts/${s.file}`)}, weight: ${q(s.weight)}, style: ${q(s.style)} }`).join(', ')}]`,
        c.variable ? `variable: ${q(c.variable)}` : null,
        `display: ${q(c.display)}`,
        c.preload ? null : 'preload: false',
        c.adjustFontFallback === false
          ? 'adjustFontFallback: false'
          : c.adjustFontFallback
            ? `adjustFontFallback: ${q(c.adjustFontFallback)}`
            : null,
        `declarations: [${c.primary ? '' : `{ prop: "font-family", value: ${q(`'${c.family}'`)} }, `}{ prop: "unicode-range", value: ${q(c.unicodeRange)} }]`,
      ].filter(Boolean);
      lines.push('', `export const ${c.name} = localFont({ ${opts.join(', ')} });`);
    }
  }
  return lines.join('\n') + '\n';
}

/** Format with the app's own prettier and config, when it has one, so its format check passes. */
async function format(out, code) {
  try {
    const require = createRequire(resolve(out));
    const mod = await import(require.resolve('prettier'));
    const prettier = mod.default ?? mod;
    const config = (await prettier.resolveConfig(resolve(out))) ?? {};
    return await prettier.format(code, { ...config, filepath: resolve(out) });
  } catch {
    return code;
  }
}

async function main(argv) {
  const check = argv.includes('--check');
  const args = argv.filter((a) => a !== '--check');
  const [out, ...specTexts] = args;
  if (!out || !specTexts.length) {
    console.error(
      'usage: design-tokens-next-fonts <out-file> "<export>=<face>[;key=value]..." ... [--check]',
    );
    process.exit(2);
  }
  const code = await format(out, render(out, specTexts.map(parseSpec), args));
  if (check) {
    const current = existsSync(out) ? readFileSync(out, 'utf8') : '';
    if (current !== code) {
      console.error(
        `${out} is not what design-tokens-next-fonts writes; re-run the command in its first lines.`,
      );
      process.exit(1);
    }
    return;
  }
  writeFileSync(out, code);
}

if (
  process.argv[1] &&
  realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))
)
  await main(process.argv.slice(2));
