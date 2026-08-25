import { PublicContestData, Candidate, VotingTransaction, AdminDashboardStats, PaymentSettings, AuditLog } from '../types';

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
  voterEmail: string;
  voterPhone: string;
  amountTransferred: number;
  bankTransactionId?: string;
  receiptUrl?: string;
}): Promise<{
  success: boolean;
  message: string;
  transaction: VotingTransaction;
}> {
  const res = await safeFetch(`${API_BASE}/vote/submit-proof`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  }, 2, 400);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.message || 'Failed to submit payment verification proof');
  }
  return res.json();
}

export async function checkTransactionStatus(
  reference: string,
  contact?: string
): Promise<VotingTransaction> {
  const url = new URL(`${window.location.origin}${API_BASE}/transaction/status/${encodeURIComponent(reference.trim())}`);
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
  const params = new URLSearchParams();
  if (query.status) params.set('status', query.status);
  if (query.candidateId) params.set('candidateId', query.candidateId);
  if (query.state) params.set('state', query.state);
  if (query.search) params.set('search', query.search);
  if (query.page) params.set('page', String(query.page));
  if (query.limit) params.set('limit', String(query.limit));

  const res = await fetch(`${API_BASE}/admin/payments?${params.toString()}`, {
    headers: getAdminHeaders(token),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to load payments');
  }
  return res.json();
}

export async function approvePayment(token: string, transactionId: string) {
  const res = await fetch(`${API_BASE}/admin/payments/${transactionId}/approve`, {
    method: 'POST',
    headers: getAdminHeaders(token),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to approve transaction');
  }
  return res.json();
}

export async function rejectPayment(token: string, transactionId: string, reason: string) {
  const res = await fetch(`${API_BASE}/admin/payments/${transactionId}/reject`, {
    method: 'POST',
    headers: getAdminHeaders(token),
    body: JSON.stringify({ reason }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to reject transaction');
  }
  return res.json();
}

export async function deletePayment(token: string, transactionId: string) {
  const res = await fetch(`${API_BASE}/admin/payments/${transactionId}`, {
    method: 'DELETE',
    headers: getAdminHeaders(token),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to delete transaction');
  }
  return res.json();
}

export async function bulkDeletePayments(token: string, ids: string[]) {
  const res = await fetch(`${API_BASE}/admin/payments/bulk-delete`, {
    method: 'POST',
    headers: getAdminHeaders(token),
    body: JSON.stringify({ ids }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to bulk delete transactions');
  }
  return res.json();
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

  // 2. Safe background server sync
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

  // 2. Safe background server sync
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
