import '@/lib/errorReporter';
import { enableMapSet } from "immer";
enableMapSet();
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ErrorBoundary } from '@/components/ErrorBoundary';
import '@/index.css'
import { App } from '@/App'
// Suppress persistent Vite HMR WebSocket connection errors in the console
// This is a client-side fix for a known Vite/environment issue that clutters logs
const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  if (
    typeof args[0] === 'string' &&
    args[0].includes('[vite] failed to connect to websocket')
  ) {
    return;
  }
  originalConsoleError.apply(console, args);
};
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)