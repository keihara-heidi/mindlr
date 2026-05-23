import { useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useRecordingController } from '@notch/features/dictation-pipeline';
import { cn } from '@shared/lib/utils';
import { usePillHover } from '@notch/features/notch-pill/hooks/usePillHover';
import { IdleContent } from '@notch/features/notch-pill/components/IdleContent';
import { RecordingContent } from '@notch/features/notch-pill/components/RecordingContent';
import { PostProcessingContent } from '@notch/features/notch-pill/components/PostProcessingContent';
import type { RecordingPhase } from '@notch/features/dictation-pipeline';

// Animate width / height directly (not via `layout`) so the children render
// at their natural size — `layout` uses transform: scale() which distorts
// text and icons during the morph.
const PILL_SIZE: Record<RecordingPhase, { width: number; height: number }> = {
  idle: { width: 40, height: 40 },
  recording: { width: 600, height: 44 },
  'post-processing': { width: 480, height: 40 },
};

const PILL_SPRING = { type: 'spring' as const, stiffness: 380, damping: 32, mass: 0.6 };
const CONTENT_TWEEN = { duration: 0.18, ease: 'easeOut' as const };

export function NotchPill() {
  const { phase, toggleRecording } = useRecordingController();
  const pillRef = useRef<HTMLDivElement | null>(null);
  usePillHover(pillRef);

  return (
    <div className="relative h-full w-full">
      <motion.div
        ref={pillRef}
        animate={PILL_SIZE[phase]}
        transition={PILL_SPRING}
        className={cn(
          'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
          'flex items-center justify-center gap-2 overflow-hidden rounded-lg',
          'bg-card/85 text-card-foreground ring-border backdrop-blur-md ring-1',
          phase === 'idle' && 'p-1',
          phase === 'recording' && 'p-1 pl-3',
          phase === 'post-processing' && 'p-1 pl-3',
        )}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={phase}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={CONTENT_TWEEN}
            className="flex w-full items-center gap-2"
          >
            {phase === 'idle' && <IdleContent onStart={toggleRecording} />}
            {phase === 'recording' && <RecordingContent onStop={toggleRecording} />}
            {phase === 'post-processing' && <PostProcessingContent />}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
