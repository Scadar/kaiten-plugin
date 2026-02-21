import React from 'react';
import ReactDOM from 'react-dom/client';
// App component includes TanStack Router with module augmentation for type-safe routing
// See App.tsx for router configuration and Register interface declaration
import App from './App';
import './index.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Failed to find the root element');
}

const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
