/**
 * The fleet's marks: what each product's logo IS, as data, and the few
 * functions that draw one. A product renders its own mark (and any sibling's)
 * from here, so replacing a logo is one change in this package and a release,
 * not a hunt through three repositories.
 *
 *   import { markFor, markSvg, iconSvg } from '@bitbaum/design-tokens/marks';
 *
 * A mark is one colour: every shape is stroked or filled with the colour the
 * surface hands it. React surfaces draw `mark.shapes` as <path>s; everything
 * else (favicons, share cards, decks) uses markSvg / iconSvg.
 */
import { MARKS } from './registry.mjs';

export { MARKS };
export { ICON_STYLE, iconSvg, markSvg, shapeAttributes, squareViewBox } from './svg.mjs';
export { MarkImportError, svgToMark } from './svg-to-mark.mjs';

/** The mark for a fleet slug, or null when that product has none yet. */
export function markFor(slug) {
  return Object.prototype.hasOwnProperty.call(MARKS, slug) ? MARKS[slug] : null;
}
