import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createRouter, createHashHistory } from '@tanstack/react-router';
import { routeTree } from '@settings/routeTree.gen';
import { useDbChangeSync } from '@shared/db/useDbChangeSync';

const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  // Hash routing keeps the URL inside the loaded HTML doc; otherwise Vite
  // tries to serve `/models` etc. and 404s.
  history: createHashHistory(),
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

function DbSyncBridge() {
  useDbChangeSync();
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
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
