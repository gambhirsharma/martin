import TinySDF from '@mapbox/tiny-sdf';
import type { SpriteMeta } from './SpriteCache';

// The published @mapbox/tiny-sdf type definitions don't expose the internal
// working arrays, but they exist at runtime (see index.js).
interface TinySdfInternal {
  ctx: CanvasRenderingContext2D;
  gridOuter: Float64Array;
  gridInner: Float64Array;
  f: Float64Array;
  v: Uint16Array;
  z: Float64Array;
}

export type SdfRenderOptions = {
  /** Icon fill color, e.g. '#ffffff' or 'rgb(255,255,255)' */
  iconColor: string;
  /** Halo color, e.g. '#000000' */
  haloColor: string;
  /**
   * Halo width as a fraction of the SDF distance range [0, 1].
   * 0 = no halo, 0.4 = wide halo (matching HALO_MAX in the dialog).
   */
  haloWidth: number;
  /**
   * SDF cutoff: normalized distance value (0–1) where the glyph edge sits.
   * Mapbox/martin convention is ~0.75.
   */
  cutoff?: number;
  /**
   * How many pixels around the glyph shape to encode distance into.
   * Matches @mapbox/tiny-sdf's `radius` parameter. Default: 8.
   */
  radius?: number;
};

function parseColor(color: string): [number, number, number] {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext('2d');
  if (!ctx) return [255, 255, 255];
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 1, 1);
  const d = ctx.getImageData(0, 0, 1, 1).data;
  return [d[0], d[1], d[2]];
}

// ─── Euclidean squared distance transform ────────────────────────────────────
// Felzenszwalb & Huttenlocher: https://cs.brown.edu/~pff/papers/dt-final.pdf
// Inlined from @mapbox/tiny-sdf (BSD-2-Clause) – the functions are module-
// private there so we reproduce them here with TypeScript types.
const INF = 1e20;

function edt(
  data: Float64Array,
  x0: number,
  y0: number,
  width: number,
  height: number,
  gridSize: number,
  f: Float64Array,
  v: Uint16Array,
  z: Float64Array,
): void {
  for (let x = x0; x < x0 + width; x++) edt1d(data, y0 * gridSize + x, gridSize, height, f, v, z);
  for (let y = y0; y < y0 + height; y++) edt1d(data, y * gridSize + x0, 1, width, f, v, z);
}

function edt1d(
  grid: Float64Array,
  offset: number,
  stride: number,
  length: number,
  f: Float64Array,
  v: Uint16Array,
  z: Float64Array,
): void {
  v[0] = 0;
  z[0] = -INF;
  z[1] = INF;
  f[0] = grid[offset];

  let k = 0;
  for (let q = 1; q < length; q++) {
    f[q] = grid[offset + q * stride];
    const q2 = q * q;
    let s = 0;
    do {
      const r = v[k];
      s = (f[q] - f[r] + q2 - r * r) / (q - r) / 2;
    } while (s <= z[k] && --k > -1);
    k++;
    v[k] = q;
    z[k] = s;
    z[k + 1] = INF;
  }

  k = 0;
  for (let q = 0; q < length; q++) {
    while (z[k + 1] < q) k++;
    const r = v[k];
    const qr = q - r;
    grid[offset + q * stride] = f[r] + qr * qr;
  }
}

// ─── TinySDF instance cache ───────────────────────────────────────────────────
// Keyed by "maxDim_radius" so different sprite sizes share instances only when
// they map to the same underlying canvas size.
const tinySdfCache = new Map<string, TinySdfInternal>();

function getTinySdf(width: number, height: number, radius: number): TinySdfInternal {
  const key = `${Math.max(width, height)}_${radius}`;
  let instance = tinySdfCache.get(key);
  if (!instance) {
    instance = new TinySDF({
      fontSize: Math.max(width, height),
      buffer: radius,
      radius,
      // Internal TinySDF cutoff is 0.25 → produces edge value ≈ 0.75 after
      // normalisation, matching the Mapbox/martin convention used in options.cutoff.
      cutoff: 0.25,
    }) as unknown as TinySdfInternal;
    tinySdfCache.set(key, instance);
  }
  return instance;
}

/**
 * Renders a sprite onto `ctx` at (0, 0) with SDF-based color and halo effects.
 *
 * Instead of consuming a pre-generated SDF from the server's `/sdf_sprite/`
 * endpoint, this function uses @mapbox/tiny-sdf's approach to generate the SDF
 * entirely in the browser:
 *
 *  1. Draw the regular sprite sub-image onto TinySDF's offscreen canvas.
 *  2. Read the alpha channel as an inside/outside mask (same method tiny-sdf
 *     uses for font glyphs).
 *  3. Run the Euclidean distance transform (same algorithm as tiny-sdf) to
 *     produce signed-distance values.
 *  4. Map each pixel: inside → iconColor, halo band → haloColor (fading),
 *     outside → transparent.
 */
export function renderSdf(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  meta: SpriteMeta,
  options: SdfRenderOptions,
): void {
  const { iconColor, haloColor, haloWidth, cutoff = 0.75, radius = 8 } = options;
  const { width, height, x, y } = meta;

  const [ir, ig, ib] = parseColor(iconColor);
  const [hr, hg, hb] = parseColor(haloColor);

  const buffer = radius;

  // Reuse a cached TinySDF instance sized for this sprite.
  // TinySDF exposes its canvas context and pre-allocated working arrays as
  // public members, so we drive the pipeline ourselves without calling draw().
  const tinySdf = getTinySdf(width, height, radius);
  const sdfCtx = tinySdf.ctx;

  // Draw the sprite sub-image at (buffer, buffer) to leave room for the halo.
  sdfCtx.clearRect(0, 0, sdfCtx.canvas.width, sdfCtx.canvas.height);
  sdfCtx.drawImage(image, x, y, width, height, buffer, buffer, width, height);

  const sdfW = width + 2 * buffer;
  const sdfH = height + 2 * buffer;
  const len = sdfW * sdfH;

  const imgData = sdfCtx.getImageData(0, 0, sdfW, sdfH);

  // Build outer/inner grids from the alpha channel – same logic as tiny-sdf's
  // draw() method, generalised from text glyphs to arbitrary sprite images.
  const { gridOuter, gridInner, f, v, z } = tinySdf;
  gridOuter.fill(INF, 0, len);
  gridInner.fill(0, 0, len);

  for (let py = 0; py < sdfH; py++) {
    for (let px = 0; px < sdfW; px++) {
      const a = imgData.data[4 * (py * sdfW + px) + 3] / 255;
      if (a === 0) continue;
      const j = py * sdfW + px;
      if (a >= 1) {
        gridOuter[j] = 0;
        gridInner[j] = INF;
      } else {
        // Sub-pixel positioning for anti-aliased sprite edges.
        const d = 0.5 - a;
        gridOuter[j] = d > 0 ? d * d : 0;
        gridInner[j] = d < 0 ? d * d : 0;
      }
    }
  }

  // Run the 2-D Euclidean distance transform on both grids using TinySDF's
  // pre-allocated scratch arrays (f, v, z).
  edt(gridOuter, 0, 0, sdfW, sdfH, sdfW, f, v, z);
  edt(gridInner, buffer, buffer, width, height, sdfW, f, v, z);

  // Colourize: map each pixel's SDF value to icon/halo/transparent.
  const outData = new ImageData(width, height);
  const haloOuter = cutoff - haloWidth;

  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      const i = (py + buffer) * sdfW + (px + buffer);
      const d = Math.sqrt(gridOuter[i]) - Math.sqrt(gridInner[i]);

      // Normalise to [0, 1] using the same formula as tiny-sdf's draw():
      //   tiny-sdf writes: 255 * (1 − (d / radius + sdfCutoff))
      // With sdfCutoff = 0.25 this places the glyph edge at dist ≈ 0.75,
      // matching the Mapbox/martin convention used by options.cutoff.
      const dist = 1.0 - (d / radius + 0.25);

      const outIdx = 4 * (py * width + px);

      if (dist >= cutoff) {
        outData.data[outIdx] = ir;
        outData.data[outIdx + 1] = ig;
        outData.data[outIdx + 2] = ib;
        outData.data[outIdx + 3] = 255;
      } else if (haloWidth > 0 && dist >= haloOuter) {
        const t = (dist - haloOuter) / haloWidth;
        outData.data[outIdx] = hr;
        outData.data[outIdx + 1] = hg;
        outData.data[outIdx + 2] = hb;
        outData.data[outIdx + 3] = Math.round(t * 255);
      }
    }
  }

  ctx.clearRect(0, 0, width, height);
  ctx.putImageData(outData, 0, 0);
}
