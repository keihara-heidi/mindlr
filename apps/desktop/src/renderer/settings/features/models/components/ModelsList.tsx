import type { ModelCatalogEntry, ModelsProgressEvent } from '@mindlr/ipc-contracts';
import { ModelRow } from '@settings/features/models/components/ModelRow';

interface Props {
  entries: ModelCatalogEntry[];
  downloadedByRepoId: ReadonlyMap<string, number>;
  activeRepoId: string | null;
  activeRadioName: string;
  progressByRepoId: ReadonlyMap<string, ModelsProgressEvent>;
  onDownload: (repoId: string) => void;
  onCancel: (repoId: string) => void;
  onDelete: (repoId: string) => void;
  onSetActive: (repoId: string) => void;
}

export function ModelsList({
  entries,
  downloadedByRepoId,
  activeRepoId,
  activeRadioName,
  progressByRepoId,
  onDownload,
  onCancel,
  onDelete,
  onSetActive,
}: Props) {
  return (
    <div className="space-y-3">
      {entries.map((entry) => (
        <ModelRow
          key={entry.repoId}
          entry={entry}
          downloadedBytes={downloadedByRepoId.get(entry.repoId) ?? null}
          isActive={activeRepoId === entry.repoId}
          activeRadioName={activeRadioName}
          progress={progressByRepoId.get(entry.repoId)}
          onDownload={onDownload}
          onCancel={onCancel}
          onDelete={onDelete}
          onSetActive={onSetActive}
        />
      ))}
    </div>
  );
}
