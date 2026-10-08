import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

// Firebase Realtime Database 공식 엔드포인트 보장 (Vercel 환경변수 오염 원천 방어)
const DEFAULT_RTDB_URL = 'https://doosan-teambuilding-default-rtdb.firebaseio.com';

function resolveDatabaseUrl(): string {
  const envUrl = import.meta.env.VITE_FIREBASE_DATABASE_URL;
  if (typeof envUrl === 'string' && envUrl.includes('firebaseio.com') && envUrl.startsWith('http')) {
    return envUrl.trim().replace(/\/+$/, '');
  }
  return DEFAULT_RTDB_URL;
}

export const FIREBASE_DB_URL = resolveDatabaseUrl();

const firebaseConfig = {
  apiKey:            'AIzaSyAv6cEwldtRpszOjtdAuIA_dcbGm_gjQ6g',
  authDomain:        'doosan-teambuilding.firebaseapp.com',
  databaseURL:       FIREBASE_DB_URL,
  projectId:         'doosan-teambuilding',
  messagingSenderId: '1078188183440',
  appId:             '1:1078188183440:web:4ba0215acff465572ded15',
};

const app = initializeApp(firebaseConfig);
export const rtdb = getDatabase(app);
export const auth = null;
export default app;
