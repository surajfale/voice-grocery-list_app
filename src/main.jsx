import React from 'react';
import ReactDOM from 'react-dom/client';
// Self-hosted fonts: work offline (PWA) and get embedded in exported images
import '@fontsource-variable/geist';
import '@fontsource-variable/geist-mono';
import './index.css';
import App from './App.jsx';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);