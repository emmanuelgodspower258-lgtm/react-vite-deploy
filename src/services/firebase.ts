import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyBDaNNaeQXsJsM8GZ0ebkPceiczMJ_r5_k',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'sms-academy-79e0f.firebaseapp.com',
    databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || 'https://sms-academy-79e0f-default-rtdb.firebaseio.com',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'sms-academy-79e0f',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'sms-academy-79e0f.firebasestorage.app',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '844476078881',
    appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:844476078881:web:6fa4aeac76bcf855417c60',
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const rtdb = getDatabase(app);
export const db = rtdb;
export const storage = getStorage(app);
export { app };
