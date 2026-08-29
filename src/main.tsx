import { StrictMode } from 'react';
import {createRoot} from 'react-dom/client';
import App from './App';
import './index.css';
import { LanguageProvider } from './i18n/LanguageContext';
import { ErrorBoundary } from './components/ErrorBoundary';




console.log('App initialization starting...');

const rootElement = document.getElementById('root');

// Emergency global error logger for diagnosis
window.onerror = function(msg, url, lineNo, columnNo, error) {
  console.error('CRITICAL FRONTEND ERROR:', msg, url, lineNo, columnNo, error);
  // Only overwrite HTML if DOM is completely empty/unmounted
  if (rootElement && (!rootElement.children || rootElement.children.length === 0)) {
    rootElement.innerHTML = `<div style="padding: 20px; color: white; background: #991b1b; font-family: monospace;">
      <h1>Critical Launch Error</h1>
      <pre>${msg}</pre>
      <p>Please check console for details.</p>
    </div>`;
  }
  return false;
};

if (!rootElement) {
  console.error('Fatal: Root element not found!');
  document.body.innerHTML = '<h1>Fatal Error: Root Element (#root) not found in DOM</h1>';
} else {
  console.log('Mounting React Application...');
  const loadingText = document.getElementById('loading-text');
  if (loadingText) loadingText.innerText = 'Mounting UI Components...';
  
  try {
    const root = createRoot(rootElement);
    root.render(
      <StrictMode>
        <ErrorBoundary>
          <LanguageProvider>
            <App />
          </LanguageProvider>
        </ErrorBoundary>
      </StrictMode>,
    );
    console.log('React Mount sequence initiated');
  } catch (err: any) {
    console.error('Fatal render error:', err);
    rootElement.innerHTML = `<div style="padding: 20px; color: white; background: #991b1b; font-family: monospace;">
      <h1>React Mount Failed</h1>
      <pre>${err?.message || err}</pre>
    </div>`;
  }
}


