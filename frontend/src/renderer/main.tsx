import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider } from 'antd';
import App from './App';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1a5276',
          colorSuccess: '#27ae60',
          colorWarning: '#f39c12',
          colorError: '#c0392b',
          borderRadius: 6,
          fontFamily: "'Segoe UI', 'Inter', sans-serif",
        },
      }}
    >
      <App />
    </ConfigProvider>
  </React.StrictMode>
);
