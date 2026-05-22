import { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NotchPill, useNotchState } from '@notch/features/notch-pill';
import { useDbChangeSync } from '@shared/db/useDbChangeSync';

function DbSyncBridge() {
  useDbChangeSync();
  return null;
}

function ThemeApplier() {
  const { theme } = useNotchState();
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);
  return null;
}

export default function App() {
  const [qc] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: false, refetchOnWindowFocus: false },
        },
      }),
  );

  return (
    <QueryClientProvider client={qc}>
      <DbSyncBridge />
      <ThemeApplier />
      <NotchPill />
    </QueryClientProvider>
  );
}
