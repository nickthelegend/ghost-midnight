import React from 'react';
import ReactDOM from 'react-dom/client';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
    <Toaster
      position="bottom-right"
      toastOptions={{
        style: {
          background: '#141110',
          color: '#F4EDE3',
          border: '1px solid #3C312A',
          borderRadius: '12px',
          fontSize: '13px',
          fontFamily: 'Satoshi, system-ui, sans-serif',
        },
        success: { iconTheme: { primary: '#FF6A1A', secondary: '#0A0908' } },
        error: { iconTheme: { primary: '#F0506E', secondary: '#0A0908' } },
      }}
    />
  </React.StrictMode>,
);
