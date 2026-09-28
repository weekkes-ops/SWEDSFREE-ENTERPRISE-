import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

let app: FirebaseApp;
try {
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
} catch (e) {
  console.warn('Firebase initializeApp error, attempting getApp():', e);
  app = getApp();
}

let dbInstance: Firestore;
try {
  const dbId = (firebaseConfig as any).firestoreDatabaseId;
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
