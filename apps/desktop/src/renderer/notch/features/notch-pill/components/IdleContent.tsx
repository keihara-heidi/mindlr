import { Mic } from 'lucide-react';
import { Button } from '@shared/components/ui/button';

interface Props {
  onStart: () => void;
}

export function IdleContent({ onStart }: Props) {
  return (
    <Button variant="ghost" size="icon-sm" aria-label="Start recording" onClick={onStart}>
      <Mic className="size-4" />
    </Button>
  );
}
