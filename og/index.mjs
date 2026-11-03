// Fonts for generated images: next/og's ImageResponse (opengraph-image,
// twitter-image, icon, route handlers).
//
//   import { ogFonts } from '@bitbaum/design-tokens/og';
//   return new ImageResponse(<Card />, { ...size, fonts: await ogFonts() });
//
// Given no `fonts`, next/og draws with the Geist Regular it bundles, and for
// any character no font covers it asks fonts.googleapis.com (and
// cdn.jsdelivr.net for emoji) at render time; offline, an emoji makes the
// whole image fail. ogFonts() hands it the faces explicitly, from this
// package, and ogText() drops what they do not cover, so nothing is fetched.
import { FACES, LOADERS } from './faces.generated.mjs';

const DEFAULT = ['geist'];

/** "inter:400,600" → [["inter", [400, 600]]]; "inter" → every weight shipped. */
function parse(specs) {
  return (specs.length ? specs : DEFAULT).map((spec) => {
    const [slug, list] = spec.split(':');
    const face = FACES[slug];
    if (!face)
      throw new Error(
        `@bitbaum/design-tokens/og has no face "${slug}" (it has ${Object.keys(FACES).join(', ')}). ` +
          'A face it lacks is added to the package (scripts/og-fetch-fonts.mjs), not fetched.',
      );
    const shipped = Object.keys(face.weights).map(Number);
    const weights = list ? list.split(',').map(Number) : shipped;
    for (const w of weights)
      if (!shipped.includes(w))
        throw new Error(
          `@bitbaum/design-tokens/og has ${face.family} in ${shipped.join(', ')}, not ${w}`,
        );
    return [slug, weights];
  });
}

function bytes(base64) {
  const binary = atob(base64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out.buffer;
}

/**
 * The `fonts` option for ImageResponse. With no argument, Geist 400: the face
 * next/og would have used, so the image looks as it did. Name others as
 * "family" (every weight shipped) or "family:400,600". The font's `name` is
 * its family ("Geist", "Inter"); a `fontFamily` no font has falls back to the
 * first one given.
 *
 * @param {...string} specs
 */
export async function ogFonts(...specs) {
  const fonts = [];
  for (const [slug, weights] of parse(specs))
    for (const weight of weights) {
      const { default: data } = await LOADERS[`${slug}-${weight}`]();
      fonts.push({ name: FACES[slug].family, data: bytes(data), weight, style: 'normal' });
    }
  return fonts;
}

function covers(ranges, cp) {
  let lo = 0,
    hi = ranges.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (cp < ranges[mid][0]) hi = mid - 1;
    else if (cp > ranges[mid][1]) lo = mid + 1;
    else return true;
  }
  return false;
}

const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

/**
 * `text` without what none of the given faces draws (same specs as ogFonts,
 * default Geist), so it can never make the renderer go looking for a font.
 * For text an image does not control, such as a name or a title from the
 * database. A word missing a letter is left out whole, since half a word is
 * wrong where a missing one is not ("Ελλάδα" in a face with only λ is not
 * "λλ"); an emoji or symbol the faces lack is left out on its own.
 * Whitespace is kept.
 *
 * @param {string | null | undefined} text
 * @param {...string} specs
 */
export function ogText(text, ...specs) {
  const coverages = parse(specs).flatMap(([slug, weights]) =>
    weights.map((w) => FACES[slug].weights[w].coverage),
  );
  const drawn = (segment) => {
    const points = [...segment].map((c) => c.codePointAt(0));
    return coverages.some((ranges) => points.every((cp) => covers(ranges, cp)));
  };
  return String(text ?? '')
    .split(/(\s+)/u)
    .map((token) => {
      if (!token || /^\s+$/u.test(token)) return token;
      let out = '';
      for (const { segment } of segmenter.segment(token)) {
        if (drawn(segment)) out += segment;
        else if (/[\p{L}\p{M}]/u.test(segment)) return '';
      }
      return out;
    })
    .join('')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}
