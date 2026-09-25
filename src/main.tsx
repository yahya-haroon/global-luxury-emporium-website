import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { initThemeFromStorage } from './lib/theme';

// Apply cached theme immediately before initial paint
initThemeFromStorage();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
