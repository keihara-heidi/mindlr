import {
  TypographyH2,
  TypographyMuted,
  TypographyP,
} from '@shared/components/typography';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/components/ui/card';
import { CurrentHotkeyRow } from '@settings/features/hotkeys/components/CurrentHotkeyRow';
import { CaptureButton } from '@settings/features/hotkeys/components/CaptureButton';

export function HotkeysPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <TypographyH2 className="border-0 pb-0">Hotkey</TypographyH2>
        <TypographyMuted>
          Press and hold the trigger key to dictate; release to finish. Double-tap the
          same key for hands-free mode (press again or Escape to stop).
        </TypographyMuted>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Trigger</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <CurrentHotkeyRow />
          <CaptureButton />
          <TypographyP className="text-muted-foreground text-sm">
            Click <span className="font-medium">Record combo</span>, then press your new
            trigger. We save it as soon as a key is detected.
          </TypographyP>
        </CardContent>
      </Card>
    </div>
  );
}
