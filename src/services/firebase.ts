import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  Firestore,
  Unsubscribe,
  writeBatch,
} from 'firebase/firestore';
import { Candidate, Competition, PaymentSettings } from '../types';
import defaultConfig from '../../firebase-applet-config.json';

export interface FirebaseConfig {
  apiKey: string;
  authDomain?: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
  firestoreDatabaseId?: string;
  measurementId?: string;
}

const STORAGE_KEY = 'chc_custom_firebase_config';

export function getActiveFirebaseConfig(): FirebaseConfig {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.projectId && parsed.apiKey) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Could not parse custom Firebase config:', e);
  }

  return {
    apiKey: defaultConfig.apiKey || '',
    authDomain: defaultConfig.authDomain || '',
    projectId: defaultConfig.projectId || '',
    storageBucket: defaultConfig.storageBucket || '',
    messagingSenderId: defaultConfig.messagingSenderId || '',
    appId: defaultConfig.appId || '',
    firestoreDatabaseId: defaultConfig.firestoreDatabaseId || '',
  };
}

export function saveCustomFirebaseConfig(config: FirebaseConfig | null): void {
  try {
    if (config && config.projectId && config.apiKey) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    // Reinitialize app
    reinitializeFirebase();
    window.dispatchEvent(new CustomEvent('chc_firebase_config_updated'));
  } catch (e) {
    console.error('Failed to save Firebase config:', e);
  }
}

export function hasCustomFirebaseConfig(): boolean {
  return !!localStorage.getItem(STORAGE_KEY);
}

let currentApp: FirebaseApp | null = null;
let currentDb: Firestore | null = null;

export function getFirebaseApp(): FirebaseApp {
  const config = getActiveFirebaseConfig();
  const existingApps = getApps();

  if (existingApps.length > 0 && currentApp) {
    return currentApp;
  }

  currentApp = initializeApp({
    apiKey: config.apiKey,
    authDomain: config.authDomain,
    projectId: config.projectId,
    storageBucket: config.storageBucket,
    messagingSenderId: config.messagingSenderId,
    appId: config.appId,
  });

  return currentApp;
}

export function getFirestoreDb(): Firestore {
  if (currentDb) return currentDb;
  const app = getFirebaseApp();
  const config = getActiveFirebaseConfig();

  if (config.firestoreDatabaseId && config.firestoreDatabaseId !== '(default)') {
    try {
      currentDb = getFirestore(app, config.firestoreDatabaseId);
    } catch (e) {
      console.warn('Falling back to default Firestore DB ID:', e);
      currentDb = getFirestore(app);
    }
  } else {
    currentDb = getFirestore(app);
  }

  return currentDb;
}

export function reinitializeFirebase(): void {
  currentApp = null;
  currentDb = null;
  try {
    getFirestoreDb();
  } catch (e) {
    console.warn('Reinitialization notice:', e);
  }
}

// -------------------------------------------------------------
// Real-time Firestore Listeners & Database Operations
// -------------------------------------------------------------

/**
 * Subscribes to real-time updates for all candidates.
 * Invoked on the public voting page, leaderboard, and admin candidate manager.
 */
export function subscribeToCandidatesRealtime(
  onUpdate: (candidates: Candidate[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  try {
    const db = getFirestoreDb();
    const candidatesCol = collection(db, 'candidates');

    return onSnapshot(
      candidatesCol,
      (snapshot) => {
        const list: Candidate[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as Partial<Candidate>;
          list.push({
            id: docSnap.id,
            competitionId: data.competitionId || 'comp-chc-benin-01',
            name: data.name || 'Contestant',
            slug: data.slug || docSnap.id,
            state: data.state || 'Edo Contestant',
            biography: data.biography || '',
            image: data.image || '',
            status: (data.status as 'ACTIVE' | 'INACTIVE') || 'ACTIVE',
            sortOrder: typeof data.sortOrder === 'number' ? data.sortOrder : 99,
            approvedVotes: typeof data.approvedVotes === 'number' ? data.approvedVotes : 0,
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: data.updatedAt || new Date().toISOString(),
          });
        });

        // Sort by sortOrder ascending, then by name
        list.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0) || a.name.localeCompare(b.name));
        onUpdate(list);
      },
      (err) => {
        console.warn('Firestore candidates subscription error:', err);
        if (onError) onError(err);
      }
    );
  } catch (e: any) {
    console.warn('Firestore setup error on candidate subscription:', e);
    if (onError) onError(e);
    return () => {};
  }
}

/**
 * Adds or updates a candidate in Firestore.
 */
export async function syncCandidateToFirestore(candidate: Candidate): Promise<void> {
  const db = getFirestoreDb();
  const candDocRef = doc(db, 'candidates', candidate.id);
  const now = new Date().toISOString();

  const dataToSave = {
    ...candidate,
    updatedAt: now,
  };

  await setDoc(candDocRef, dataToSave, { merge: true });
}

/**
 * Updates partial fields of a candidate in Firestore.
 */
export async function updateCandidateInFirestore(
  candidateId: string,
  updates: Partial<Candidate>
): Promise<void> {
  const db = getFirestoreDb();
  const candDocRef = doc(db, 'candidates', candidateId);
  const now = new Date().toISOString();

  await setDoc(candDocRef, { ...updates, updatedAt: now }, { merge: true });
}

/**
 * Deletes a candidate from Firestore.
 */
export async function deleteCandidateFromFirestore(candidateId: string): Promise<void> {
  const db = getFirestoreDb();
  const candDocRef = doc(db, 'candidates', candidateId);
  await deleteDoc(candDocRef);
}

/**
 * Seeds initial candidates into Firestore if the collection is empty,
 * ensuring new devices immediately see contestants in cloud sync mode.
 */
export async function seedInitialCandidatesIfEmpty(defaultList: Candidate[]): Promise<void> {
  try {
    const db = getFirestoreDb();
    const candidatesCol = collection(db, 'candidates');
    const existing = await getDocs(candidatesCol);

    if (existing.empty && defaultList.length > 0) {
      console.log('Seeding initial candidates to Firestore...');
      const batch = writeBatch(db);
      for (const cand of defaultList) {
        const ref = doc(db, 'candidates', cand.id);
        batch.set(ref, {
          ...cand,
          approvedVotes: cand.approvedVotes || 0,
        });
      }
      await batch.commit();
      console.log('Seeded initial candidates successfully.');
    }
  } catch (e) {
    console.warn('Firestore seeding check notice:', e);
  }
}

/**
 * Subscribes to real-time updates for Payment Settings.
 */
export function subscribeToPaymentSettingsRealtime(
  onUpdate: (settings: PaymentSettings) => void
): Unsubscribe {
  try {
    const db = getFirestoreDb();
    const settingsDoc = doc(db, 'settings', 'paymentSettings');

    return onSnapshot(settingsDoc, (docSnap) => {
      if (docSnap.exists()) {
        onUpdate(docSnap.data() as PaymentSettings);
      }
    });
  } catch (e) {
    console.warn('Firestore settings subscription error:', e);
    return () => {};
  }
}

/**
 * Subscribes to real-time updates for Competition data.
 */
export function subscribeToCompetitionRealtime(
  onUpdate: (competition: Competition) => void
): Unsubscribe {
  try {
    const db = getFirestoreDb();
    const compDoc = doc(db, 'competitions', 'main');

    return onSnapshot(compDoc, (docSnap) => {
      if (docSnap.exists()) {
        onUpdate(docSnap.data() as Competition);
      }
    });
  } catch (e) {
    console.warn('Firestore competition subscription error:', e);
    return () => {};
  }
}

/**
 * Tests the Firestore connection with the given or active config.
 */
export async function testFirestoreConnection(customConfig?: FirebaseConfig): Promise<{
  success: boolean;
  message: string;
  databaseId?: string;
  projectId?: string;
}> {
  try {
    const config = customConfig || getActiveFirebaseConfig();
    if (!config.projectId || !config.apiKey) {
      throw new Error('Project ID and API Key are required.');
    }

    // Temporary test instance
    const testApp = initializeApp(
      {
        apiKey: config.apiKey,
        authDomain: config.authDomain,
        projectId: config.projectId,
        storageBucket: config.storageBucket,
        messagingSenderId: config.messagingSenderId,
        appId: config.appId,
      },
      `test-app-${Date.now()}`
    );

    const testDb =
      config.firestoreDatabaseId && config.firestoreDatabaseId !== '(default)'
        ? getFirestore(testApp, config.firestoreDatabaseId)
        : getFirestore(testApp);

    // Read candidates collection
    const testCol = collection(testDb, 'candidates');
    const snapshot = await getDocs(testCol);

    return {
      success: true,
      message: `Successfully connected to Firestore! (${snapshot.size} contestants found in cloud database)`,
      databaseId: config.firestoreDatabaseId || '(default)',
      projectId: config.projectId,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Failed to connect to Firebase Firestore.',
    };
  }
}
