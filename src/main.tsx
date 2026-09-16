import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { PersonyAuthProvider } from './components/PersonyAuthProvider.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PersonyAuthProvider>
      <App />
    </PersonyAuthProvider>
  </StrictMode>
);
