import { createFileRoute } from '@tanstack/react-router';
import { HotkeysPage } from '@settings/features/hotkeys';

export const Route = createFileRoute('/hotkeys')({
  component: HotkeysPage,
});
