/** One entry of ImageResponse's `fonts` option. */
export interface OgFont {
  name: string;
  data: ArrayBuffer;
  weight: 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
  style: 'normal';
}

/**
 * The `fonts` option for next/og's ImageResponse, from this package. No
 * argument: Geist 400, the face next/og falls back to. Otherwise "family" or
 * "family:400,600", e.g. ogFonts('inter:400,600').
 */
export function ogFonts(...specs: string[]): Promise<OgFont[]>;

/** `text` without characters none of the given faces (default Geist) draws. */
export function ogText(text: string | null | undefined, ...specs: string[]): string;
