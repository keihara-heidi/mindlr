import { Outlet, Link, createRootRoute } from '@tanstack/react-router';
import { useEffect, type ComponentType } from 'react';
import { Boxes, Clock, Keyboard, Sliders } from 'lucide-react';
import { useQueryTheme } from '@settings/features/app-settings';
import { TypographySmall } from '@shared/components/typography';
import { cn } from '@shared/lib/utils';

interface NavItem {
  to: '/' | '/models' | '/hotkeys' | '/history';
  label: string;
  Icon: ComponentType<{ className?: string }>;
}

const NAV: readonly NavItem[] = [
  { to: '/', label: 'General', Icon: Sliders },
  { to: '/models', label: 'Models', Icon: Boxes },
  { to: '/hotkeys', label: 'Hotkeys', Icon: Keyboard },
  { to: '/history', label: 'History', Icon: Clock },
];

function RootLayout() {
  const { data: theme } = useQueryTheme();

  useEffect(() => {
    if (!theme) return;
    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  return (
    <div className="bg-background text-foreground flex h-screen w-screen">
      <aside className="bg-sidebar text-sidebar-foreground border-sidebar-border flex w-56 flex-col gap-1 border-r p-3 pt-10">
        <div className="text-muted-foreground px-2 pb-3 text-xs font-semibold tracking-wider uppercase">
          Mindlr
        </div>
        {NAV.map(({ to, label, Icon }) => (
          <Link
            key={to}
            to={to}
            activeProps={{ className: 'bg-sidebar-accent text-sidebar-accent-foreground' }}
            inactiveProps={{ className: 'text-muted-foreground hover:bg-sidebar-accent/60' }}
            className={cn('flex items-center gap-2 rounded-md px-3 py-1.5')}
          >
            <Icon className="size-4" />
            <TypographySmall>{label}</TypographySmall>
          </Link>
        ))}
      </aside>
      <main className="flex-1 overflow-auto p-8">
        <Outlet />
      </main>
    </div>
  );
}

export const Route = createRootRoute({ component: RootLayout });
