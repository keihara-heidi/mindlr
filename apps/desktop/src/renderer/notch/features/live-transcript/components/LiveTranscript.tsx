import { useAtomValue } from 'jotai';
import {
  finalTranscriptAtom,
  liveTokensAtom,
} from '@notch/features/dictation-pipeline/atoms';
import { TypographySmall } from '@shared/components/typography';

export function LiveTranscript() {
  const live = useAtomValue(liveTokensAtom);
  const final = useAtomValue(finalTranscriptAtom);

  if (final && final.length > 0) {
    return (
      <div className="text-foreground min-w-0 flex-1 truncate">
        <TypographySmall>{final.map((w) => w.text).join(' ')}</TypographySmall>
      </div>
    );
  }

  const hasLive = live.committed.length > 0 || live.tentative.length > 0;
  if (!hasLive) {
    return (
      <div className="text-muted-foreground min-w-0 flex-1 truncate">
        <TypographySmall>Listening…</TypographySmall>
      </div>
    );
  }

  return (
    <div className="min-w-0 flex-1 truncate">
      <TypographySmall>
        <span className="text-foreground">
          {live.committed.map((w) => w.text).join(' ')}
        </span>
        {live.committed.length > 0 && live.tentative.length > 0 ? ' ' : ''}
        <span className="text-muted-foreground">
          {live.tentative.map((w) => w.text).join(' ')}
        </span>
      </TypographySmall>
    </div>
  );
}
