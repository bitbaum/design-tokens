# @bitbaum/design-tokens

The design **single source of truth** for OrangeCat, Loki and Solon.

One file — [`tokens.css`](./tokens.css) — defines every colour, typeface, weight,
tracking, radius and shared primitive the three products use. They import it.
Nothing is copied.

## Why

These tokens used to be hand-copied into three repos, and they drifted. Solon's
`globals.css` carried a comment claiming its tokens matched OrangeCat's while
sharing **zero** names or values with it — so the three products looked like
three different companies. Copies drift; imports cannot.

## Retheming the entire stack

1. Edit the block marked `▼▼▼ THE KNOBS ▼▼▼` in `tokens.css` for a retheme, or update the optional `composition.css` contract for interface improvements.
2. Bump `package.json`'s version **and** set the matching explicit `.github/release-request.txt`; submit a PR and pass package CI.
3. A successful **main-branch push CI** triggers `tag-approved-release.yml`. It tags only the exact latest verified SHA and never rewrites an existing version tag.
4. The tag workflow explicitly dispatches `publish.yml`; npm publishing is still guarded by `NPM_PUBLISHING` and requires trusted-publishing bootstrap. If that variable is off, a Git tag exists but **no npm release** is claimed.
5. Upgrade consumers to the confirmed Git tag, published npm version, or an exact source-commit SHA; run their frozen-lockfile CI.

The one-time release request does not automatically approve future version bumps: a request must match the manifest version.

Changing the display typeface is **one line**:

```css
--font-display: "Instrument Serif", Georgia, serif;
--font-display-weight: 400;   /* the face's weight lives WITH the face */
--tracking-display: -0.015em; /* and so does its tracking */
```

## Install

```jsonc
// package.json
"@bitbaum/design-tokens": "github:bitbaum/design-tokens#v1.1.0"
```

```tsx
// app/layout.tsx — import BEFORE the app's own globals.css
import "@bitbaum/design-tokens/tokens.css";
import "./globals.css";
```

```js
// tailwind.config.js (v3)
module.exports = {
  presets: [require("@bitbaum/design-tokens/tailwind-preset")],
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
};
```

Tailwind v4 apps consume `tokens.css` through `@theme`; the variable names are
identical, so both paths stay in sync.

## Optional cross-product composition grammar

The **brand tokens** above intentionally belong to OrangeCat/Loki/Solon.
Their shared palette should never be imposed on unrelated products or
customer websites.

For spacing, control sizing, visual rhythm and interaction *decisions*,
`composition.css` is an opt-in, namespaced layer. It defines no fonts, brand
colours, body style or global reset.

```tsx
// App Router — load AFTER the app's CSS reset and BEFORE product CSS modules.
// The shared classes intentionally use :where() specificity, so importing
// them before a later universal '*' padding reset would erase their padding.
import './globals.css';
import '@bitbaum/design-tokens/composition.css';
```

```tsx
<main className="bb-frame">
  <div className="bb-stack" style={{ '--bb-stack-gap': '1.5rem' }}>
    <div className="bb-measure">A product-specific headline and description</div>
    <div className="bb-actions">
      <a className="bb-button bb-button--primary" href="/start">Get started</a>
      <a className="bb-button bb-button--secondary" href="/method">Read the method</a>
    </div>
  </div>
</main>
```

Map only the small seam of **semantic** CSS roles once in each app:

```css
:root {
  --bb-action-bg: var(--color-action);
  --bb-action-fg: var(--color-on-action);
  --bb-control-bg: var(--color-surface);
  --bb-control-fg: var(--color-text);
  --bb-line: var(--color-border);
  --bb-muted: var(--color-text-muted);
  --bb-focus: var(--color-focus);
}
```

The exported grammar includes `bb-frame`, `bb-measure`, `bb-section`,
`bb-stack`, `bb-cluster`, `bb-grid`, `bb-actions`,
`bb-choice-row`, `bb-list`, `bb-keyline`, `bb-tabular`,
`bb-control`, `bb-button`, and `bb-skip`.

It guarantees 44px controls, visible focus, responsive equal-cell choices,
and reduced-motion support. Apps own typography, colours, spacing adjustments,
components and their content. Do **not** render all information as cards: the
grammar deliberately offers whitespace and hairline lists.

**Release contract:** the new composition subpath first appears in
source version `1.2.0`; `v1.1.0` does **not** include it. The verified
tagging pipeline only tags a version explicitly requested in
`.github/release-request.txt` after main CI is green. Verify the
`v1.2.0` Git ref and the registry separately before claiming either is
published. Until then, use a verified exact commit SHA. Existing
`tokens.css` consumers do not change appearance by opting out.

## The contract

Components declare **intent**, never mechanics.

| Do | Don't | Why |
|---|---|---|
| `className="font-display"` | `font-['Instrument_Serif']` | the face is not a component's business |
| `className="font-display"` | `font-display font-bold` | the display face has **one weight**; a synthesized bold looks cheap |
| `className="bg-surface-base"` | `bg-[#1c1c1c]` | retheming must not require finding hex codes |
| `className="text-accent"` | `text-[#ff5c00]` | one action colour, one definition |
| `bg-accent text-on-accent` | `bg-accent text-white` | white on the accent is **3.10:1** and fails AA; the paired ink is 6.10:1 |
| `className="tabular"` | — | numbers that change in place must not jitter |
| `font-display` at ≥`text-2xl` | `font-display text-lg` | below 24px the high-contrast serif reads *lighter* than the body sans and hierarchy inverts |
| `className="wordmark"` | `font-display` on the logo | uppercase + open tracking is the one small size a display serif survives |

Enforce it in each repo's design gate so drift fails the build rather than
shipping quietly.

## Typefaces

Self-hosted (latin + latin-ext), no runtime requests to Google:

| Role | Face | Weights | Carries |
|---|---|---|---|
| display | Instrument Serif | 400 only | headlines, wordmarks |
| sans | Inter | 400–700 variable | all UI and body text |
| mono | IBM Plex Mono | 400, 500 | addresses, signatures, hashes, tallies |

All three are SIL Open Font License.

### Why a serif

Every AI and infrastructure company competes inside the same dark-canvas
grotesque convention, where the winner is whoever has the largest design budget.
A high-contrast serif exits that comparison: it reads institutional rather than
startup, which is exactly right for a stack whose product is *legitimacy* —
signed votes, verifiable treasuries, an append-only audit trail.

---

Part of **[bitbaum](https://bitbaum.orangecat.ch)** — AI-native products on open
infrastructure, built in Zürich. Every package here lists the apps that use it:
**[which apps use design-tokens](https://bitbaum.orangecat.ch/packages/#design-tokens)**.

## Data maps

`--map-scale-1` … `--map-scale-7` are the one sequential scale for every
choropleth (viridis, dark to light; hex, so an SVG `fill` takes them as is).
Luminance rises at every step, so the scale survives colour-vision deficiency
and greyscale; `test/contrast.test.js` keeps it that way. `--map-no-data` and
`--map-boundary` follow the theme. An area more than one authority claims is
**hatched**, never given a colour of its own: lines of `--map-hatch-width`
every `--map-hatch-gap` at `--map-hatch-angle`, in the text colour. Colour is
never the only carrier: every map has a list and a legend.
