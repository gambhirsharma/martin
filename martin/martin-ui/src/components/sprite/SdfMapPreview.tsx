import type { Map as MaplibreMap, MapLayerMouseEvent } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { MapRef } from '@vis.gl/react-maplibre';
import { Layer, Map as MapLibreMap, Source } from '@vis.gl/react-maplibre';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';
import { buildMartinUrl } from '@/lib/api';

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
  features: [],
  type: 'FeatureCollection',
};

function cellHeight(iconSize: number): number {
  const iconPx = 22 * iconSize;
  const textPx = 16;
  const offsetPx = TEXT_OFFSET_Y * textPx;
  return Math.max(BASE_CELL_H, iconPx + offsetPx + textPx * 2 + 20);
}

function buildGridFeatures(
  map: MaplibreMap,
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
      geometry: {
        coordinates: [lngLat.lng, lngLat.lat],
        type: 'Point',
      },
      properties: { icon: id, label: id },
      type: 'Feature',
    };
  });
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
  const mapRef = useRef<MapRef>(null);
  const [gridData, setGridData] = useState<GeoJSON.FeatureCollection>(EMPTY_FC);
  const [cursor, setCursor] = useState('');
  const { copy } = useCopyToClipboard({ successMessage: 'Sprite ID copied to clipboard' });

  const cols = Math.min(spriteIds.length, MAX_COLS);
  const rows = Math.ceil(spriteIds.length / Math.max(cols, 1));
  const cellH = cellHeight(iconSize);
  const totalHeight = rows * cellH;

  const sdfSpriteUrl = buildMartinUrl(spriteUrl.replace('/sprite/', '/sdf_sprite/'));

  const rebuildGrid = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map || spriteIds.length === 0) return;
    const features = buildGridFeatures(map, spriteIds, cols, cellH);
    setGridData({ features, type: 'FeatureCollection' });
  }, [spriteIds, cols, cellH]);

  useEffect(() => {
    rebuildGrid();
  }, [rebuildGrid]);

  const handleClick = useCallback(
    (e: MapLayerMouseEvent) => {
      const name = e.features?.[0]?.properties?.icon as string | undefined;
      if (name) copy(name);
    },
    [copy],
  );

  const handleMouseEnter = useCallback(() => setCursor('pointer'), []);
  const handleMouseLeave = useCallback(() => setCursor(''), []);

  const mapStyle = useMemo(
    () => ({
      glyphs: buildMartinUrl('/font/{fontstack}/{range}'),
      layers: [
        {
          id: 'background',
          paint: { 'background-color': '#f9fafb' },
          type: 'background' as const,
        },
      ],
      sources: {},
      sprite: sdfSpriteUrl,
      version: 8 as const,
    }),
    [sdfSpriteUrl],
  );

  if (spriteIds.length === 0) return null;

  return (
    <div className="w-full rounded-lg border overflow-hidden" style={{ height: totalHeight }}>
    <MapLibreMap
      boxZoom={false}
      cursor={cursor}
      doubleClickZoom={false}
      dragPan={false}
      dragRotate={false}
      initialViewState={{ latitude: 0, longitude: 0, zoom: INITIAL_ZOOM }}
      interactiveLayerIds={[LAYER_ID]}
      key={sdfSpriteUrl}
      keyboard={false}
      mapStyle={mapStyle}
      onClick={handleClick}
      onLoad={rebuildGrid}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      ref={mapRef}
      scrollZoom={false}
      style={{ height: '100%', width: '100%' }}
      touchPitch={false}
      touchZoomRotate={false}
    >
      <Source data={gridData} id={SOURCE_ID} type="geojson">
        <Layer
          id={LAYER_ID}
          layout={{
            'icon-allow-overlap': true,
            'icon-ignore-placement': true,
            'icon-image': ['get', 'icon'],
            'icon-size': iconSize,
            'text-allow-overlap': true,
            'text-anchor': 'top',
            'text-field': ['get', 'label'],
            'text-font': ['Arial Regular', 'Helvetica Regular'],
            'text-ignore-placement': true,
            'text-max-width': 8,
            'text-offset': [0, TEXT_OFFSET_Y],
            'text-size': 13,
          }}
          paint={{
            'icon-color': iconColor,
            'icon-halo-blur': haloBlur,
            'icon-halo-color': haloColor,
            'icon-halo-width': haloWidth,
            'text-color': '#6b7280',
            'text-halo-color': '#f9fafb',
            'text-halo-width': 1,
          }}
          type="symbol"
        />
      </Source>
    </MapLibreMap>
    </div>
  );
}
