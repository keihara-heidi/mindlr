import { useMemo, useState } from 'react';
import { CircleAlert, Search } from 'lucide-react';
import {
  TypographyH2,
  TypographyMuted,
  TypographyH4,
  TypographySmall,
} from '@shared/components/typography';
import { RadioGroup } from '@shared/components/ui/radio-group';
import { Badge } from '@shared/components/ui/badge';
import { Input } from '@shared/components/ui/input';
import { Separator } from '@shared/components/ui/separator';
import { useQueryCatalog } from '@settings/features/models/hooks/useQueryCatalog';
import { useQueryDownloadedModels } from '@settings/features/models/hooks/useQueryDownloadedModels';
import { useQueryActiveModelId } from '@settings/features/models/hooks/useQueryActiveModelId';
import { useMutationDownloadModel } from '@settings/features/models/hooks/useMutationDownloadModel';
import { useMutationCancelDownload } from '@settings/features/models/hooks/useMutationCancelDownload';
import { useMutationDeleteModel } from '@settings/features/models/hooks/useMutationDeleteModel';
import { useMutationSetActiveModel } from '@settings/features/models/hooks/useMutationSetActiveModel';
import { useModelDownloadProgress } from '@settings/features/models/hooks/useModelDownloadProgress';
import { useFilteredCatalog } from '@settings/features/models/hooks/useFilteredCatalog';
import { ModelsList } from '@settings/features/models/components/ModelsList';
import { FirstRunBanner } from '@settings/features/models/components/FirstRunBanner';

const ACTIVE_RADIO_NAME = 'active-model';

export function ModelsPage() {
  const catalogQuery = useQueryCatalog();
  const downloadedQuery = useQueryDownloadedModels();
  const activeIdQuery = useQueryActiveModelId();

  const download = useMutationDownloadModel();
  const cancel = useMutationCancelDownload();
  const remove = useMutationDeleteModel();
  const setActive = useMutationSetActiveModel();
  const progressByRepoId = useModelDownloadProgress();

  const [search, setSearch] = useState('');

  const downloadedByRepoId = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of downloadedQuery.data ?? []) map.set(m.repoId, m.totalBytes);
    return map;
  }, [downloadedQuery.data]);

  const entries = useMemo(() => catalogQuery.data?.entries ?? [], [catalogQuery.data]);

  // "Yours" = anything you've downloaded OR are currently downloading.
  const { yours, available } = useMemo(() => {
    const yoursList = entries.filter(
      (e) => downloadedByRepoId.has(e.repoId) || progressByRepoId.has(e.repoId),
    );
    const yoursIds = new Set(yoursList.map((e) => e.repoId));
    const availableList = entries.filter((e) => !yoursIds.has(e.repoId));
    return { yours: yoursList, available: availableList };
  }, [entries, downloadedByRepoId, progressByRepoId]);

  const filteredAvailable = useFilteredCatalog(available, search);

  const recommended = entries.find((e) => e.recommended);
  const nothingDownloaded = (downloadedQuery.data ?? []).length === 0;

  const rowProps = {
    downloadedByRepoId,
    activeRepoId: activeIdQuery.data ?? null,
    activeRadioName: ACTIVE_RADIO_NAME,
    progressByRepoId,
    onDownload: (id: string) => download.mutate(id),
    onCancel: (id: string) => cancel.mutate(id),
    onDelete: (id: string) => remove.mutate(id),
    onSetActive: (id: string) => setActive.mutate(id),
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <TypographyH2 className="border-0 pb-0">Models</TypographyH2>
        <TypographyMuted>
          Whisper variants you can run locally. Pick one as the active model — it powers
          dictation.
        </TypographyMuted>
      </div>

      {catalogQuery.isLoading ? <TypographyMuted>Loading catalog…</TypographyMuted> : null}

      {catalogQuery.data?.source === 'fallback' ? (
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            <CircleAlert className="size-3" />
            Offline
          </Badge>
          <TypographySmall>
            Showing built-in fallback list — couldn&apos;t reach Hugging Face.
          </TypographySmall>
        </div>
      ) : null}

      {nothingDownloaded && recommended && !progressByRepoId.has(recommended.repoId) ? (
        <FirstRunBanner
          recommendedDisplayName={recommended.displayName}
          onDownload={() => download.mutate(recommended.repoId)}
          busy={download.isPending}
        />
      ) : null}

      <RadioGroup value={activeIdQuery.data ?? undefined} name={ACTIVE_RADIO_NAME}>
        {yours.length > 0 ? (
          <section className="space-y-3">
            <TypographyH4>Your models</TypographyH4>
            <ModelsList entries={yours} {...rowProps} />
          </section>
        ) : null}

        {yours.length > 0 && available.length > 0 ? <Separator /> : null}

        {available.length > 0 ? (
          <section className="space-y-3">
            <div className="flex items-baseline justify-between gap-3">
              <TypographyH4>Available</TypographyH4>
              <div className="relative max-w-xs flex-1">
                <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search models…"
                  className="pl-8"
                  type="search"
                />
              </div>
            </div>
            {filteredAvailable.length > 0 ? (
              <ModelsList entries={filteredAvailable} {...rowProps} />
            ) : (
              <TypographyMuted>No models match “{search}”.</TypographyMuted>
            )}
          </section>
        ) : null}
      </RadioGroup>
    </div>
  );
}
