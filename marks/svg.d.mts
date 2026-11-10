import type { MarkDefinition, MarkShape } from './types.mjs';
/**
 * A mark as standalone `<svg>` markup — for the static assets and anything
 * else that cannot render React (the asset generator, the sync test).
 * React surfaces render <Mark>, which draws the same shapes.
 */
/**
 * How the brand's icons look: the mark in near-white on a near-black rounded
 * square. The generator writes the static assets with exactly these values
 * and the sync test recomputes them, so an asset that drifts fails CI.
 */
export declare const ICON_STYLE: {
  readonly ink: '#ededed';
  readonly canvas: '#0a0a0a';
  /** Corner radius as a fraction of the tile's side. */
  readonly radius: 0.22;
  /** How much of the tile the mark fills. */
  readonly inset: 0.84;
  /** Maskable PWA icons must keep the mark inside the centre safe zone. */
  readonly maskableInset: 0.68;
};
export interface MarkSvgOptions {
  /** Rendered width and height. Omitted, the svg has no size and scales to its box. */
  size?: number;
  /** Paint for every shape. `currentColor` by default. */
  color?: string;
  /** A square tile of this colour behind the mark (icons). */
  background?: string;
  /** Tile corner radius as a fraction of its side. */
  radius?: number;
  /** Scale of the mark inside its box, 1 = edge to edge. */
  inset?: number;
}
/** Paint attributes for one shape, in SVG attribute syntax. */
export declare function shapeAttributes(
  mark: MarkDefinition,
  shape: MarkShape,
  color: string,
): string;
/**
 * The box a mark is drawn in. Icons need a square tile, so a wide or tall
 * mark's viewBox is grown around its centre until it is square — the mark is
 * never stretched.
 */
export declare function squareViewBox(
  viewBox: MarkDefinition['viewBox'],
): [number, number, number, number];
export declare function markSvg(mark: MarkDefinition, options?: MarkSvgOptions): string;
/** The brand icon tile, exactly as the static assets carry it. */
export declare function iconSvg(
  mark: MarkDefinition,
  options?: {
    maskable?: boolean;
  },
): string;
