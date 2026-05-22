import { useNotchState } from '@notch/features/notch-pill/hooks/useNotchState';
import { TypographySmall } from '@shared/components/typography';

export function NotchPill() {
  const { phase } = useNotchState();

  return (
    <div className="flex h-full w-full items-center justify-center px-3">
      <div className="bg-card/85 text-card-foreground ring-border flex h-7 items-center gap-2 rounded-full px-3 backdrop-blur-md ring-1">
        <span className="bg-primary size-2 rounded-full" aria-hidden />
        <TypographySmall>{phase === 'idle' ? 'Mindlr' : phase}</TypographySmall>
      </div>
    </div>
  );
}
