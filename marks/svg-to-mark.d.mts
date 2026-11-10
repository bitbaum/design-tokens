import type { MarkDefinition } from './types.mjs';
/**
 * Turn an SVG file — whatever a designer exported — into a mark.
 *
 * A mark is one colour: every shape is either stroked or filled with whatever
 * colour the surface hands it. So this keeps the geometry and how each shape
 * is painted (stroke or fill, width, caps, joins, fill rule, opacity) and lets
 * the colours go, warning when there was more than one.
 *
 * Supported: path, circle, ellipse, rect, line, polyline, polygon; paint set
 * by attributes, `style="…"`, or simple `.class` rules in a <style> block;
 * inheritance through <g>. A full-size background rectangle is dropped, since
 * every surface supplies its own.
 *
 * Refused, with a message that says what to do: transforms, clip paths,
 * masks, <use>, <text>, <image>. Each would need a real SVG engine to flatten
 * correctly, and a mark that silently came out wrong is worse than a clear
 * "flatten this in your editor first".
 */
export declare class MarkImportError extends Error {
  constructor(message: string);
}
export type ImportedGeometry = Pick<MarkDefinition, 'viewBox' | 'strokeWidth' | 'shapes'>;
export interface ImportResult extends ImportedGeometry {
  warnings: string[];
}
/**
 * The SVG with comments, processing instructions, doctypes, CDATA and the
 * never-drawn blocks removed — in ONE forward scan that skips by position and
 * never re-reads what it has emitted. That matters: regex removal leaves a
 * fresh `<!--` behind for input like `<!<!--x-->--`, however often it runs.
 * Safety does not rest on this either way — every path is checked against
 * PATH_DATA before it can reach a file.
 */
export declare function withoutIgnoredMarkup(svg: string): string;
export declare function svgToMark(svg: string): ImportResult;
