import { createFileRoute } from '@tanstack/react-router';
import { AppSettingsPage } from '@settings/features/app-settings';

export const Route = createFileRoute('/')({
  component: AppSettingsPage,
});
