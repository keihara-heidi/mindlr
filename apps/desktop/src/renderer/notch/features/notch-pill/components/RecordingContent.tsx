import { Mic, Square } from 'lucide-react';
import { Button } from '@shared/components/ui/button';
import { LiveTranscript } from '@notch/features/live-transcript';

interface Props {
  onStop: () => void;
}

export function RecordingContent({ onStop }: Props) {
  return (
    <>
      <Mic className="text-destructive size-4 shrink-0 animate-pulse" />
      <LiveTranscript />
      <div className="shrink-0">
        <Button variant="destructive" onClick={onStop}>
          <Square className="size-4" />
          Stop
        </Button>
      </div>
    </>
  );
}
