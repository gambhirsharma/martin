import { Download } from 'lucide-react';
import { Suspense, useCallback, useState } from 'react';
import { LoadingSpinner } from '@/components/loading/loading-spinner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { SpriteCollection } from '@/lib/types';
import { SpritePreview } from '../sprite/SpritePreview';
import {
  DEFAULT_TOOLBAR_SETTINGS,
  SpritePreviewToolbar,
  type SpriteToolbarSettings,
} from '../sprite/SpritePreviewToolbar';

interface SpritePreviewDialogProps {
  name: string;
  sprite: SpriteCollection;
  onCloseAction: () => void;
  onDownloadAction: (sprite: SpriteCollection) => void;
}

export function SpritePreviewDialog({
  name,
  sprite,
  onDownloadAction,
  onCloseAction,
}: SpritePreviewDialogProps) {
  const [settings, setSettings] = useState<SpriteToolbarSettings>(DEFAULT_TOOLBAR_SETTINGS);

  const handleSettingChange = useCallback(
    <K extends keyof SpriteToolbarSettings>(key: K, value: SpriteToolbarSettings[K]) => {
      setSettings((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

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

            <SpritePreviewToolbar onChange={handleSettingChange} settings={settings} />

            <div className="bg-gray-50 rounded-lg text-gray-900 px-4 pb-5 pt-5 mt-1">
              <Suspense
                fallback={
                  <div className="flex justify-center py-12">
                    <LoadingSpinner size="lg" />
                  </div>
                }
              >
                <SpritePreview
                  className="w-full grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4"
                  displaySize={settings.displaySize}
                  haloBlur={settings.haloBlur}
                  haloColor={settings.haloColor}
                  haloWidth={settings.haloWidth}
                  iconColor={settings.iconColor}
                  iconSize={settings.sdfScale}
                  sdfMode={settings.sdfMode}
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
