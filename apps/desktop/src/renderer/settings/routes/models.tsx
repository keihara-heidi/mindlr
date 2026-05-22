import { createFileRoute } from '@tanstack/react-router';
import { TypographyMuted } from '@shared/components/typography';

export const Route = createFileRoute('/models')({
  component: () => <TypographyMuted>Models — coming in Phase 2.</TypographyMuted>,
});
