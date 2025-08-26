import './assets/main.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ThemeProvider } from './components/theme/theme-provider';
import { TooltipProvider } from './components/ui/tooltip';
import { Toaster } from './components/ui/sonner';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      <TooltipProvider delayDuration={300}>
        <Toaster />
        <App />
      </TooltipProvider>
    </ThemeProvider>
  </StrictMode>
);
