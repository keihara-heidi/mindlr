import { useState } from 'react';
import { Download, Sparkles, Trash2, X } from 'lucide-react';
import type { ModelCatalogEntry, ModelsProgressEvent } from '@mindlr/ipc-contracts';
import { Badge } from '@shared/components/ui/badge';
import { Button } from '@shared/components/ui/button';
import { Card, CardContent } from '@shared/components/ui/card';
import { RadioGroupItem } from '@shared/components/ui/radio-group';
import { TypographyLarge, TypographyMuted } from '@shared/components/typography';
import { DownloadProgressBar } from '@settings/features/models/components/DownloadProgressBar';
import { DeleteConfirmDialog } from '@settings/features/models/components/DeleteConfirmDialog';
import { formatBytes } from '@settings/features/models/utils/displayName';

interface Props {
  entry: ModelCatalogEntry;
  downloadedBytes: number | null;
  isActive: boolean;
  activeRadioName: string;
  progress: ModelsProgressEvent | undefined;
  onDownload: (repoId: string) => void;
  onCancel: (repoId: string) => void;
  onDelete: (repoId: string) => void;
  onSetActive: (repoId: string) => void;
}

export function ModelRow({
  entry,
  downloadedBytes,
  isActive,
  activeRadioName,
  progress,
  onDownload,
  onCancel,
  onDelete,
  onSetActive,
}: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isDownloaded = downloadedBytes !== null;
  const isInFlight =
    progress !== undefined && (progress.phase === 'probing' || progress.phase === 'downloading');

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            {isDownloaded ? (
              <RadioGroupItem
                value={entry.repoId}
                id={`${activeRadioName}-${entry.repoId}`}
                checked={isActive}
                onClick={() => onSetActive(entry.repoId)}
              />
            ) : (
              <div className="size-4" aria-hidden />
            )}
            <div className="min-w-0 flex-1 space-y-2">
              <div className="space-y-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <TypographyLarge>{entry.displayName}</TypographyLarge>
                  {entry.recommended ? (
                    <Badge variant="secondary">
                      <Sparkles className="size-3" />
                      Recommended
                    </Badge>
                  ) : null}
                  {isActive ? <Badge>Active</Badge> : null}
                </div>
                <TypographyMuted>
                  {entry.repoId}
                  {isDownloaded ? ` · ${formatBytes(downloadedBytes)}` : ''}
                </TypographyMuted>
              </div>
              {progress ? <DownloadProgressBar event={progress} /> : null}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {!isDownloaded && !isInFlight ? (
              <Button onClick={() => onDownload(entry.repoId)}>
                <Download className="size-4" />
                Download
              </Button>
            ) : null}
            {isInFlight ? (
              <Button variant="outline" onClick={() => onCancel(entry.repoId)}>
                <X className="size-4" />
                Cancel
              </Button>
            ) : null}
            {isDownloaded && !isInFlight ? (
              <Button variant="destructive" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="size-4" />
                Delete
              </Button>
            ) : null}
          </div>
        </div>
      </CardContent>

      <DeleteConfirmDialog
        open={confirmDelete}
        displayName={entry.displayName}
        onConfirm={() => {
          setConfirmDelete(false);
          onDelete(entry.repoId);
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </Card>
  );
}
