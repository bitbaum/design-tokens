import type { MarkDefinition } from './types.mjs';

export type { MarkDefinition, MarkMotion, MarkShape } from './types.mjs';
export { ICON_STYLE, iconSvg, markSvg, shapeAttributes, squareViewBox } from './svg.mjs';
export type { MarkSvgOptions } from './svg.mjs';
export { MarkImportError, svgToMark } from './svg-to-mark.mjs';
export type { ImportResult, ImportedGeometry } from './svg-to-mark.mjs';

/** Every mark, by fleet slug. */
export declare const MARKS: Readonly<Record<'loki' | 'orangecat' | 'solon', MarkDefinition>>;
export type MarkSlug = keyof typeof MARKS;

/** The mark for a fleet slug, or null when that product has none yet. */
export declare function markFor(slug: string): MarkDefinition | null;
