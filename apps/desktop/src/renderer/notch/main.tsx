import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from '@notch/App';
import { installDevHelpers } from '@notch/lib/devHelpers';
import '@shared/styles/globals.css';
import '@notch/notch.css';

if (import.meta.env.DEV) {
  installDevHelpers();
}

const container = document.getElementById('root');
if (!container) throw new Error('root element not found');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
