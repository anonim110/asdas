import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { Toaster } from './components/Toaster';
import { primeAudioOnInteraction } from './lib/sound';
import { queryClient } from './lib/queryClient';
import './lib/enhance'; // PWA install/offline + keyboard shortcuts
import '@fontsource-variable/manrope'; // Aurora UI typeface (bundled, CSP-safe)
import './index.css';

primeAudioOnInteraction();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <Toaster />
    </QueryClientProvider>
  </React.StrictMode>,
);
