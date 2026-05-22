import { Button } from '@shared/components/ui/button';
import { useQueryTheme } from '../hooks/useQueryTheme';
import { useMutationSetTheme } from '../hooks/useMutationSetTheme';
import { TypographyMuted } from '@shared/components/typography';

export function ThemeToggle() {
  const { data: theme, isLoading } = useQueryTheme();
  const setTheme = useMutationSetTheme();

  if (isLoading || !theme) {
    return <TypographyMuted>Loading…</TypographyMuted>;
  }

  const next = theme === 'dark' ? 'light' : 'dark';

  return (
    <Button variant="outline" onClick={() => setTheme.mutate(next)}>
      Switch to {next} mode
    </Button>
  );
}
