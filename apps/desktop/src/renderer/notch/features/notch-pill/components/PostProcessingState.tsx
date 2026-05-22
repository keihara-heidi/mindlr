import { Loader2 } from 'lucide-react';
import { LiveTranscript } from '@notch/features/live-transcript';

export function PostProcessingState() {
  return (
    <div className="bg-card/90 text-card-foreground ring-border flex h-7 w-full items-center gap-2 rounded-full px-3 backdrop-blur-md ring-1">
      <Loader2 className="text-muted-foreground size-3.5 animate-spin" />
      <LiveTranscript />
    </div>
  );
}
