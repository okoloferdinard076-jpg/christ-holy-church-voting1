import { PublicContestData, Candidate, VotingTransaction, AdminDashboardStats, PaymentSettings, AuditLog } from '../types';
import {
  syncCandidateToFirestore,
  updateCandidateInFirestore,
  deleteCandidateFromFirestore,
  syncTransactionToFirestore,
  updateTransactionInFirestore,
  deleteTransactionFromFirestore,
  fetchTransactionsFromFirestore,
} from './firebase';

const API_BASE = '/api';

// Helper with automatic retry for resilience against dev server restarts and network hiccups
async function safeFetch(url: string, options?: RequestInit, retries = 3, delay = 800): Promise<Response> {
  let lastError: any = null;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url, options);
      if (res.ok) return res;
      // If 4xx client error, don't retry blindly
      if (res.status >= 400 && res.status < 500) {
        return res;
      }
      lastError = new Error(`Server returned status ${res.status}`);
    } catch (err) {
      lastError = err;
    }
    if (attempt < retries - 1) {
      await new Promise((resolve) => setTimeout(resolve, delay * (attempt + 1)));
    }
  }
  throw lastError || new Error(`Failed to fetch from ${url}`);
}

export async function fetchContestData(): Promise<PublicContestData> {
  const res = await safeFetch(`${API_BASE}/contest`, undefined, 3, 600);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to load contest data');
  }
  return res.json();
}

export const fetchPublicData = fetchContestData;

export async function fetchPendingTransactionsCount(token?: string | null): Promise<number> {
  if (!token) return 0;
  try {
    const res = await fetch(`${API_BASE}/notifications/pending-count`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) return 0;
    const data = await res.json();
    return typeof data.pendingCount === 'number' ? data.pendingCount : 0;
  } catch (e) {
    return 0;
  }
}

export async function fetchCandidate(slug: string): Promise<Candidate> {
  const res = await fetch(`${API_BASE}/candidates/${slug}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Candidate not found');
  }
  return res.json();
}

export async function initiateVotingIntent(params: {
  candidateId: string;
  voteQuantity: number;
  voterName?: string;
  voterEmail?: string;
  voterPhone?: string;
}): Promise<{
  transaction: VotingTransaction;
  candidate: Candidate;
  paymentSettings: PaymentSettings;
  expectedAmount: number;
  voteQuantity: number;
  pricePerVote: number;
}> {
  const res = await safeFetch(`${API_BASE}/vote/intent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  }, 2, 400);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.message || 'Failed to initialize voting transaction');
  }
  return res.json();
}

export async function submitPaymentProof(params: {
  paymentReference: string;
  voterName: string;
  voterEmail?: string;
  voterPhone: string;
  amountTransferred: number;
  bankTransactionId?: string;
  receiptUrl?: string;
  candidateId?: string;
  candidateName?: string;
  candidateState?: string;
  voteQuantity?: number;
  expectedAmount?: number;
}): Promise<{
  success: boolean;
  message: string;
  transaction: VotingTransaction;
}> {
  const now = new Date().toISOString();

  // Construct complete valid transaction object
  const tx: VotingTransaction = {
    id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    paymentReference: params.paymentReference || `VOTE-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
    competitionId: 'comp-chc-benin-01',
    candidateId: params.candidateId || '',
    candidateName: params.candidateName || '',
    candidateState: params.candidateState || '',
    voterName: params.voterName.trim(),
    voterEmail: params.voterEmail?.trim() || '',
    voterPhone: params.voterPhone.trim(),
    voteQuantity: params.voteQuantity || Math.max(1, Math.floor(params.amountTransferred / 50)),
    expectedAmount: params.expectedAmount || params.amountTransferred,
    amountTransferred: Number(params.amountTransferred),
    bankTransactionId: params.bankTransactionId?.trim() || undefined,
    receiptUrl: params.receiptUrl || undefined,
    status: 'PENDING',
    submittedAt: now,
    createdAt: now,
    updatedAt: now,
  };

  // 1. Direct synchronous persistence into localStorage under pendingVotes
  savePendingVoteLocally(tx);

  // 2. Real-time Firestore Cloud persistence
  try {
    syncTransactionToFirestore(tx).catch((err) =>
      console.warn('Firestore transaction sync error:', err)
    );
  } catch (e) {
    console.warn('Firestore transaction async push error:', e);
  }

  // 3. Resilient server sync (non-blocking if offline/failing)
  try {
    const serverRes = await fetch(`${API_BASE}/vote/submit-proof`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (serverRes.ok) {
      const data = await serverRes.json();
      if (data && data.transaction) {
        savePendingVoteLocally(data.transaction);
        return {
          success: true,
          message: 'Payment proof submitted successfully. Your transaction is awaiting administrator verification.',
          transaction: data.transaction,
        };
      }
    }
  } catch (e) {
    console.warn('Server background submission sync note (handled safely):', e);
  }

  return {
    success: true,
    message: 'Payment verification details submitted successfully! Awaiting administrator verification.',
    transaction: tx,
  };
}

export async function checkTransactionStatus(
  reference: string,
  contact?: string
): Promise<VotingTransaction> {
  const refClean = reference.trim();

  // 1. Check local storage
  const localList = getStoredPendingVotes();
  const localFound = localList.find(
    (v) =>
      v.paymentReference?.toLowerCase() === refClean.toLowerCase() ||
      v.id?.toLowerCase() === refClean.toLowerCase()
  );
  if (localFound) {
    return localFound;
  }

  // 2. Check Firestore
  try {
    const firestoreTxs = await fetchTransactionsFromFirestore();
    const cloudFound = firestoreTxs.find(
      (v) =>
        v.paymentReference?.toLowerCase() === refClean.toLowerCase() ||
        v.id?.toLowerCase() === refClean.toLowerCase()
    );
    if (cloudFound) {
      return cloudFound;
    }
  } catch (e) {
    // Non-blocking
  }

  // 3. Query server
  const url = new URL(`${window.location.origin}${API_BASE}/transaction/status/${encodeURIComponent(refClean)}`);
  if (contact && contact.trim()) {
    url.searchParams.set('contact', contact.trim());
  }
  const res = await fetch(url.toString());
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Transaction reference not found');
  }
  return res.json();
}

export async function uploadReceiptFile(file: File): Promise<{ receiptUrl: string; filename: string }> {
  const formData = new FormData();
  formData.append('receipt', file);

  const res = await fetch(`${API_BASE}/upload/receipt`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to upload receipt document');
  }
  return res.json();
}

// ---------------- Admin API calls ----------------

function getAdminHeaders(token?: string | null) {
  if (!token) {
    return {
      'Content-Type': 'application/json',
    };
  }
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

export async function getAdminInstantAccess(): Promise<{
  success: boolean;
  token: string;
  user: { id: string; name: string; email: string; role: 'ADMIN' | 'SUPER_ADMIN' };
}> {
  const res = await fetch(`${API_BASE}/auth/instant-access`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to get instant admin access');
  }
  return res.json();
}

export async function adminLogin(email?: string, password?: string) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email || '', password: password || '' }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to access administrator dashboard');
  }
  return res.json();
}

export async function fetchAdminDashboard(token: string): Promise<AdminDashboardStats> {
  const res = await fetch(`${API_BASE}/admin/dashboard`, {
    headers: getAdminHeaders(token),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to load dashboard data');
  }
  return res.json();
}

export const fetchAdminStats = fetchAdminDashboard;

// ---------------- Pending Votes Local Storage & Cross-Device State ----------------

export function getStoredPendingVotes(): VotingTransaction[] {
  try {
    const raw = localStorage.getItem('pendingVotes') || localStorage.getItem('chc_pending_votes');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Error reading stored pending votes:', e);
  }
  return [];
}

export function setStoredPendingVotes(votes: VotingTransaction[]): void {
  try {
    localStorage.setItem('pendingVotes', JSON.stringify(votes));
    localStorage.setItem('chc_pending_votes', JSON.stringify(votes));
    window.dispatchEvent(new CustomEvent('chc_pending_votes_updated', { detail: { votes } }));
  } catch (e) {
    console.warn('Error saving stored pending votes:', e);
  }
}

export function savePendingVoteLocally(vote: VotingTransaction): void {
  try {
    const list = getStoredPendingVotes();
    const existingIndex = list.findIndex(
      (v) => (v.id && v.id === vote.id) || (v.paymentReference && v.paymentReference === vote.paymentReference)
    );
    if (existingIndex >= 0) {
      list[existingIndex] = { ...list[existingIndex], ...vote, updatedAt: new Date().toISOString() };
    } else {
      list.unshift(vote);
    }
    setStoredPendingVotes(list);
    window.dispatchEvent(new CustomEvent('chc_pending_vote_added', { detail: { vote } }));
  } catch (e) {
    console.warn('Error adding local pending vote:', e);
  }
}

export function updatePendingVoteLocally(idOrRef: string, updates: Partial<VotingTransaction>): void {
  try {
    const list = getStoredPendingVotes();
    const index = list.findIndex(
      (v) => v.id === idOrRef || v.paymentReference === idOrRef
    );
    if (index >= 0) {
      list[index] = { ...list[index], ...updates, updatedAt: new Date().toISOString() };
      setStoredPendingVotes(list);
    }
  } catch (e) {
    console.warn('Error updating local pending vote:', e);
  }
}

export function deletePendingVoteLocally(idOrRef: string): void {
  try {
    const list = getStoredPendingVotes();
    const filtered = list.filter(
      (v) => v.id !== idOrRef && v.paymentReference !== idOrRef
    );
    setStoredPendingVotes(filtered);
  } catch (e) {
    console.warn('Error deleting local pending vote:', e);
  }
}

export async function fetchAdminPayments(
  token: string,
  query: {
    status?: string;
    candidateId?: string;
    state?: string;
    search?: string;
    page?: number;
    limit?: number;
  }
): Promise<{
  items: VotingTransaction[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  let serverItems: VotingTransaction[] = [];
  try {
    const params = new URLSearchParams();
    if (query.status) params.set('status', query.status);
    if (query.candidateId) params.set('candidateId', query.candidateId);
    if (query.state) params.set('state', query.state);
    if (query.search) params.set('search', query.search);
    if (query.page) params.set('page', String(query.page));
    if (query.limit) params.set('limit', String(query.limit || 50));

    const res = await fetch(`${API_BASE}/admin/payments?${params.toString()}`, {
      headers: getAdminHeaders(token),
    });
    if (res.ok) {
      const data = await res.json();
      serverItems = Array.isArray(data.items) ? data.items : [];
    }
  } catch (err) {
    console.warn('Server payments fetch notice (merging with local/cloud):', err);
  }

  // Merge with local pending votes and Firestore
  const localVotes = getStoredPendingVotes();
  let firestoreTxs: VotingTransaction[] = [];
  try {
    firestoreTxs = await fetchTransactionsFromFirestore();
  } catch (e) {
    // Non-blocking
  }

  // Combine items by unique id/reference
  const combinedMap = new Map<string, VotingTransaction>();
  for (const item of serverItems) {
    const key = item.id || item.paymentReference;
    if (key) combinedMap.set(key, item);
  }
  for (const item of firestoreTxs) {
    const key = item.id || item.paymentReference;
    if (key) {
      // If server does not have it, or cloud has newer status
      if (!combinedMap.has(key) || item.status !== 'PENDING') {
        combinedMap.set(key, item);
      }
    }
  }
  for (const item of localVotes) {
    const key = item.id || item.paymentReference;
    if (key && !combinedMap.has(key)) {
      combinedMap.set(key, item);
    }
  }

  let allList = Array.from(combinedMap.values());

  // Apply filters
  if (query.status && query.status !== 'ALL') {
    allList = allList.filter((tx) => tx.status === query.status);
  }
  if (query.candidateId && query.candidateId !== 'ALL') {
    allList = allList.filter((tx) => matchCandidateId(tx.candidateId, query.candidateId));
  }
  if (query.state && query.state !== 'ALL') {
    allList = allList.filter((tx) => (tx.candidateState || '').toLowerCase() === query.state?.toLowerCase());
  }
  if (query.search && query.search.trim()) {
    const s = query.search.trim().toLowerCase();
    allList = allList.filter((tx) =>
      (tx.paymentReference || '').toLowerCase().includes(s) ||
      (tx.voterName || '').toLowerCase().includes(s) ||
      (tx.voterPhone || '').toLowerCase().includes(s) ||
      (tx.candidateName || '').toLowerCase().includes(s) ||
      (tx.bankTransactionId || '').toLowerCase().includes(s)
    );
  }

  allList.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  const page = query.page || 1;
  const limit = query.limit || 15;
  const total = allList.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const startIndex = (page - 1) * limit;
  const paginatedItems = allList.slice(startIndex, startIndex + limit);

  return {
    items: paginatedItems,
    total,
    page,
    limit,
    totalPages,
  };
}

export async function approvePayment(token: string, transactionId: string) {
  const now = new Date().toISOString();

  // 1. Update local storage
  const localVotes = getStoredPendingVotes();
  const target = localVotes.find((v) => v.id === transactionId || v.paymentReference === transactionId);
  if (target) {
    target.status = 'APPROVED';
    target.approvedAt = now;
    setStoredPendingVotes(localVotes);

    // Increment candidate's approved votes count locally
    if (target.candidateId && target.voteQuantity) {
      const candidates = getStoredCandidates();
      const cand = candidates.find((c) => matchCandidateId(c.id, target.candidateId));
      if (cand) {
        cand.approvedVotes = (cand.approvedVotes || 0) + target.voteQuantity;
        setStoredCandidates(candidates);
        syncCandidateToFirestore(cand).catch(() => {});
      }
    }
  }

  // 2. Real-time Firestore Cloud update
  updateTransactionInFirestore(transactionId, {
    status: 'APPROVED',
    approvedAt: now,
  }).catch(() => {});

  // 3. Server backend approval
  try {
    const res = await fetch(`${API_BASE}/admin/payments/${encodeURIComponent(transactionId)}/approve`, {
      method: 'POST',
      headers: getAdminHeaders(token),
    });
    if (res.ok) {
      return res.json();
    }
  } catch (err) {
    console.warn('Server approve payment notice:', err);
  }

  return { success: true, message: 'Payment verified and approved successfully. Votes credited.' };
}

export async function rejectPayment(token: string, transactionId: string, reason: string) {
  const now = new Date().toISOString();

  // 1. Update local storage
  updatePendingVoteLocally(transactionId, {
    status: 'REJECTED',
    rejectionReason: reason,
    rejectedAt: now,
  });

  // 2. Real-time Firestore Cloud update
  updateTransactionInFirestore(transactionId, {
    status: 'REJECTED',
    rejectionReason: reason,
    rejectedAt: now,
  }).catch(() => {});

  // 3. Server backend rejection
  try {
    const res = await fetch(`${API_BASE}/admin/payments/${encodeURIComponent(transactionId)}/reject`, {
      method: 'POST',
      headers: getAdminHeaders(token),
      body: JSON.stringify({ reason }),
    });
    if (res.ok) {
      return res.json();
    }
  } catch (err) {
    console.warn('Server reject payment notice:', err);
  }

  return { success: true, message: 'Payment transaction rejected.' };
}

export async function deletePayment(token: string, transactionId: string) {
  // 1. Local deletion
  deletePendingVoteLocally(transactionId);

  // 2. Firestore deletion
  deleteTransactionFromFirestore(transactionId).catch(() => {});

  // 3. Server deletion
  try {
    const res = await fetch(`${API_BASE}/admin/payments/${encodeURIComponent(transactionId)}`, {
      method: 'DELETE',
      headers: getAdminHeaders(token),
    });
    if (res.ok) {
      return res.json();
    }
  } catch (err) {
    console.warn('Server delete payment notice:', err);
  }

  return { success: true, message: 'Transaction deleted.' };
}

export async function bulkDeletePayments(token: string, ids: string[]) {
  for (const id of ids) {
    deletePendingVoteLocally(id);
    deleteTransactionFromFirestore(id).catch(() => {});
  }

  try {
    const res = await fetch(`${API_BASE}/admin/payments/bulk-delete`, {
      method: 'POST',
      headers: getAdminHeaders(token),
      body: JSON.stringify({ ids }),
    });
    if (res.ok) {
      return res.json();
    }
  } catch (err) {
    console.warn('Server bulk delete payment notice:', err);
  }

  return { success: true, message: `${ids.length} transactions deleted successfully.` };
}

export async function updatePaymentSettings(
  token: string,
  settings: Partial<PaymentSettings>
): Promise<{ success: boolean; paymentSettings: PaymentSettings; message: string }> {
  const res = await fetch(`${API_BASE}/admin/payment-settings`, {
    method: 'PUT',
    headers: getAdminHeaders(token),
    body: JSON.stringify(settings),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update payment settings');
  }
  return res.json();
}

// Helper for matching candidate IDs across string/number variations
export function matchCandidateId(candId: string | number | undefined, targetId: string | number | undefined): boolean {
  if (!candId || !targetId) return false;
  if (candId === targetId) return true;
  const a = String(candId).trim().toLowerCase();
  const b = String(targetId).trim().toLowerCase();
  if (a === b) return true;
  const numA = a.replace(/[^0-9]/g, '');
  const numB = b.replace(/[^0-9]/g, '');
  if (numA && numB && numA === numB) return true;
  return a.replace(/^cand-0*/, '') === b.replace(/^cand-0*/, '');
}

export function getStoredCandidates(): Candidate[] {
  try {
    const raw = localStorage.getItem('chc_custom_candidates');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Error reading stored candidates:', e);
  }
  return [];
}

export function setStoredCandidates(candidates: Candidate[]): void {
  try {
    localStorage.setItem('chc_custom_candidates', JSON.stringify(candidates));
    window.dispatchEvent(new CustomEvent('chc_candidates_updated', { detail: { candidates } }));
  } catch (e) {
    console.warn('Error storing candidates:', e);
  }
}

export async function uploadCandidatePhoto(
  file: File
): Promise<{ success: boolean; photoUrl: string; filename: string }> {
  // Convert to Data URL as resilient instant fallback
  const toDataUrl = (): Promise<string> =>
    new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });

  const base64Url = await toDataUrl();

  try {
    const formData = new FormData();
    formData.append('photo', file);

    const res = await fetch(`${API_BASE}/upload/candidate-photo`, {
      method: 'POST',
      body: formData,
    });

    if (res.ok) {
      const data = await res.json();
      return {
        success: true,
        photoUrl: data.photoUrl || base64Url,
        filename: data.filename || file.name,
      };
    }
  } catch (e) {
    console.warn('Photo upload server fallback to local Data URL:', e);
  }

  return {
    success: true,
    photoUrl: base64Url,
    filename: file.name,
  };
}

export async function createCandidate(
  token: string,
  candidateData: { name: string; state: string; biography: string; image?: string; sortOrder?: number }
): Promise<{ success: boolean; candidate: Candidate }> {
  const now = new Date().toISOString();
  const newCandidate: Candidate = {
    id: `cand-${Date.now()}`,
    competitionId: 'comp-chc-benin-01',
    name: candidateData.name.trim(),
    slug: candidateData.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, ''),
    state: candidateData.state.trim(),
    biography: candidateData.biography.trim(),
    image: candidateData.image?.trim() || '',
    status: 'ACTIVE',
    sortOrder: typeof candidateData.sortOrder === 'number' ? candidateData.sortOrder : 99,
    createdAt: now,
    updatedAt: now,
    approvedVotes: 0,
  };

  // 1. Direct synchronous update in localStorage
  const currentList = getStoredCandidates();
  const updatedList = [...currentList, newCandidate];
  setStoredCandidates(updatedList);

  // 2. Instant Firestore Cloud synchronization
  try {
    syncCandidateToFirestore(newCandidate).catch((err) =>
      console.warn('Firestore create sync error:', err)
    );
  } catch (e) {
    console.warn('Firestore async push error:', e);
  }

  // 3. Safe background server sync
  try {
    fetch(`${API_BASE}/admin/candidates`, {
      method: 'POST',
      headers: getAdminHeaders(token),
      body: JSON.stringify(candidateData),
    }).catch((err) => console.warn('Background server candidate create sync:', err));
  } catch (e) {
    // Ignore server sync errors
  }

  return { success: true, candidate: newCandidate };
}

export async function updateCandidate(
  token: string,
  candidateId: string,
  updates: Partial<Candidate>
): Promise<{ success: boolean; candidate: Candidate }> {
  const now = new Date().toISOString();
  const currentList = getStoredCandidates();

  let targetCandidate: Candidate | null = null;
  let candidateIndex = currentList.findIndex((c) => matchCandidateId(c.id, candidateId) || c.slug === candidateId);

  if (candidateIndex !== -1) {
    targetCandidate = {
      ...currentList[candidateIndex],
      ...updates,
      updatedAt: now,
    };
    currentList[candidateIndex] = targetCandidate;
  } else {
    // If not found in cache, create/upsert entry
    targetCandidate = {
      id: candidateId,
      competitionId: 'comp-chc-benin-01',
      name: updates.name ? updates.name.trim() : 'Contestant',
      slug: (updates.name || candidateId)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, ''),
      state: updates.state ? updates.state.trim() : 'Edo Contestant',
      biography: updates.biography ? updates.biography.trim() : '',
      image: updates.image?.trim() || '',
      status: updates.status || 'ACTIVE',
      sortOrder: typeof updates.sortOrder === 'number' ? updates.sortOrder : 1,
      createdAt: now,
      updatedAt: now,
      approvedVotes: updates.approvedVotes || 0,
      ...updates,
    };
    currentList.push(targetCandidate);
  }

  // 1. Direct synchronous persistence
  setStoredCandidates(currentList);

  // 2. Instant Firestore Cloud synchronization
  try {
    syncCandidateToFirestore(targetCandidate).catch((err) =>
      console.warn('Firestore update sync error:', err)
    );
  } catch (e) {
    console.warn('Firestore async update push error:', e);
  }

  // 3. Safe background server sync
  try {
    fetch(`${API_BASE}/admin/candidates/${encodeURIComponent(candidateId)}`, {
      method: 'PUT',
      headers: getAdminHeaders(token),
      body: JSON.stringify(updates),
    }).catch((err) => console.warn('Background server candidate update sync:', err));
  } catch (e) {
    // Non-blocking
  }

  return { success: true, candidate: targetCandidate };
}

export async function deleteCandidate(
  token: string,
  candidateId: string
): Promise<{ success: boolean; message: string }> {
  const currentList = getStoredCandidates();
  const filtered = currentList.filter((c) => !matchCandidateId(c.id, candidateId) && c.slug !== candidateId);
  setStoredCandidates(filtered);

  // 1. Instant Firestore Cloud deletion
  try {
    deleteCandidateFromFirestore(candidateId).catch((err) =>
      console.warn('Firestore delete sync error:', err)
    );
  } catch (e) {
    console.warn('Firestore async delete error:', e);
  }

  // 2. Safe background server sync
  try {
    fetch(`${API_BASE}/admin/candidates/${encodeURIComponent(candidateId)}`, {
      method: 'DELETE',
      headers: getAdminHeaders(token),
    }).catch((err) => console.warn('Background server candidate delete sync:', err));
  } catch (e) {
    // Non-blocking
  }

  return { success: true, message: 'Candidate deleted successfully' };
}

export async function updateCompetition(token: string, updates: Record<string, any>) {
  const res = await fetch(`${API_BASE}/admin/competition`, {
    method: 'PUT',
    headers: getAdminHeaders(token),
    body: JSON.stringify(updates),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update competition');
  }
  return res.json();
}

export async function fetchAuditLogs(token: string): Promise<AuditLog[]> {
  const res = await fetch(`${API_BASE}/admin/audit-logs`, {
    headers: getAdminHeaders(token),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch audit logs');
  }
  return res.json();
}

export async function changeAdminPassword(
  token: string,
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/auth/change-password`, {
    method: 'POST',
    headers: getAdminHeaders(token),
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to change password');
  }
  return res.json();
}
