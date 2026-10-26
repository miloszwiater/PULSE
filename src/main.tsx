import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/onest';
import '@fontsource-variable/bodoni-moda/opsz.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/ui.css';
import './styles/app.css';
import './styles/create.css';
import './styles/today.css';
import './styles/plan.css';
import './styles/learn.css';
import './styles/rest.css';
import { App } from './app/App';
import { registerServiceWorker } from './app/pwa';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

registerServiceWorker();
