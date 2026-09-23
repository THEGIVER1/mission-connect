import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyDoosanChroTrekking2026',
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'doosan-teambuilding-default-rtdb.firebaseapp.com',
  databaseURL:       import.meta.env.VITE_FIREBASE_DATABASE_URL || 'https://doosan-teambuilding-default-rtdb.firebaseio.com',
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID || 'doosan-teambuilding',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '1029384756',
  appId:             import.meta.env.VITE_FIREBASE_APP_ID || '1:1029384756:web:doosan2026',
};

const app = initializeApp(firebaseConfig);
export const rtdb = getDatabase(app);
export const auth = null;
export default app;
