import { createFileRoute } from '@tanstack/react-router';
import { TypographyMuted } from '@shared/components/typography';

export const Route = createFileRoute('/hotkeys')({
  component: () => <TypographyMuted>Hotkeys — coming in Phase 5.</TypographyMuted>,
});
