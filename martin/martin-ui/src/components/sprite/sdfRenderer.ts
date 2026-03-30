import type { SpriteMeta } from './SpriteCache';

export type SdfRenderOptions = {
  /** Icon fill color, e.g. '#ffffff' or 'rgb(255,255,255)' */
  iconColor: string;
  /** Halo color, e.g. '#000000' */
  haloColor: string;
  /**
   * Halo width as a fraction of the SDF distance range [0, 1].
   * 0 = no halo, 0.25 = wide halo.
   */
  haloWidth: number;
  /**
   * SDF cutoff: distance value (0–1) at which the edge sits.
   * Mapbox/martin convention is ~0.75.
   */
  cutoff?: number;
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

/**
 * Renders an SDF sprite onto `ctx` at (0, 0) with the given color/halo options.
 *
 * The server encodes the SDF value in the red channel of the PNG (0 = outside, 255 = inside).
 * We:
 *   - Draw the raw sprite sub-image onto a temporary offscreen canvas
 *   - Read pixel data
 *   - Map each pixel: inside → iconColor, halo band → haloColor (fading), outside → transparent
 *   - Write the result back to the target ctx
 */
export function renderSdf(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  meta: SpriteMeta,
  options: SdfRenderOptions,
): void {
  const { iconColor, haloColor, haloWidth, cutoff = 0.75 } = options;

  const { width, height, x, y } = meta;

  const [ir, ig, ib] = parseColor(iconColor);
  const [hr, hg, hb] = parseColor(haloColor);

  // Draw the raw SDF sub-image into a temporary offscreen canvas to read pixels
  const offscreen = document.createElement('canvas');
  offscreen.width = width;
  offscreen.height = height;
  const offCtx = offscreen.getContext('2d');
  if (!offCtx) return;

  offCtx.drawImage(image, x, y, width, height, 0, 0, width, height);
  const imageData = offCtx.getImageData(0, 0, width, height);
  const data = imageData.data;

  const haloOuter = cutoff - haloWidth;

  for (let i = 0; i < data.length; i += 4) {
    // SDF value encoded in the red channel (and alpha in some formats — try alpha first)
    // Martin encodes SDF in the alpha channel of the PNG
    const raw = data[i + 3];
    const dist = raw / 255;

    if (dist >= cutoff) {
      // Inside the shape — fill with icon color
      data[i] = ir;
      data[i + 1] = ig;
      data[i + 2] = ib;
      data[i + 3] = 255;
    } else if (haloWidth > 0 && dist >= haloOuter) {
      // Halo band — fade from halo color to transparent
      const t = (dist - haloOuter) / haloWidth;
      data[i] = hr;
      data[i + 1] = hg;
      data[i + 2] = hb;
      data[i + 3] = Math.round(t * 255);
    } else {
      // Outside — transparent
      data[i] = 0;
      data[i + 1] = 0;
      data[i + 2] = 0;
      data[i + 3] = 0;
    }
  }

  ctx.clearRect(0, 0, width, height);
  ctx.putImageData(imageData, 0, 0);
}
