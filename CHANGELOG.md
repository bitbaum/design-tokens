# Changelog

This retrospective record was added on 2026-10-27 from the immutable sources
linked below. Git commit dates are source dates, not inferred npm publication
dates. A GitHub release does not itself establish npm publication.
Application adoption and deployment evidence are tracked separately.

## 1.6.1

- `marks:import` writes a valid registry for any fleet slug: a slug that
  starts with a digit (`3d-print`) or has dashes is imported under a safe
  name (`_3dPrint`, `geoKit`) and keyed by its quoted slug. 1.6.0 wrote
  `import 3dPrint …`, which does not parse.

## 1.6.0

- `@bitbaum/design-tokens/marks`: every product's mark (OrangeCat, Loki,
  Solon) as data, with `markFor`, `markSvg`, `iconSvg`, `ICON_STYLE` and the
  SVG importer (`svgToMark`, `pnpm run marks:import`). Moved from OrangeCat's
  `src/config/marks/`, where each product kept its own copy and Solon's had
  drifted from the mark Solon used. Solon's mark is the owl it adopted on
  2026-11-10.

## 1.5.2

- `ogText` no longer drops the word an emoji is attached to: U+FE0F (emoji
  presentation, in "♻️" or "☕️") is a mark, which 1.5.1 took for a missing
  letter, so "♻️," lost its comma. A grapheme counts as a letter when it starts
  with one. Punctuation that followed a dropped emoji joins the word before it
  ("Kreislaufwirtschaft ♻️, Arbeitsintegration" → "Kreislaufwirtschaft,
  Arbeitsintegration"); spacing nothing was dropped from is kept.

## 1.5.1

- `ogText` leaves out a word that is missing a letter, whole, instead of the
  letters alone: in Geist, which has λ but not the rest of Greek, "Ελλάδα"
  became "λλ". An emoji or symbol is still left out on its own, and the
  result is trimmed. README: for text an image does not control, pass Inter
  after Geist (`ogFonts('geist', 'inter:400')`, same specs to `ogText`);
  satori draws what Geist lacks from Inter (Greek, Vietnamese, ₿, ✓, arrows)
  and fetches nothing.

## 1.5.0

- `@bitbaum/design-tokens/og`: fonts for generated images (next/og's
  `ImageResponse`: `opengraph-image`, `icon`, route handlers).
  `fonts: await ogFonts()` hands the renderer Geist 400, the face it falls
  back to when given none, so an image looks as it did; `ogFonts('inter:400,600')`
  names others. `ogText(text)` drops characters the faces do not cover. Given
  no `fonts`, or text a font lacks, next/og fetches from fonts.googleapis.com
  (and cdn.jsdelivr.net for emoji) at render time. The faces are static WOFF
  in JS modules (`og/faces/`), written by `scripts/og-fetch-fonts.mjs` from
  Google's static TTFs: Geist 400, Inter 400 and 600.

## 1.4.0

- Every face also ships TrueType-hinted, in `fonts/<face>/hinted/`
  (`hinted` on each entry of `fonts/faces.json`): what Google serves a current
  Chrome on Windows or Linux. `next/font/google` asks as a Mac and gets the
  unhinted files, which stay the default; a site that downloaded its faces
  from a browser has the hinted ones, and they draw differently on Windows
  and Linux. `design-tokens-next-fonts` takes `hinting=on` to keep them.
  OrangeCat's `src/fonts` were these files, byte for byte.

## 1.3.1

- `design-tokens-next-fonts`: the export (the call that carries `.variable`
  and is measured for the fallback face) is the latin subset whenever latin
  is declared. With `preload=latin,latin-ext,cyrillic` 1.3.0 picked cyrillic,
  whose file has no latin letters, so the fallback was sized at 100% instead
  of Inter's 107.89%.

## 1.3.0

- Faces for apps that used `next/font/google`, as woff2 with their SIL OFL
  licences: Inter (100–900, all seven Google subsets), Space Grotesk, IBM Plex
  Mono 400/500/600, Fraunces, Cormorant Garamond, DM Sans, Geist, Geist Mono,
  JetBrains Mono and Montserrat, in `fonts/<face>/`, listed in
  `fonts/faces.json`. The files are the ones Google serves `next/font/google`.
- `design-tokens-next-fonts` writes an app's `next/font/local` module from
  them (README, "Faces for Next apps"). No build has to reach Google.
- Unchanged: `tokens.css`, `composition.css`, the preset, and every existing
  file under `fonts/`.

## 1.2.0

- [Tagged source `v1.2.0`](https://github.com/bitbaum/design-tokens/tree/5c31f48743dabf9294bf9380a15862b4efbc68a0)
- [Source commit](https://github.com/bitbaum/design-tokens/commit/5c31f48743dabf9294bf9380a15862b4efbc68a0), dated 2026-10-21.

No authored release notes were found for this tag when this record was made.
The links identify the verified source; missing feature history is not invented.
