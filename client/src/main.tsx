import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { Toaster } from './components/Toaster';
import { primeAudioOnInteraction } from './lib/sound';
import './lib/enhance'; // PWA install/offline + keyboard shortcuts
import '@fontsource-variable/manrope'; // Aurora UI typeface (bundled, CSP-safe)
import './index.css';

primeAudioOnInteraction();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <Toaster />
    </QueryClientProvider>
  </React.StrictMode>,
);
