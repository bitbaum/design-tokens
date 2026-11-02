# Changelog

This retrospective record was added on 2026-10-27 from the immutable sources
linked below. Git commit dates are source dates, not inferred npm publication
dates. A GitHub release does not itself establish npm publication.
Application adoption and deployment evidence are tracked separately.

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
