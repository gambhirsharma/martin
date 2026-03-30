import { Copy } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';
import type { SpriteMeta } from './SpriteCache';

type SpriteCanvasProps = {
  meta?: SpriteMeta;
  image?: HTMLImageElement;
  label: string;
  previewMode?: boolean;
  displaySize?: number;
};

const SpriteCanvas = ({
  meta,
  image,
  label,
  previewMode = false,
  displaySize,
}: SpriteCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { copy } = useCopyToClipboard({
    successMessage: `Sprite ID "${label}" copied to clipboard`,
  });

  const handleClick = () => copy(label);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !meta || !image) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, meta.width, meta.height);
    ctx.drawImage(image, meta.x, meta.y, meta.width, meta.height, 0, 0, meta.width, meta.height);
  }, [meta, image]);

  // Resolve the CSS display size
  const cssSize = displaySize ?? (previewMode ? 28 : 80);
  const sizeStyle = { width: cssSize, height: cssSize };

  if (previewMode) {
    return (
      <div className="flex flex-col items-center justify-center m-1.5" style={sizeStyle}>
        {!meta || !image ? (
          <div
            className="animate-pulse bg-purple-200 rounded-sm flex items-center justify-center"
            style={sizeStyle}
          />
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <canvas
                aria-label={`Icon for ${label}`}
                className="object-contain block cursor-pointer hover:opacity-75 transition-opacity"
                height={meta.height}
                onClick={handleClick}
                ref={canvasRef}
                style={sizeStyle}
                width={meta.width}
              />
            </TooltipTrigger>
            <TooltipContent>
              <p>
                Sprite:{' '}
                <code className="bg-purple-200 font-semibold font-monospace text-purple-950 p-1 m-1 rounded-xs">
                  {label}
                </code>
                <br />
                <div className="pt-4 text-sm flex gap-1 flex-row justify-center p-0.5">
                  <Copy className="h-4 w-4 mb-0.5" /> Click to copy
                </div>
              </p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          className="flex flex-col items-center justify-center m-4"
          onClick={handleClick}
          style={{ width: cssSize + 16, minHeight: cssSize + 40 }}
          type="button"
        >
          <div className="flex flex-1 items-center justify-center w-full">
            {!meta || !image ? (
              <div
                className="animate-pulse bg-purple-200 rounded-sm flex items-center justify-center cursor-pointer hover:bg-purple-300 transition-colors"
                style={sizeStyle}
              />
            ) : (
              <div className="flex items-center justify-center" style={sizeStyle}>
                <canvas
                  aria-label={`Icon for ${label}`}
                  className="object-contain block cursor-pointer hover:opacity-75 transition-opacity"
                  height={meta.height}
                  onClick={handleClick}
                  ref={canvasRef}
                  style={sizeStyle}
                  width={meta.width}
                />
              </div>
            )}
          </div>
          <code className="text-monospace text-sm text-gray-700 break-all text-center mt-2 cursor-pointer hover:text-gray-900 transition-colors">
            {label}
          </code>
        </button>
      </TooltipTrigger>
      <TooltipContent>
        <div className="text-xs flex flex-row gap-1 p-0.5">
          <Copy className="h-3 w-3 mb-0.5" /> Click to copy
        </div>
      </TooltipContent>
    </Tooltip>
  );
};

export default SpriteCanvas;
