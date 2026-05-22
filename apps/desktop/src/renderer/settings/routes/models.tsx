import { createFileRoute } from '@tanstack/react-router';
import { ModelsPage } from '@settings/features/models';

export const Route = createFileRoute('/models')({
  component: ModelsPage,
});
