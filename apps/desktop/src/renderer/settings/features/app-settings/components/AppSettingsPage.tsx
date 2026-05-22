import { ThemeToggle } from '@settings/features/app-settings/components/ThemeToggle';
import { useQueryTheme } from '@settings/features/app-settings/hooks/useQueryTheme';
import {
  TypographyH2,
  TypographyMuted,
  TypographyInlineCode,
} from '@shared/components/typography';

export function AppSettingsPage() {
  const { data: theme } = useQueryTheme();

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <TypographyH2 className="border-0 pb-0">Appearance</TypographyH2>
        <TypographyMuted>
          Current theme: <TypographyInlineCode>{theme ?? '—'}</TypographyInlineCode>
        </TypographyMuted>
      </div>
      <ThemeToggle />
    </div>
  );
}
