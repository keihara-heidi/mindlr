import { Mic, Square } from 'lucide-react';
import { Button } from '@shared/components/ui/button';
import { LiveTranscript } from '@notch/features/live-transcript';

interface Props {
  onStop: () => void;
}

export function RecordingState({ onStop }: Props) {
  return (
    <div className="bg-card/90 text-card-foreground ring-border flex h-12 w-full items-center gap-3 rounded-2xl px-3 backdrop-blur-md ring-1">
      <Mic className="text-destructive size-4 animate-pulse" />
      <LiveTranscript />
      <Button size="sm" variant="destructive" className="shrink-0" onClick={onStop}>
        <Square className="size-3.5" />
        Stop
      </Button>
    </div>
  );
}
