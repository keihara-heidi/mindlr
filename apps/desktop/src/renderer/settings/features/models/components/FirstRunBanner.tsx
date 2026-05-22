import { Download, Sparkles } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@shared/components/ui/alert';
import { Button } from '@shared/components/ui/button';
import { TypographyMuted } from '@shared/components/typography';

interface Props {
  recommendedDisplayName: string;
  onDownload: () => void;
  busy?: boolean;
}

export function FirstRunBanner({ recommendedDisplayName, onDownload, busy }: Props) {
  return (
    <Alert>
      <Sparkles className="size-4" />
      <AlertTitle>Pick a model to get started</AlertTitle>
      <AlertDescription>
        <div className="space-y-3">
          <TypographyMuted>
            We recommend {recommendedDisplayName} — a balanced speed/accuracy tradeoff for
            English dictation. You can download more models any time.
          </TypographyMuted>
          <Button onClick={onDownload} disabled={busy}>
            <Download className="size-4" />
            Download {recommendedDisplayName}
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
