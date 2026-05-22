import { Mic } from 'lucide-react';
import { Button } from '@shared/components/ui/button';
import { TypographySmall } from '@shared/components/typography';

interface Props {
  onStart: () => void;
}

export function IdleState({ onStart }: Props) {
  return (
    <div className="bg-card/85 text-card-foreground ring-border flex h-7 items-center gap-2 rounded-full px-2 backdrop-blur-md ring-1">
      <Button size="sm" variant="ghost" className="h-5 gap-1.5 px-2" onClick={onStart}>
        <Mic className="size-3.5" />
        <TypographySmall>Mindlr</TypographySmall>
      </Button>
    </div>
  );
}
