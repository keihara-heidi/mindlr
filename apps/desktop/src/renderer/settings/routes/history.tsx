import { createFileRoute } from '@tanstack/react-router';
import { TypographyMuted } from '@shared/components/typography';

export const Route = createFileRoute('/history')({
  component: () => <TypographyMuted>History — coming in Phase 6.</TypographyMuted>,
});
