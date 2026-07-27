import { useId } from 'react';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

export interface SpriteToolbarSettings {
  sdfMode: boolean;
  displaySize: number;
  sdfScale: number;
  iconColor: string;
  haloColor: string;
  haloWidth: number;
  haloBlur: number;
}

export const SIZE_MIN = 16;
export const SIZE_MAX = 128;
export const SIZE_DEFAULT = 80;

const SDF_SCALE_MIN = 0.5;
const SDF_SCALE_MAX = 5;
export const SDF_SCALE_DEFAULT = 2;

export const HALO_DEFAULT = 0;
const HALO_MAX = 10;
export const HALO_BLUR_DEFAULT = 0;
const HALO_BLUR_MAX = 10;

export const DEFAULT_TOOLBAR_SETTINGS: SpriteToolbarSettings = {
  sdfMode: false,
  displaySize: SIZE_DEFAULT,
  sdfScale: SDF_SCALE_DEFAULT,
  iconColor: '#1a1a2e',
  haloColor: '#ffffff',
  haloWidth: HALO_DEFAULT,
  haloBlur: HALO_BLUR_DEFAULT,
};

interface SpritePreviewToolbarProps {
  settings: SpriteToolbarSettings;
  onChange: <K extends keyof SpriteToolbarSettings>(
    key: K,
    value: SpriteToolbarSettings[K],
  ) => void;
}

export function SpritePreviewToolbar({ settings, onChange }: SpritePreviewToolbarProps) {
  const uid = useId();
  const iconColorId = `${uid}-icon-color`;
  const haloColorId = `${uid}-halo-color`;

  const { sdfMode, displaySize, sdfScale, iconColor, haloColor, haloWidth, haloBlur } = settings;

  return (
    <div className="flex flex-nowrap items-center gap-4 mb-4 p-3 rounded-lg border bg-muted/40 overflow-x-auto">
      <div className="flex shrink-0 items-center gap-2">
        {!sdfMode ? (
          <Badge
            className="border-transparent bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200"
            variant="secondary"
          >
            PNG
          </Badge>
        ) : (
          <span className="text-sm font-medium text-muted-foreground select-none px-2 py-0.5">
            PNG
          </span>
        )}
        <Switch
          aria-label="Toggle SDF mode"
          checked={sdfMode}
          onCheckedChange={(v) => onChange('sdfMode', v)}
        />
        {sdfMode ? (
          <Badge
            className="border-transparent bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200"
            variant="secondary"
          >
            SDF
          </Badge>
        ) : (
          <span className="text-sm font-medium text-muted-foreground select-none px-2 py-0.5">
            SDF
          </span>
        )}
      </div>

      <div className="h-5 w-px bg-border shrink-0" />

      <div className="flex shrink-0 items-center gap-2 min-w-[160px]">
        {sdfMode ? (
          <>
            <span className="text-sm font-medium text-muted-foreground select-none whitespace-nowrap">
              Scale: {sdfScale.toFixed(1)}×
            </span>
            <input
              aria-label="SDF icon scale"
              className="w-24 accent-purple-600 cursor-pointer"
              max={SDF_SCALE_MAX}
              min={SDF_SCALE_MIN}
              onChange={(e) => onChange('sdfScale', Number(e.target.value))}
              step={0.1}
              type="range"
              value={sdfScale}
            />
          </>
        ) : (
          <>
            <span className="text-sm font-medium text-muted-foreground select-none whitespace-nowrap">
              Size: {displaySize}px
            </span>
            <input
              aria-label="Sprite display size"
              className="w-24 accent-purple-600 cursor-pointer"
              max={SIZE_MAX}
              min={SIZE_MIN}
              onChange={(e) => onChange('displaySize', Number(e.target.value))}
              step={4}
              type="range"
              value={displaySize}
            />
          </>
        )}
      </div>

      <div
        aria-hidden={!sdfMode}
        className={cn(
          'flex shrink-0 items-center gap-4',
          !sdfMode && 'invisible pointer-events-none select-none',
        )}
      >
        <div className="h-5 w-px bg-border shrink-0" />

        <div className="flex items-center gap-2">
          <label
            className="text-sm font-medium text-muted-foreground select-none whitespace-nowrap"
            htmlFor={iconColorId}
          >
            Icon
          </label>
          <input
            className="w-8 h-8 rounded cursor-pointer border border-border p-0.5 bg-transparent"
            disabled={!sdfMode}
            id={iconColorId}
            onChange={(e) => onChange('iconColor', e.target.value)}
            title="Icon color"
            type="color"
            value={iconColor}
          />
        </div>

        <div className="flex items-center gap-2">
          <label
            className="text-sm font-medium text-muted-foreground select-none whitespace-nowrap"
            htmlFor={haloColorId}
          >
            Halo
          </label>
          <input
            className="w-8 h-8 rounded cursor-pointer border border-border p-0.5 bg-transparent"
            disabled={!sdfMode}
            id={haloColorId}
            onChange={(e) => onChange('haloColor', e.target.value)}
            title="Halo color"
            type="color"
            value={haloColor}
          />
        </div>

        <div className="flex items-center gap-2 min-w-[150px]">
          <span className="text-sm font-medium text-muted-foreground select-none whitespace-nowrap">
            Halo: {haloWidth}px
          </span>
          <input
            aria-label="Halo width"
            className="w-24 accent-purple-600 cursor-pointer"
            disabled={!sdfMode}
            max={HALO_MAX}
            min={0}
            onChange={(e) => onChange('haloWidth', Number(e.target.value))}
            step={0.5}
            type="range"
            value={haloWidth}
          />
        </div>

        <div className="flex items-center gap-2 min-w-[150px]">
          <span className="text-sm font-medium text-muted-foreground select-none whitespace-nowrap">
            Blur: {haloBlur}px
          </span>
          <input
            aria-label="Halo blur"
            className="w-24 accent-purple-600 cursor-pointer"
            disabled={!sdfMode}
            max={HALO_BLUR_MAX}
            min={0}
            onChange={(e) => onChange('haloBlur', Number(e.target.value))}
            step={0.5}
            type="range"
            value={haloBlur}
          />
        </div>
      </div>
    </div>
  );
}
