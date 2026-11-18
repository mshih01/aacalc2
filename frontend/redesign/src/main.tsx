import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import BetaApp from './BetaApp.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BetaApp />
  </StrictMode>,
);
