import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import './styles/globals.css';
import './styles/themes.css';
import { App } from './App.tsx';
import { seedBooks } from '@/lib/db/seed';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element #root não encontrado.');

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Dexie é local — não há latência de rede. Re-fetch só quando invalidado.
      staleTime: 60_000,
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

if (import.meta.env.DEV) {
  void seedBooks().catch((err) => {
    console.error('[dev] seedBooks falhou:', err);
  });
}

createRoot(rootEl).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
