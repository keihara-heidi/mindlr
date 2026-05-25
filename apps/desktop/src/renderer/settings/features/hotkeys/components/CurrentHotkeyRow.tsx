import { Badge } from '@shared/components/ui/badge';
import { TypographyLarge, TypographyMuted } from '@shared/components/typography';
import { useQueryHotkeyCombo } from '@settings/features/hotkeys/hooks/useQueryHotkeyCombo';
import { formatCombo } from '@settings/features/hotkeys/utils/formatCombo';

export function CurrentHotkeyRow() {
  const { data: combo, isLoading } = useQueryHotkeyCombo();
  if (isLoading || !combo) return <TypographyMuted>Loading…</TypographyMuted>;
  return (
    <div className="flex items-center gap-3">
      <TypographyMuted>Current trigger</TypographyMuted>
      <Badge variant="secondary">
        <TypographyLarge className="font-mono">{formatCombo(combo)}</TypographyLarge>
      </Badge>
    </div>
  );
}
