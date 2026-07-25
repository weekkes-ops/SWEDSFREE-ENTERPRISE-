import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  writeBatch 
} from 'firebase/firestore';
import { db } from './firebase';

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
) {
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
      console.error(`Firestore subscription error on ${collectionName}:`, err);
      if (onError) onError(err);
    }
  );
}

// Save or update a single document permanently
export async function saveDocument<T extends { id: string }>(
  collectionName: string,
  item: T
): Promise<void> {
  try {
    const docId = String(item.id);
    const docRef = doc(db, collectionName, docId);
    const cleanData = sanitizeForFirestore(item);
    await setDoc(docRef, cleanData, { merge: true });
  } catch (err) {
    console.error(`Error saving document ${item.id} to ${collectionName}:`, err);
    throw err;
  }
}

// Delete a single document permanently
export async function deleteDocument(
  collectionName: string,
  id: string
): Promise<void> {
  try {
    const docRef = doc(db, collectionName, String(id));
    await deleteDoc(docRef);
  } catch (err) {
    console.error(`Error deleting document ${id} from ${collectionName}:`, err);
    throw err;
  }
}

// Seed or batch save multiple items to Firestore permanently
export async function saveBatchDocuments<T extends { id: string }>(
  collectionName: string,
  items: T[]
): Promise<void> {
  if (!items || items.length === 0) return;
  try {
    const batch = writeBatch(db);
    items.forEach((item) => {
      const docRef = doc(db, collectionName, String(item.id));
      const cleanData = sanitizeForFirestore(item);
      batch.set(docRef, cleanData, { merge: true });
    });
    await batch.commit();
  } catch (err) {
    console.error(`Error saving batch to ${collectionName}:`, err);
    // Fallback to sequential save if batch hits limits
    for (const item of items) {
      await saveDocument(collectionName, item);
    }
  }
}
