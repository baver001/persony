import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { PersonyAuthProvider } from './components/PersonyAuthProvider.tsx';
import './i18n';
import './index.css';

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('Persony root element #root was not found');
}

createRoot(rootEl).render(
  <StrictMode>
    <PersonyAuthProvider>
      <App />
    </PersonyAuthProvider>
  </StrictMode>
);
