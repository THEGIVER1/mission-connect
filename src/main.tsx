// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { IS_PILOT_MODE } from './config/workshopConfig';

// 서울대공원 버전: 노안 고려 전체 글자 확대 (관리자 화면 제외)
if (!IS_PILOT_MODE && !window.location.pathname.startsWith('/admin')) {
  document.documentElement.classList.add('gp-large');
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
