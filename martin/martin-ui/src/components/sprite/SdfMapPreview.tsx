import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useCallback, useEffect, useRef } from 'react';
import { buildMartinUrl } from '@/lib/api';
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';

type SdfMapPreviewProps = {
  spriteUrl: string;
  spriteIds: readonly string[];
  iconColor: string;
  haloColor: string;
  haloWidth: number;
  haloBlur: number;
  iconSize: number;
};

const LAYER_ID = 'sdf-icons';
const SOURCE_ID = 'sdf-grid';
const MAX_COLS = 6;
const INITIAL_ZOOM = 15;
const TEXT_OFFSET_Y = 1.5;
const BASE_CELL_H = 130;

const EMPTY_FC: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: [],
};

function cellHeight(iconSize: number): number {
  const iconPx = 22 * iconSize;
  const textPx = 16;
  const offsetPx = TEXT_OFFSET_Y * textPx;
  return Math.max(BASE_CELL_H, iconPx + offsetPx + textPx * 2 + 20);
}

function buildGridFeatures(
  map: maplibregl.Map,
  spriteIds: readonly string[],
  cols: number,
  cellH: number,
): GeoJSON.Feature<GeoJSON.Point>[] {
  const canvasW = map.getCanvas().clientWidth;
  const cellW = canvasW / cols;

  return spriteIds.map((id, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const px = col * cellW + cellW / 2;
    const py = row * cellH + cellH / 2;
    const lngLat = map.unproject([px, py]);
    return {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [lngLat.lng, lngLat.lat],
      },
      properties: { icon: id, label: id },
    };
  });
}

function queryIconAtPoint(
  map: maplibregl.Map,
  point: [number, number],
): string | undefined {
  const features = map.queryRenderedFeatures(point, { layers: [LAYER_ID] });
  return features[0]?.properties?.icon as string | undefined;
}

export function SdfMapPreview({
  spriteUrl,
  spriteIds,
  iconColor,
  haloColor,
  haloWidth,
  haloBlur,
  iconSize,
}: SdfMapPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const { copy } = useCopyToClipboard({
    successMessage: 'Sprite ID copied to clipboard',
  });
  const copyRef = useRef(copy);
  copyRef.current = copy;

  const cols = Math.min(spriteIds.length, MAX_COLS);
  const rows = Math.ceil(spriteIds.length / Math.max(cols, 1));
  const cellH = cellHeight(iconSize);

  const handleClick = useCallback((e: MouseEvent) => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const rect = map.getCanvas().getBoundingClientRect();
    const point: [number, number] = [e.clientX - rect.left, e.clientY - rect.top];
    const name = queryIconAtPoint(map, point);
    if (name) copyRef.current(name);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const map = mapRef.current;
    const container = containerRef.current;
    if (!map || !map.isStyleLoaded() || !container) return;

    const rect = map.getCanvas().getBoundingClientRect();
    const point: [number, number] = [e.clientX - rect.left, e.clientY - rect.top];
    const name = queryIconAtPoint(map, point);
    container.style.cursor = name ? 'pointer' : '';
  }, []);

  useEffect(() => {
    if (!containerRef.current || spriteIds.length === 0) return;

    const sdfSpriteUrl = buildMartinUrl(
      spriteUrl.replace('/sprite/', '/sdf_sprite/'),
    );

    const map = new maplibregl.Map({
      container: containerRef.current,
      pixelRatio: window.devicePixelRatio || 1,
      style: {
        version: 8,
        sprite: sdfSpriteUrl,
        sources: {
          [SOURCE_ID]: { type: 'geojson', data: EMPTY_FC },
        },
        layers: [
          {
            id: 'background',
            type: 'background',
            paint: { 'background-color': '#f9fafb' },
          },
          {
            id: LAYER_ID,
            type: 'symbol',
            source: SOURCE_ID,
            layout: {
              'icon-image': ['get', 'icon'],
              'icon-size': iconSize,
              'icon-allow-overlap': true,
              'icon-ignore-placement': true,
              'text-field': ['get', 'label'],
              'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
              'text-size': 12,
              'text-anchor': 'top',
              'text-offset': [0, TEXT_OFFSET_Y],
              'text-allow-overlap': true,
              'text-ignore-placement': true,
              'text-max-width': 8,
            },
            paint: {
              'icon-color': iconColor,
              'icon-halo-color': haloColor,
              'icon-halo-width': haloWidth,
              'icon-halo-blur': haloBlur,
              'text-color': '#6b7280',
            },
          },
        ],
        glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
      },
      center: [0, 0],
      zoom: INITIAL_ZOOM,
    });

    map.on('load', () => {
      const features = buildGridFeatures(map, spriteIds, cols, cellH);
      const source = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource;
      source.setData({ type: 'FeatureCollection', features });
    });

    const canvas = map.getCanvas();
    canvas.addEventListener('click', handleClick);
    canvas.addEventListener('mousemove', handleMouseMove);

    mapRef.current = map;

    return () => {
      canvas.removeEventListener('click', handleClick);
      canvas.removeEventListener('mousemove', handleMouseMove);
      map.remove();
      mapRef.current = null;
    };
  }, [spriteUrl, spriteIds, cols, rows, cellH, handleClick, handleMouseMove]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const update = () => {
      if (!map.getLayer(LAYER_ID)) return;
      map.setPaintProperty(LAYER_ID, 'icon-color', iconColor);
      map.setPaintProperty(LAYER_ID, 'icon-halo-color', haloColor);
      map.setPaintProperty(LAYER_ID, 'icon-halo-width', haloWidth);
      map.setPaintProperty(LAYER_ID, 'icon-halo-blur', haloBlur);
    };

    if (map.isStyleLoaded()) {
      update();
    } else {
      map.once('style.load', update);
    }
  }, [iconColor, haloColor, haloWidth, haloBlur]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const update = () => {
      if (!map.getLayer(LAYER_ID)) return;
      map.setLayoutProperty(LAYER_ID, 'icon-size', iconSize);
    };

    if (map.isStyleLoaded()) {
      update();
    } else {
      map.once('style.load', update);
    }
  }, [iconSize]);

  const totalHeight = rows * cellH;

  return (
    <div
      ref={containerRef}
      className="w-full rounded-lg border"
      style={{ height: totalHeight }}
    />
  );
}
