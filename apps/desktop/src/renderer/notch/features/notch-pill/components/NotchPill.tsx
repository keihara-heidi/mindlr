import { useRecordingController } from '@notch/features/dictation-pipeline';
import { IdleState } from '@notch/features/notch-pill/components/IdleState';
import { RecordingState } from '@notch/features/notch-pill/components/RecordingState';
import { PostProcessingState } from '@notch/features/notch-pill/components/PostProcessingState';

export function NotchPill() {
  const { phase, toggleRecording } = useRecordingController();

  return (
    <div className="flex h-full w-full items-center justify-center p-1">
      {phase === 'idle' ? <IdleState onStart={toggleRecording} /> : null}
      {phase === 'recording' ? <RecordingState onStop={toggleRecording} /> : null}
      {phase === 'post-processing' ? <PostProcessingState /> : null}
    </div>
  );
}
