export type UserRole = 'VOTER' | 'ADMIN' | 'SUPER_ADMIN';

export type CompetitionStatus = 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'PAUSED' | 'ENDED' | 'ARCHIVED';

export type TransactionStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface Competition {
  id: string;
  name: string;
  slug: string;
  description: string;
  image?: string;
  startDate: string;
  endDate: string;
  votePrice: number;
  status: CompetitionStatus;
  votingRules?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Candidate {
  id: string;
  competitionId: string;
  name: string;
  slug: string;
  state: string;
  biography: string;
  image: string;
  status: 'ACTIVE' | 'INACTIVE';
  sortOrder: number;
  approvedVotes?: number;
  createdAt: string;
  updatedAt: string;
}

export interface VotingTransaction {
  id: string;
  paymentReference: string;
  userId?: string;
  competitionId: string;
  candidateId: string;
  candidateName?: string;
  candidateState?: string;
  voterName: string;
  voterEmail: string;
  voterPhone: string;
  voteQuantity: number;
  expectedAmount: number;
  amountTransferred: number;
  bankTransactionId?: string;
  receiptUrl?: string;
  status: TransactionStatus;
  rejectionReason?: string;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedByName?: string;
  rejectedAt?: string;
  submittedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VoteLedgerEntry {
  id: string;
  transactionId: string;
  competitionId: string;
  candidateId: string;
  quantity: number;
  createdAt: string;
}

export interface PaymentSettings {
  id: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  votePrice: number;
  paymentInstructions: string;
  updatedBy?: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  actorUserId: string;
  actorName: string;
  action: string;
  entityType: string;
  entityId: string;
  previousValue?: string;
  newValue?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface PublicContestData {
  competition: Competition;
  candidates: Candidate[];
  paymentSettings: PaymentSettings;
  totalApprovedVotes: number;
  pendingTransactionsCount?: number;
}

export interface AdminDashboardStats {
  totalApprovedRevenue: number;
  totalApprovedVotes: number;
  pendingPaymentsCount: number;
  approvedPaymentsCount: number;
  rejectedPaymentsCount: number;
  totalTransactionsCount: number;
  candidatesCount: number;
  competitionStatus: CompetitionStatus;
  candidateBreakdown: {
    candidateId: string;
    candidateName: string;
    state: string;
    approvedVotes: number;
    approvedRevenue: number;
    pendingVotes: number;
    pendingRevenue: number;
  }[];
}
