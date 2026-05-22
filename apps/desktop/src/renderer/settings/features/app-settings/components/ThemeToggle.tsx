import { Moon, Sun } from 'lucide-react';
import { Button } from '@shared/components/ui/button';
import { useQueryTheme } from '@settings/features/app-settings/hooks/useQueryTheme';
import { useMutationSetTheme } from '@settings/features/app-settings/hooks/useMutationSetTheme';
import { TypographyMuted } from '@shared/components/typography';

export function ThemeToggle() {
  const { data: theme, isLoading } = useQueryTheme();
  const setTheme = useMutationSetTheme();

  if (isLoading || !theme) {
    return <TypographyMuted>Loading…</TypographyMuted>;
  }

  const next = theme === 'dark' ? 'light' : 'dark';
  const Icon = next === 'dark' ? Moon : Sun;

  return (
    <Button variant="outline" onClick={() => setTheme.mutate(next)}>
      <Icon className="size-4" />
      Switch to {next} mode
    </Button>
  );
}
