import type { SpriteMeta } from './SpriteCache';

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
  /** How many pixels around the glyph shape to encode distance into. Default: 8. */
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

// Euclidean squared distance transform
// Felzenszwalb & Huttenlocher: https://cs.brown.edu/~pff/papers/dt-final.pdf
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

/**
 * Renders a sprite onto `ctx` at (0, 0) with SDF-based color and halo effects.
 *
 * Generates the SDF entirely in the browser:
 *  1. Draw the regular sprite sub-image onto an offscreen canvas.
 *  2. Read the alpha channel as an inside/outside mask.
 *  3. Run the Euclidean distance transform to produce signed-distance values.
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
  const sdfW = width + 2 * buffer;
  const sdfH = height + 2 * buffer;
  const len = sdfW * sdfH;

  const offscreen = document.createElement('canvas');
  offscreen.width = sdfW;
  offscreen.height = sdfH;
  const sdfCtx = offscreen.getContext('2d');
  if (!sdfCtx) return;

  sdfCtx.drawImage(image, x, y, width, height, buffer, buffer, width, height);

  const imgData = sdfCtx.getImageData(0, 0, sdfW, sdfH);

  const gridOuter = new Float64Array(len);
  const gridInner = new Float64Array(len);
  const maxDim = Math.max(sdfW, sdfH);
  const f = new Float64Array(maxDim);
  const v = new Uint16Array(maxDim);
  const z = new Float64Array(maxDim + 1);

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
        const d = 0.5 - a;
        gridOuter[j] = d > 0 ? d * d : 0;
        gridInner[j] = d < 0 ? d * d : 0;
      }
    }
  }

  edt(gridOuter, 0, 0, sdfW, sdfH, sdfW, f, v, z);
  edt(gridInner, buffer, buffer, width, height, sdfW, f, v, z);

  const outData = new ImageData(width, height);
  const haloOuter = cutoff - haloWidth;

  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      const i = (py + buffer) * sdfW + (px + buffer);
      const d = Math.sqrt(gridOuter[i]) - Math.sqrt(gridInner[i]);
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
