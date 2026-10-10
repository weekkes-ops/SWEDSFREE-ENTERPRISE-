import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

export const FIREBASE_API_KEY = 
  ((import.meta as any).env?.VITE_FIREBASE_API_KEY as string) || 
  (typeof process !== 'undefined' && process.env?.FIREBASE_API_KEY) || 
  firebaseConfig.apiKey || 
  "";

const config = {
  ...firebaseConfig,
  apiKey: FIREBASE_API_KEY
};

let app: FirebaseApp;
try {
  app = !getApps().length ? initializeApp(config) : getApp();
} catch (e) {
  console.warn('Firebase initializeApp error, attempting getApp():', e);
  app = getApp();
}

let dbInstance: Firestore;
try {
  const dbId = (config as any).firestoreDatabaseId;
  if (dbId && dbId !== '(default)') {
    dbInstance = getFirestore(app, dbId);
  } else {
    dbInstance = getFirestore(app);
  }
} catch (err) {
  console.warn('Custom Firestore databaseId initialization failed, attempting default database:', err);
  try {
    dbInstance = getFirestore(app);
  } catch (err2) {
    console.error('Firestore service unavailable, enabling offline mode:', err2);
    // Provide safe object proxy to prevent uncaught top-level module crash
    dbInstance = {} as Firestore;
  }
}

export const db = dbInstance;
export { app };
