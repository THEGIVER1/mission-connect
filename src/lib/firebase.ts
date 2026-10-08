import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

export const FIREBASE_DB_URL = String(
  import.meta.env.VITE_FIREBASE_DATABASE_URL || 'https://doosan-teambuilding-default-rtdb.firebaseio.com'
).trim().replace(/\/+$/, '');

const firebaseConfig = {
  apiKey:            String(import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyAv6cEwldtRpszOjtdAuIA_dcbGm_gjQ6g').trim(),
  authDomain:        String(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'doosan-teambuilding.firebaseapp.com').trim(),
  databaseURL:       FIREBASE_DB_URL,
  projectId:         String(import.meta.env.VITE_FIREBASE_PROJECT_ID || 'doosan-teambuilding').trim(),
  messagingSenderId: String(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '1078188183440').trim(),
  appId:             String(import.meta.env.VITE_FIREBASE_APP_ID || '1:1078188183440:web:4ba0215acff465572ded15').trim(),
};

const app = initializeApp(firebaseConfig);
export const rtdb = getDatabase(app);
export const auth = null;
export default app;
