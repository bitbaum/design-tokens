# @bitbaum/design-tokens

The design **single source of truth** for OrangeCat, FleetCrown and Solon.

One file — [`tokens.css`](./tokens.css) — defines every colour, typeface, weight,
tracking, radius and shared primitive the three products use. They import it.
Nothing is copied.

## Why

These tokens used to be hand-copied into three repos, and they drifted. Solon's
`globals.css` carried a comment claiming its tokens matched OrangeCat's while
sharing **zero** names or values with it — so the three products looked like
three different companies. Copies drift; imports cannot.

## Retheming the entire stack

1. Edit the block marked `▼▼▼ THE KNOBS ▼▼▼` in `tokens.css`. Nothing else.
2. Tag a release: `git tag v1.2.0 && git push --tags`
3. Bump `@bitbaum/design-tokens` in the three apps. Their CI auto-merges.

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
