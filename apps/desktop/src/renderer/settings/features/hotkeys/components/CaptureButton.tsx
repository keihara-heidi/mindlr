import { useAtomValue } from 'jotai';
import { Keyboard, X } from 'lucide-react';
import { Button } from '@shared/components/ui/button';
import { TypographyMuted } from '@shared/components/typography';
import {
  hotkeyDraftAtom,
} from '@settings/features/hotkeys/atoms';
import { useHotkeyCaptureSession } from '@settings/features/hotkeys/hooks/useHotkeyCaptureSession';
import { formatCombo } from '@settings/features/hotkeys/utils/formatCombo';

export function CaptureButton() {
  const draft = useAtomValue(hotkeyDraftAtom);
  const { isCapturing, begin, cancel } = useHotkeyCaptureSession();

  if (isCapturing) {
    return (
      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={() => void cancel()}>
          <X className="size-4" />
          Cancel
        </Button>
        <TypographyMuted>
          {draft
            ? `Captured: ${formatCombo(draft)}`
            : 'Press your combo now…'}
        </TypographyMuted>
      </div>
    );
  }

  return (
    <Button onClick={() => void begin()}>
      <Keyboard className="size-4" />
      Record combo
    </Button>
  );
}
