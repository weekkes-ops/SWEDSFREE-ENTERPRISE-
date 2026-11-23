import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  writeBatch,
  getDocs,
  getDocFromServer
} from 'firebase/firestore';
import { db } from './firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function isFirestoreAvailable(): boolean {
  try {
    return Boolean(db && typeof (db as any).app === 'object');
  } catch {
    return false;
  }
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): FirestoreErrorInfo {
  let localUser: { id?: string; email?: string } | null = null;
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('swedsfree_current_user') : null;
    if (raw) localUser = JSON.parse(raw);
  } catch {}

  const errMessage = error instanceof Error ? error.message : String(error);
  const errInfo: FirestoreErrorInfo = {
    error: errMessage,
    authInfo: {
      userId: localUser?.id || null,
      email: localUser?.email || null,
      emailVerified: null,
      isAnonymous: null,
      tenantId: null,
      providerInfo: []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  if (errMessage.toLowerCase().includes('missing or insufficient permissions')) {
    throw new Error(JSON.stringify(errInfo));
  }
  return errInfo;
}

export async function testConnection(): Promise<boolean> {
  if (!isFirestoreAvailable()) return false;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration (the client is offline).');
    }
    return false;
  }
}

if (typeof window !== 'undefined') {
  testConnection();
}

// Helper to remove undefined fields which Firestore rejects
export function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) return data;
  if (Array.isArray(data)) {
    return data.map(sanitizeForFirestore) as unknown as T;
  }
  if (typeof data === 'object') {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        cleaned[key] = sanitizeForFirestore(value);
      }
    }
    return cleaned as T;
  }
  return data;
}

// Subscribe to a real-time Firestore collection
export function subscribeToCollection<T extends { id: string }>(
  collectionName: string,
  onData: (items: T[]) => void,
  onError?: (err: Error) => void
): () => void {
  if (!isFirestoreAvailable()) {
    console.warn(`Firestore service not available for collection: ${collectionName}. Running in local storage mode.`);
    return () => {};
  }

  try {
    const colRef = collection(db, collectionName);
    return onSnapshot(
      colRef,
      (snapshot) => {
        const items: T[] = [];
        snapshot.forEach((docSnap) => {
          items.push({ id: docSnap.id, ...docSnap.data() } as T);
        });
        onData(items);
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.GET, collectionName);
        } catch (wrappedErr: any) {
          if (onError) onError(wrappedErr);
          return;
        }
        if (onError) onError(err);
      }
    );
  } catch (err: any) {
    handleFirestoreError(err, OperationType.GET, collectionName);
    if (onError) onError(err);
    return () => {};
  }
}

// Save or update a single document permanently
export async function saveDocument<T extends { id: string }>(
  collectionName: string,
  item: T
): Promise<void> {
  if (!isFirestoreAvailable()) return;
  try {
    const docId = String(item.id);
    const docRef = doc(db, collectionName, docId);
    const cleanData = sanitizeForFirestore(item);
    await setDoc(docRef, cleanData, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${collectionName}/${item.id}`);
  }
}

// Delete a single document permanently
export async function deleteDocument(
  collectionName: string,
  id: string
): Promise<void> {
  if (!isFirestoreAvailable()) return;
  try {
    const docRef = doc(db, collectionName, String(id));
    await deleteDoc(docRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `${collectionName}/${id}`);
  }
}

// Seed or batch save multiple items to Firestore permanently
export async function saveBatchDocuments<T extends { id: string }>(
  collectionName: string,
  items: T[]
): Promise<void> {
  if (!items || items.length === 0 || !isFirestoreAvailable()) return;
  try {
    const batch = writeBatch(db);
    items.forEach((item) => {
      const docRef = doc(db, collectionName, String(item.id));
      const cleanData = sanitizeForFirestore(item);
      batch.set(docRef, cleanData, { merge: true });
    });
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, collectionName);
    // Fallback to sequential save if batch hits limits
    for (const item of items) {
      await saveDocument(collectionName, item);
    }
  }
}

// Batch delete multiple documents from Firestore permanently
export async function deleteBatchDocuments(
  collectionName: string,
  ids: string[]
): Promise<void> {
  if (!ids || ids.length === 0 || !isFirestoreAvailable()) return;
  try {
    const batch = writeBatch(db);
    ids.forEach((id) => {
      const docRef = doc(db, collectionName, String(id));
      batch.delete(docRef);
    });
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, collectionName);
    for (const id of ids) {
      await deleteDocument(collectionName, id);
    }
  }
}

// Clear all documents from a collection directly in Firestore
export async function clearEntireCollection(collectionName: string): Promise<void> {
  if (!isFirestoreAvailable()) return;
  try {
    const colRef = collection(db, collectionName);
    const snapshot = await getDocs(colRef);
    if (snapshot.empty) return;
    const batch = writeBatch(db);
    snapshot.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, collectionName);
  }
}

// Fetch all documents from a Firestore collection directly from server
export async function fetchCollectionFromFirestore<T extends { id: string }>(
  collectionName: string
): Promise<T[]> {
  if (!isFirestoreAvailable()) return [];
  try {
    const colRef = collection(db, collectionName);
    const snapshot = await getDocs(colRef);
    const items: T[] = [];
    snapshot.forEach((docSnap) => {
      items.push({ id: docSnap.id, ...docSnap.data() } as T);
    });
    return items;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, collectionName);
    return [];
  }
}
