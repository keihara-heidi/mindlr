import { Loader2 } from 'lucide-react';
import { LiveTranscript } from '@notch/features/live-transcript';

export function PostProcessingContent() {
  return (
    <>
      <Loader2 className="text-muted-foreground size-3.5 shrink-0 animate-spin" />
      <LiveTranscript />
    </>
  );
}
