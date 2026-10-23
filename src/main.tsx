import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { ensureSeeded } from './db/db';
import './index.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element #root not found');
}

async function bootstrap() {
  await ensureSeeded();

  createRoot(rootElement as HTMLElement).render(
    <StrictMode>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </StrictMode>,
  );
}

bootstrap().catch((error: unknown) => {
  console.error('Failed to start Restaurant POS', error);
  const message = error instanceof Error ? error.message : String(error);
  const safeMessage = message.replace(/[&<>]/g, (char) => {
    if (char === '&') return '&amp;';
    if (char === '<') return '&lt;';
    return '&gt;';
  });

  rootElement.innerHTML = `
    <div style="padding:24px;font-family:Roboto,sans-serif;color:#111">
      <h1 style="font-size:18px">Could not start the app</h1>
      <p style="font-size:14px;color:#555">
        Local database could not be opened. Please open the app in a normal browser window.
      </p>
      <pre style="margin-top:16px;white-space:pre-wrap;font-size:12px;color:#b91c1c">${safeMessage}</pre>
    </div>
  `;
});
