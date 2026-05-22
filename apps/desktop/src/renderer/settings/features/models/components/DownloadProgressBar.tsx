import { CircleAlert, Loader2 } from 'lucide-react';
import { Progress } from '@shared/components/ui/progress';
import { TypographyMuted } from '@shared/components/typography';
import { formatBytes } from '@settings/features/models/utils/displayName';
import type { ModelsProgressEvent } from '@mindlr/ipc-contracts';

interface Props {
  event: ModelsProgressEvent;
}

export function DownloadProgressBar({ event }: Props) {
  const { phase, totalBytes, totalDownloaded, currentFile, error } = event;
  const pct = totalBytes > 0 ? Math.min(100, (totalDownloaded / totalBytes) * 100) : 0;

  const label = (() => {
    if (phase === 'probing') return 'Resolving file sizes…';
    if (phase === 'downloading') {
      const tail = currentFile.split('/').at(-1) ?? currentFile;
      return `${formatBytes(totalDownloaded)} / ${formatBytes(totalBytes)} — ${tail}`;
    }
    if (phase === 'done') return 'Download complete';
    if (phase === 'canceled') return 'Canceled';
    if (phase === 'error') return error ?? 'Download failed';
    return '';
  })();

  const showSpinner = phase === 'probing' || phase === 'downloading';
  const showError = phase === 'error';

  return (
    <div className="space-y-1.5">
      <Progress value={pct} className="h-3" />
      <div className="text-muted-foreground flex items-center gap-1.5">
        {showSpinner ? <Loader2 className="size-3.5 animate-spin" /> : null}
        {showError ? <CircleAlert className="size-3.5 text-destructive" /> : null}
        <TypographyMuted>{label}</TypographyMuted>
      </div>
    </div>
  );
}
