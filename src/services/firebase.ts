import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  onSnapshot,
  increment,
  Firestore,
  Unsubscribe,
  writeBatch,
} from 'firebase/firestore';
import { Candidate, Competition, PaymentSettings, VotingTransaction } from '../types';
import defaultConfig from '../../firebase-applet-config.json';

/**
 * ============================================================================
 * 1. FIREBASE CONFIGURATION PLACEHOLDER & CLIENT INITIALIZATION
 * ============================================================================
 * You can paste your Firebase credentials directly into the object below,
 * or manage them dynamically from the Admin Settings / Cloud Connect panel.
 */
export const firebaseConfig: FirebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
  firestoreDatabaseId: "ai-studio-chcbenincrownvot-a5846d5b-719e-465a-89b8-4070ce9ac385", // Optional custom database ID
};

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

/**
 * Public Voter Submission Data Model for the `pending_votes` Firestore collection
 */
export interface PendingVoteSubmission {
  id?: string;
  voterName: string;
  phoneNumber: string;
  email: string;
  candidateId: string;
  candidateName: string;
  amountTransferred: number;
  voteCount: number;
  transactionId: string;
  receiptImageBase64?: string;
  status: 'pending' | 'approved' | 'rejected' | 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  updatedAt?: string;
  rejectionReason?: string;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedByName?: string;
  rejectedAt?: string;
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

  // If hardcoded placeholder has been modified with real keys
  if (firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_API_KEY" && firebaseConfig.projectId !== "YOUR_PROJECT_ID") {
    return firebaseConfig;
  }

  // Default to project applet config
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

/**
 * ============================================================================
 * 2. VOTER SUBMISSION & PENDING VOTES (Firestore Collection: `pending_votes`)
 * ============================================================================
 */

/**
 * Saves voter submission with compressed proof to Firestore collection `pending_votes`.
 */
export async function savePendingVoteToFirestore(
  submission: PendingVoteSubmission
): Promise<{ success: boolean; id: string }> {
  try {
    const db = getFirestoreDb();
    const docId = submission.transactionId || `vote_${Date.now()}`;
    const voteDocRef = doc(db, 'pending_votes', docId);
    const now = new Date().toISOString();

    const payload: PendingVoteSubmission = {
      voterName: submission.voterName,
      phoneNumber: submission.phoneNumber,
      email: submission.email || '',
      candidateId: submission.candidateId,
      candidateName: submission.candidateName,
      amountTransferred: Number(submission.amountTransferred),
      voteCount: Number(submission.voteCount),
      transactionId: docId,
      receiptImageBase64: submission.receiptImageBase64 || '',
      status: 'pending',
      createdAt: submission.createdAt || now,
      updatedAt: now,
    };

    await setDoc(voteDocRef, payload, { merge: true });

    // Also mirror to legacy transactions collection for full backwards-compatibility
    const txDocRef = doc(db, 'transactions', docId);
    await setDoc(
      txDocRef,
      {
        id: docId,
        paymentReference: docId,
        voterName: submission.voterName,
        voterPhone: submission.phoneNumber,
        voterEmail: submission.email || '',
        candidateId: submission.candidateId,
        candidateName: submission.candidateName,
        amountTransferred: Number(submission.amountTransferred),
        expectedAmount: Number(submission.amountTransferred),
        voteQuantity: Number(submission.voteCount),
        bankTransactionId: docId,
        receiptUrl: submission.receiptImageBase64 || '',
        status: 'PENDING',
        createdAt: submission.createdAt || now,
        updatedAt: now,
      },
      { merge: true }
    );

    return { success: true, id: docId };
  } catch (err: any) {
    console.error('Firestore savePendingVote error:', err);
    throw new Error(err.message || 'Failed to submit vote to Firestore.');
  }
}

/**
 * Subscribes to real-time updates for the `pending_votes` collection in Firestore.
 * Ensures the Admin Dashboard gets live instant alerts when a voter submits on their phone.
 */
export function subscribeToPendingVotesRealtime(
  onUpdate: (submissions: PendingVoteSubmission[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  try {
    const db = getFirestoreDb();
    const pendingCol = collection(db, 'pending_votes');

    return onSnapshot(
      pendingCol,
      (snapshot) => {
        const list: PendingVoteSubmission[] = [];
        snapshot.forEach((docSnap) => {
          const d = docSnap.data() as Partial<PendingVoteSubmission>;
          list.push({
            id: docSnap.id,
            voterName: d.voterName || 'Anonymous Voter',
            phoneNumber: d.phoneNumber || '',
            email: d.email || '',
            candidateId: d.candidateId || '',
            candidateName: d.candidateName || 'Candidate',
            amountTransferred: typeof d.amountTransferred === 'number' ? d.amountTransferred : 0,
            voteCount: typeof d.voteCount === 'number' ? d.voteCount : 1,
            transactionId: d.transactionId || docSnap.id,
            receiptImageBase64: d.receiptImageBase64 || '',
            status: d.status || 'pending',
            createdAt: d.createdAt || new Date().toISOString(),
            updatedAt: d.updatedAt || new Date().toISOString(),
            rejectionReason: d.rejectionReason,
            approvedBy: d.approvedBy,
            approvedByName: d.approvedByName,
            approvedAt: d.approvedAt,
            rejectedBy: d.rejectedBy,
            rejectedByName: d.rejectedByName,
            rejectedAt: d.rejectedAt,
          });
        });

        // Sort descending by createdAt
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        onUpdate(list);
      },
      (err) => {
        console.warn('Firestore pending_votes subscription error:', err);
        if (onError) onError(err);
      }
    );
  } catch (e: any) {
    console.warn('Firestore pending_votes listener error:', e);
    if (onError) onError(e);
    return () => {};
  }
}

/**
 * Fetches all pending votes from Firestore.
 */
export async function fetchAllPendingVotesFromFirestore(): Promise<PendingVoteSubmission[]> {
  try {
    const db = getFirestoreDb();
    const pendingCol = collection(db, 'pending_votes');
    const snapshot = await getDocs(pendingCol);
    const list: PendingVoteSubmission[] = [];

    snapshot.forEach((docSnap) => {
      const d = docSnap.data() as Partial<PendingVoteSubmission>;
      list.push({
        id: docSnap.id,
        voterName: d.voterName || 'Anonymous Voter',
        phoneNumber: d.phoneNumber || '',
        email: d.email || '',
        candidateId: d.candidateId || '',
        candidateName: d.candidateName || 'Candidate',
        amountTransferred: typeof d.amountTransferred === 'number' ? d.amountTransferred : 0,
        voteCount: typeof d.voteCount === 'number' ? d.voteCount : 1,
        transactionId: d.transactionId || docSnap.id,
        receiptImageBase64: d.receiptImageBase64 || '',
        status: d.status || 'pending',
        createdAt: d.createdAt || new Date().toISOString(),
        updatedAt: d.updatedAt || new Date().toISOString(),
        rejectionReason: d.rejectionReason,
        approvedBy: d.approvedBy,
        approvedByName: d.approvedByName,
        approvedAt: d.approvedAt,
        rejectedBy: d.rejectedBy,
        rejectedByName: d.rejectedByName,
        rejectedAt: d.rejectedAt,
      });
    });

    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return list;
  } catch (e) {
    console.warn('Error fetching all pending votes from Firestore:', e);
    return [];
  }
}

/**
 * ============================================================================
 * 3. ADMIN APPROVAL & REJECTION FLOW
 * ============================================================================
 */

/**
 * Approves a pending vote in Firestore:
 * 1. Updates submission status to "approved" (in `pending_votes` and `transactions`).
 * 2. Atomically increments the candidate's official vote count in the `candidates` collection.
 */
export async function approvePendingVoteInFirestore(
  transactionId: string,
  candidateId?: string,
  voteCount?: number,
  adminName = 'Admin'
): Promise<{ success: boolean; message: string }> {
  const db = getFirestoreDb();
  const now = new Date().toISOString();

  try {
    // 1. Update `pending_votes`
    const pendingRef = doc(db, 'pending_votes', transactionId);
    const pendingSnap = await getDoc(pendingRef);

    let effectiveCandidateId = candidateId;
    let effectiveVoteCount = voteCount;

    if (pendingSnap.exists()) {
      const data = pendingSnap.data() as PendingVoteSubmission;
      if (!effectiveCandidateId) effectiveCandidateId = data.candidateId;
      if (!effectiveVoteCount) effectiveVoteCount = data.voteCount;

      await updateDoc(pendingRef, {
        status: 'approved',
        approvedAt: now,
        approvedBy: adminName,
        approvedByName: adminName,
        updatedAt: now,
      });
    }

    // 2. Update `transactions` collection
    const txRef = doc(db, 'transactions', transactionId);
    const txSnap = await getDoc(txRef);
    if (txSnap.exists()) {
      const txData = txSnap.data();
      if (!effectiveCandidateId) effectiveCandidateId = txData.candidateId;
      if (!effectiveVoteCount) effectiveVoteCount = txData.voteQuantity;

      await updateDoc(txRef, {
        status: 'APPROVED',
        approvedAt: now,
        approvedBy: adminName,
        approvedByName: adminName,
        updatedAt: now,
      });
    }

    // 3. Atomically increment the candidate's approved votes in the `candidates` collection
    if (effectiveCandidateId && effectiveVoteCount && effectiveVoteCount > 0) {
      const candRef = doc(db, 'candidates', effectiveCandidateId);
      const candSnap = await getDoc(candRef);

      if (candSnap.exists()) {
        await updateDoc(candRef, {
          approvedVotes: increment(effectiveVoteCount),
          votes: increment(effectiveVoteCount),
          updatedAt: now,
        });
      } else {
        // Look up by matching doc ID or name in candidates collection to safely increment
        const candCol = collection(db, 'candidates');
        const snap = await getDocs(candCol);
        let foundRef = null;
        const normTarget = effectiveCandidateId.trim().toLowerCase();
        const normNum = normTarget.replace(/^cand-0*/, '');

        for (const d of snap.docs) {
          const dData = d.data();
          const dId = d.id.toLowerCase();
          const dNum = dId.replace(/^cand-0*/, '');
          const cId = String(dData.id || '').toLowerCase();
          const cName = String(dData.name || '').toLowerCase();

          if (
            dId === normTarget ||
            (normNum && dNum === normNum) ||
            cId === normTarget ||
            (normTarget && cName.includes(normTarget))
          ) {
            foundRef = doc(db, 'candidates', d.id);
            break;
          }
        }

        if (foundRef) {
          await updateDoc(foundRef, {
            approvedVotes: increment(effectiveVoteCount),
            votes: increment(effectiveVoteCount),
            updatedAt: now,
          });
        } else {
          // Create entry with the initial vote count only if contestant doesn't exist
          await setDoc(
            candRef,
            {
              id: effectiveCandidateId,
              approvedVotes: effectiveVoteCount,
              votes: effectiveVoteCount,
              updatedAt: now,
            },
            { merge: true }
          );
        }
      }
    }

    return {
      success: true,
      message: `Vote approved successfully! ${effectiveVoteCount || 0} votes credited to contestant.`,
    };
  } catch (err: any) {
    console.error('Firestore approval error:', err);
    throw new Error(err.message || 'Failed to approve vote in Firestore.');
  }
}

/**
 * Rejects a pending vote in Firestore:
 * Updates the submission status to "rejected" with the specified reason.
 */
export async function rejectPendingVoteInFirestore(
  transactionId: string,
  reason = 'Payment proof could not be verified.',
  adminName = 'Admin'
): Promise<{ success: boolean; message: string }> {
  const db = getFirestoreDb();
  const now = new Date().toISOString();

  try {
    // 1. Update `pending_votes`
    const pendingRef = doc(db, 'pending_votes', transactionId);
    const pendingSnap = await getDoc(pendingRef);
    if (pendingSnap.exists()) {
      await updateDoc(pendingRef, {
        status: 'rejected',
        rejectionReason: reason,
        rejectedAt: now,
        rejectedBy: adminName,
        rejectedByName: adminName,
        updatedAt: now,
      });
    }

    // 2. Update `transactions`
    const txRef = doc(db, 'transactions', transactionId);
    const txSnap = await getDoc(txRef);
    if (txSnap.exists()) {
      await updateDoc(txRef, {
        status: 'REJECTED',
        rejectionReason: reason,
        rejectedAt: now,
        rejectedBy: adminName,
        rejectedByName: adminName,
        updatedAt: now,
      });
    }

    return {
      success: true,
      message: 'Vote submission has been rejected.',
    };
  } catch (err: any) {
    console.error('Firestore rejection error:', err);
    throw new Error(err.message || 'Failed to reject vote in Firestore.');
  }
}

/**
 * Deletes a submission completely from Firestore.
 */
export async function deletePendingVoteFromFirestore(transactionId: string): Promise<void> {
  const db = getFirestoreDb();
  try {
    await deleteDoc(doc(db, 'pending_votes', transactionId));
    await deleteDoc(doc(db, 'transactions', transactionId));
  } catch (err) {
    console.warn('Firestore deletePendingVote notice:', err);
  }
}

/**
 * ============================================================================
 * 4. LIVE CANDIDATE LEADERBOARD & CANDIDATES COLLECTION
 * ============================================================================
 */

/**
 * Subscribes to real-time updates for all candidates in Firestore.
 * Powers the live Leaderboard so every phone sees verified vote counts instantly.
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
          const data = docSnap.data() as any;
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
            approvedVotes:
              typeof data.approvedVotes === 'number'
                ? data.approvedVotes
                : typeof data.votes === 'number'
                ? data.votes
                : 0,
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: data.updatedAt || new Date().toISOString(),
          });
        });

        // Load candidates AS-IS directly from Firestore collection
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
 * Fetches all candidates from Firestore once.
 */
export async function fetchAllCandidatesFromFirestore(): Promise<Candidate[]> {
  try {
    const db = getFirestoreDb();
    const candidatesCol = collection(db, 'candidates');
    const snapshot = await getDocs(candidatesCol);
    const list: Candidate[] = [];

    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as any;
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
        approvedVotes:
          typeof data.approvedVotes === 'number'
            ? data.approvedVotes
            : typeof data.votes === 'number'
            ? data.votes
            : 0,
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString(),
      });
    });

    list.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0) || a.name.localeCompare(b.name));
    return list;
  } catch (err) {
    console.warn('Error fetching candidates from Firestore:', err);
    return [];
  }
}

/**
 * Directly overrides and updates a candidate's total approved votes in Firestore.
 * Updates the document and all matching duplicate documents in Firestore.
 */
export async function setCandidateVotesInFirestore(
  candidateId: string,
  newVoteCount: number,
  adminName = 'Admin'
): Promise<{ success: boolean; message: string; candidateId: string; approvedVotes: number }> {
  const db = getFirestoreDb();
  const candDocRef = doc(db, 'candidates', candidateId);
  const now = new Date().toISOString();
  const safeCount = Math.max(0, Math.floor(Number(newVoteCount) || 0));

  // 1. Direct update to target doc ID
  await setDoc(
    candDocRef,
    {
      id: candidateId,
      approvedVotes: safeCount,
      updatedAt: now,
      lastManualOverrideBy: adminName,
      lastManualOverrideAt: now,
    },
    { merge: true }
  );

  // 2. Query and update all matching documents in `candidates` (e.g. if ID was numeric or slug)
  try {
    const candidatesCol = collection(db, 'candidates');
    const snap = await getDocs(candidatesCol);
    const targetNorm = candidateId.trim().toLowerCase();
    const cleanNum = targetNorm.replace(/^cand-0*/, '');

    for (const d of snap.docs) {
      const data = d.data();
      const docId = d.id.toLowerCase();
      const docNum = docId.replace(/^cand-0*/, '');
      const docCandId = String(data.id || '').toLowerCase();
      const docName = String(data.name || '').toLowerCase();

      const isMatch =
        docId === targetNorm ||
        (cleanNum && docNum === cleanNum) ||
        docCandId === targetNorm ||
        docName.includes(targetNorm);

      if (isMatch && d.id !== candidateId) {
        await setDoc(
          doc(db, 'candidates', d.id),
          {
            approvedVotes: safeCount,
            updatedAt: now,
            lastManualOverrideBy: adminName,
            lastManualOverrideAt: now,
          },
          { merge: true }
        );
      }
    }
  } catch (e) {
    console.warn('Firestore multi-doc vote sync notice:', e);
  }

  return {
    success: true,
    message: `Total approved votes successfully updated to ${safeCount.toLocaleString()} in Firestore.`,
    candidateId,
    approvedVotes: safeCount,
  };
}

/**
 * Scans all approved transactions in Firestore (`pending_votes` and `transactions`),
 * tallies approved votes for each candidate, and restores accurate vote totals in Firestore.
 * Also preserves any existing manual vote overrides if higher.
 */
export async function reconcileAndRestoreVotesInFirestore(): Promise<{
  success: boolean;
  totalVotesRestored: number;
  candidateBreakdown: { id: string; name: string; votes: number }[];
  message: string;
}> {
  const db = getFirestoreDb();
  const now = new Date().toISOString();

  // 1. Fetch all pending_votes and transactions
  const approvedVotesByCandidate = new Map<string, number>();
  const processedTxIds = new Set<string>();

  try {
    const pendingVotesCol = collection(db, 'pending_votes');
    const pendingSnap = await getDocs(pendingVotesCol);
    pendingSnap.forEach((d) => {
      const data = d.data();
      const st = String(data.status || '').toUpperCase();
      const txId = String(data.transactionId || data.paymentReference || d.id);
      if (st === 'APPROVED' && !processedTxIds.has(txId)) {
        processedTxIds.add(txId);
        const candId = String(data.candidateId || '').trim();
        const candName = String(data.candidateName || '').trim();
        const votes = Number(data.voteCount || data.voteQuantity || 0);
        if (candId && votes > 0) {
          approvedVotesByCandidate.set(candId, (approvedVotesByCandidate.get(candId) || 0) + votes);
        } else if (candName && votes > 0) {
          approvedVotesByCandidate.set(candName, (approvedVotesByCandidate.get(candName) || 0) + votes);
        }
      }
    });
  } catch (e) {
    console.warn('Notice reading pending_votes for reconciliation:', e);
  }

  try {
    const transactionsCol = collection(db, 'transactions');
    const txSnap = await getDocs(transactionsCol);
    txSnap.forEach((d) => {
      const data = d.data();
      const st = String(data.status || '').toUpperCase();
      const txId = String(data.transactionId || data.paymentReference || d.id);
      if (st === 'APPROVED' && !processedTxIds.has(txId)) {
        processedTxIds.add(txId);
        const candId = String(data.candidateId || '').trim();
        const candName = String(data.candidateName || '').trim();
        const votes = Number(data.voteCount || data.voteQuantity || 0);
        if (candId && votes > 0) {
          approvedVotesByCandidate.set(candId, (approvedVotesByCandidate.get(candId) || 0) + votes);
        } else if (candName && votes > 0) {
          approvedVotesByCandidate.set(candName, (approvedVotesByCandidate.get(candName) || 0) + votes);
        }
      }
    });
  } catch (e) {
    console.warn('Notice reading transactions for reconciliation:', e);
  }

  // 2. Fetch candidates from Firestore
  const candidatesCol = collection(db, 'candidates');
  const candSnap = await getDocs(candidatesCol);
  const candidateBreakdown: { id: string; name: string; votes: number }[] = [];
  let totalVotesRestored = 0;

  for (const docSnap of candSnap.docs) {
    const candData = docSnap.data() as Candidate;
    const candId = docSnap.id;
    const candName = candData.name || '';

    // Calculate aggregated approved votes from transactions
    const txVotesById = approvedVotesByCandidate.get(candId) || 0;
    const txVotesByName = approvedVotesByCandidate.get(candName) || 0;
    const txVotesTotal = Math.max(txVotesById, txVotesByName);

    // Keep the higher of: existing votes, or transaction-calculated votes
    const existingVotes = Number(candData.approvedVotes) || 0;
    const finalVotes = Math.max(existingVotes, txVotesTotal);

    candidateBreakdown.push({
      id: candId,
      name: candName,
      votes: finalVotes,
    });
    totalVotesRestored += finalVotes;

    // Update in Firestore
    await setDoc(
      doc(db, 'candidates', candId),
      {
        approvedVotes: finalVotes,
        updatedAt: now,
        lastReconciledAt: now,
      },
      { merge: true }
    );
  }

  return {
    success: true,
    totalVotesRestored,
    candidateBreakdown,
    message: `Successfully reconciled all candidate votes in Firestore. Total verified votes: ${totalVotesRestored.toLocaleString()}.`,
  };
}

/**
 * Adds or updates a candidate in Firestore.
 * Safeguarded so existing approvedVotes are preserved unless explicitly passed.
 */
export async function syncCandidateToFirestore(candidate: Candidate): Promise<void> {
  const db = getFirestoreDb();
  const candDocRef = doc(db, 'candidates', candidate.id);
  const now = new Date().toISOString();

  // Guard: If document already exists, preserve non-zero approvedVotes if candidate.approvedVotes is 0 or undefined
  let finalVotes = candidate.approvedVotes;
  if (finalVotes === undefined || finalVotes === 0) {
    try {
      const snap = await getDoc(candDocRef);
      if (snap.exists()) {
        const existingData = snap.data();
        if (typeof existingData.approvedVotes === 'number' && existingData.approvedVotes > 0) {
          finalVotes = existingData.approvedVotes;
        }
      }
    } catch (e) {
      // quiet fallback
    }
  }

  const dataToSave = {
    ...candidate,
    approvedVotes: typeof finalVotes === 'number' ? finalVotes : 0,
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
 * ensuring all connected devices immediately share the cloud contestant list.
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
 * Subscribes to real-time updates for Voting Transactions.
 */
export function subscribeToTransactionsRealtime(
  onUpdate: (transactions: VotingTransaction[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  try {
    const db = getFirestoreDb();
    const txCol = collection(db, 'transactions');

    return onSnapshot(
      txCol,
      (snapshot) => {
        const list: VotingTransaction[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as Partial<VotingTransaction>;
          list.push({
            id: docSnap.id,
            paymentReference: data.paymentReference || docSnap.id,
            competitionId: data.competitionId || 'comp-chc-benin-01',
            candidateId: data.candidateId || '',
            candidateName: data.candidateName || '',
            candidateState: data.candidateState || '',
            voterName: data.voterName || '',
            voterEmail: data.voterEmail || '',
            voterPhone: data.voterPhone || '',
            voteQuantity: typeof data.voteQuantity === 'number' ? data.voteQuantity : 0,
            expectedAmount: typeof data.expectedAmount === 'number' ? data.expectedAmount : 0,
            amountTransferred: typeof data.amountTransferred === 'number' ? data.amountTransferred : 0,
            bankTransactionId: data.bankTransactionId || '',
            receiptUrl: data.receiptUrl || '',
            status: (data.status as any) || 'PENDING',
            rejectionReason: data.rejectionReason,
            approvedBy: data.approvedBy,
            approvedByName: data.approvedByName,
            approvedAt: data.approvedAt,
            rejectedBy: data.rejectedBy,
            rejectedByName: data.rejectedByName,
            rejectedAt: data.rejectedAt,
            submittedAt: data.submittedAt || data.createdAt || new Date().toISOString(),
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: data.updatedAt || new Date().toISOString(),
          });
        });

        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        onUpdate(list);
      },
      (err) => {
        console.warn('Firestore transactions subscription error:', err);
        if (onError) onError(err);
      }
    );
  } catch (e: any) {
    console.warn('Firestore setup error on transaction subscription:', e);
    if (onError) onError(e);
    return () => {};
  }
}

/**
 * Saves a voting transaction to Firestore.
 */
export async function syncTransactionToFirestore(transaction: VotingTransaction): Promise<void> {
  try {
    const db = getFirestoreDb();
    const docId = transaction.id || transaction.paymentReference;
    const txDocRef = doc(db, 'transactions', docId);
    const now = new Date().toISOString();

    const dataToSave = {
      ...transaction,
      id: docId,
      updatedAt: now,
    };

    await setDoc(txDocRef, dataToSave, { merge: true });
  } catch (err) {
    console.warn('Firestore transaction sync notice:', err);
  }
}

/**
 * Updates a voting transaction in Firestore (e.g. approve or reject).
 */
export async function updateTransactionInFirestore(
  transactionId: string,
  updates: Partial<VotingTransaction>
): Promise<void> {
  try {
    const db = getFirestoreDb();
    const txDocRef = doc(db, 'transactions', transactionId);
    const now = new Date().toISOString();

    await setDoc(txDocRef, { ...updates, updatedAt: now }, { merge: true });
  } catch (err) {
    console.warn('Firestore transaction update notice:', err);
  }
}

/**
 * Deletes a voting transaction in Firestore.
 */
export async function deleteTransactionFromFirestore(transactionId: string): Promise<void> {
  try {
    const db = getFirestoreDb();
    const txDocRef = doc(db, 'transactions', transactionId);
    await deleteDoc(txDocRef);
  } catch (err) {
    console.warn('Firestore transaction deletion notice:', err);
  }
}

/**
 * Fetches all transactions from Firestore.
 */
export async function fetchTransactionsFromFirestore(): Promise<VotingTransaction[]> {
  try {
    const db = getFirestoreDb();
    const txCol = collection(db, 'transactions');
    const snapshot = await getDocs(txCol);
    const list: VotingTransaction[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as Partial<VotingTransaction>;
      list.push({
        id: docSnap.id,
        paymentReference: data.paymentReference || docSnap.id,
        competitionId: data.competitionId || 'comp-chc-benin-01',
        candidateId: data.candidateId || '',
        candidateName: data.candidateName || '',
        candidateState: data.candidateState || '',
        voterName: data.voterName || '',
        voterEmail: data.voterEmail || '',
        voterPhone: data.voterPhone || '',
        voteQuantity: typeof data.voteQuantity === 'number' ? data.voteQuantity : 0,
        expectedAmount: typeof data.expectedAmount === 'number' ? data.expectedAmount : 0,
        amountTransferred: typeof data.amountTransferred === 'number' ? data.amountTransferred : 0,
        bankTransactionId: data.bankTransactionId || '',
        receiptUrl: data.receiptUrl || '',
        status: (data.status as any) || 'PENDING',
        rejectionReason: data.rejectionReason,
        approvedBy: data.approvedBy,
        approvedByName: data.approvedByName,
        approvedAt: data.approvedAt,
        rejectedBy: data.rejectedBy,
        rejectedByName: data.rejectedByName,
        rejectedAt: data.rejectedAt,
        submittedAt: data.submittedAt || data.createdAt || new Date().toISOString(),
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString(),
      });
    });
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return list;
  } catch (err) {
    console.warn('Firestore transactions query notice:', err);
    return [];
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
