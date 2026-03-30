import { Download } from 'lucide-react';
import { Suspense, useId, useState } from 'react';
import { LoadingSpinner } from '@/components/loading/loading-spinner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import type { SpriteCollection } from '@/lib/types';
import { SpritePreview } from '../sprite/SpritePreview';

interface SpritePreviewDialogProps {
  name: string;
  sprite: SpriteCollection;
  onCloseAction: () => void;
  onDownloadAction: (sprite: SpriteCollection) => void;
}

const SIZE_MIN = 16;
const SIZE_MAX = 128;
const SIZE_DEFAULT = 80;

const HALO_DEFAULT = 0;
const HALO_MAX = 0.4;

export function SpritePreviewDialog({
  name,
  sprite,
  onDownloadAction,
  onCloseAction,
}: SpritePreviewDialogProps) {
  const uid = useId();
  const iconColorId = `${uid}-icon-color`;
  const haloColorId = `${uid}-halo-color`;

  const [sdfMode, setSdfMode] = useState(false);
  const [displaySize, setDisplaySize] = useState(SIZE_DEFAULT);
  const [iconColor, setIconColor] = useState('#1a1a2e');
  const [haloColor, setHaloColor] = useState('#ffffff');
  const [haloWidth, setHaloWidth] = useState(HALO_DEFAULT);

  return (
    <Dialog onOpenChange={(v) => !v && onCloseAction()} open={true}>
      <DialogContent className="max-w-4xl w-full p-6 max-h-[80vh] overflow-auto">
        {sprite && (
          <>
            <DialogHeader className="mb-4 truncate">
              <DialogTitle className="text-2xl flex gap-4">{name}</DialogTitle>
              <DialogDescription>
                <span>Preview the selected sprite.</span>
                <br />
                <Button onClick={() => onDownloadAction(sprite)} size="sm" variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </DialogDescription>
            </DialogHeader>

            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-4 mb-4 p-3 rounded-lg border bg-muted/40">
              {/* SDF / PNG toggle */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground select-none">PNG</span>
                <Switch
                  aria-label="Toggle SDF mode"
                  checked={sdfMode}
                  onCheckedChange={setSdfMode}
                />
                <Badge
                  className={
                    sdfMode
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-blue-100 text-blue-800'
                  }
                  variant="secondary"
                >
                  {sdfMode ? 'SDF' : 'PNG'}
                </Badge>
              </div>

              <div className="h-5 w-px bg-border" />

              {/* Size slider */}
              <div className="flex items-center gap-2 min-w-[160px]">
                <span className="text-sm font-medium text-muted-foreground select-none whitespace-nowrap">
                  Size: {displaySize}px
                </span>
                <input
                  aria-label="Sprite display size"
                  className="w-24 accent-purple-600 cursor-pointer"
                  max={SIZE_MAX}
                  min={SIZE_MIN}
                  onChange={(e) => setDisplaySize(Number(e.target.value))}
                  step={4}
                  type="range"
                  value={displaySize}
                />
              </div>

              {/* SDF-only controls */}
              {sdfMode && (
                <>
                  <div className="h-5 w-px bg-border" />

                  {/* Icon color */}
                  <div className="flex items-center gap-2">
                    <label
                      className="text-sm font-medium text-muted-foreground select-none whitespace-nowrap"
                      htmlFor={iconColorId}
                    >
                      Icon
                    </label>
                    <input
                      className="w-8 h-8 rounded cursor-pointer border border-border p-0.5 bg-transparent"
                      id={iconColorId}
                      onChange={(e) => setIconColor(e.target.value)}
                      title="Icon color"
                      type="color"
                      value={iconColor}
                    />
                  </div>

                  {/* Halo color */}
                  <div className="flex items-center gap-2">
                    <label
                      className="text-sm font-medium text-muted-foreground select-none whitespace-nowrap"
                      htmlFor={haloColorId}
                    >
                      Halo
                    </label>
                    <input
                      className="w-8 h-8 rounded cursor-pointer border border-border p-0.5 bg-transparent"
                      id={haloColorId}
                      onChange={(e) => setHaloColor(e.target.value)}
                      title="Halo color"
                      type="color"
                      value={haloColor}
                    />
                  </div>

                  {/* Halo width slider */}
                  <div className="flex items-center gap-2 min-w-[160px]">
                    <span className="text-sm font-medium text-muted-foreground select-none whitespace-nowrap">
                      Halo: {Math.round(haloWidth * 100)}%
                    </span>
                    <input
                      aria-label="Halo width"
                      className="w-24 accent-purple-600 cursor-pointer"
                      max={HALO_MAX}
                      min={0}
                      onChange={(e) => setHaloWidth(Number(e.target.value))}
                      step={0.01}
                      type="range"
                      value={haloWidth}
                    />
                  </div>
                </>
              )}
            </div>

            <div className="bg-gray-50 rounded-lg text-gray-900">
              <Suspense
                fallback={
                  <div className="flex justify-center py-12">
                    <LoadingSpinner size="lg" />
                  </div>
                }
              >
                <SpritePreview
                  className="w-full grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4"
                  displaySize={displaySize}
                  haloColor={haloColor}
                  haloWidth={haloWidth}
                  iconColor={iconColor}
                  sdfMode={sdfMode}
                  spriteIds={sprite.images}
                  spriteUrl={`/sprite/${name}`}
                />
              </Suspense>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
