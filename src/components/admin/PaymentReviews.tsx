import React, { useState, useEffect } from 'react';
import { VotingTransaction, Candidate } from '../../types';
import {
  fetchAdminPayments,
  approvePayment,
  rejectPayment,
  deletePayment,
  bulkDeletePayments,
} from '../../services/api';
import {
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  FileText,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  Trash2,
  Mail,
  AlertCircle,
  CheckSquare,
  Square,
  Sparkles,
} from 'lucide-react';

interface PaymentReviewsProps {
  token: string;
  candidates: Candidate[];
  initialStatusFilter?: string;
  onStatsUpdated: () => void;
}

export const PaymentReviews: React.FC<PaymentReviewsProps> = ({
  token,
  candidates,
  initialStatusFilter = 'ALL',
  onStatsUpdated,
}) => {
  const [payments, setPayments] = useState<VotingTransaction[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter);
  const [candidateFilter, setCandidateFilter] = useState('ALL');
  const [stateFilter, setStateFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Selected Transaction for Review / Actions Modal
  const [selectedTx, setSelectedTx] = useState<VotingTransaction | null>(null);
  
  // Selection for bulk actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Confirmation states
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [txToDelete, setTxToDelete] = useState<VotingTransaction | null>(null);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

  const [rejectionReason, setRejectionReason] = useState('Payment transfer not received in church bank statement');
  const [customRejectReason, setCustomRejectReason] = useState('');
  
  const [actionLoading, setActionLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadPayments = async () => {
    setIsLoading(true);
    try {
      const res = await fetchAdminPayments(token, {
        status: statusFilter,
        candidateId: candidateFilter,
        state: stateFilter,
        search: searchTerm,
        page,
        limit: 15,
      });
      setPayments(res.items);
      setTotal(res.total);
      setTotalPages(res.totalPages);
      setSelectedIds([]);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, [statusFilter, candidateFilter, stateFilter, page, token]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadPayments();
  };

  const handleApprove = async () => {
    if (!selectedTx) return;
    setActionLoading(true);
    setStatusMessage(null);

    try {
      const res = await approvePayment(token, selectedTx.id);
      setStatusMessage({ type: 'success', text: res.message });
      setShowApproveConfirm(false);
      setSelectedTx(null);
      loadPayments();
      onStatsUpdated();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Approval failed' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedTx) return;
    setActionLoading(true);
    setStatusMessage(null);

    const finalReason =
      rejectionReason === 'Other'
        ? customRejectReason.trim() || 'Payment could not be verified in church bank records'
        : rejectionReason;

    try {
      const res = await rejectPayment(token, selectedTx.id, finalReason);
      setStatusMessage({ type: 'success', text: res.message });
      setShowRejectModal(false);
      setSelectedTx(null);
      loadPayments();
      onStatsUpdated();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Rejection failed' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteSingle = async () => {
    if (!txToDelete) return;
    setActionLoading(true);
    setStatusMessage(null);

    try {
      const res = await deletePayment(token, txToDelete.id);
      setStatusMessage({ type: 'success', text: res.message });
      setShowDeleteModal(false);
      setTxToDelete(null);
      if (selectedTx?.id === txToDelete.id) {
        setSelectedTx(null);
      }
      loadPayments();
      onStatsUpdated();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to delete transaction' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setActionLoading(true);
    setStatusMessage(null);

    try {
      const res = await bulkDeletePayments(token, selectedIds);
      setStatusMessage({ type: 'success', text: res.message });
      setShowBulkDeleteModal(false);
      setSelectedIds([]);
      loadPayments();
      onStatsUpdated();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to bulk delete transactions' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.length === payments.length && payments.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(payments.map((p) => p.id));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectOnlyRejectedOrPending = () => {
    const failedIds = payments
      .filter((p) => p.status === 'REJECTED' || (p.status === 'PENDING' && !p.receiptUrl && !p.amountTransferred))
      .map((p) => p.id);
    setSelectedIds(failedIds);
  };

  return (
    <div className="space-y-6" id="admin-payments-view">
      {/* Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-blue-950 flex items-center gap-2">
            <span>Payment Verification & History Management</span>
          </h2>
          <p className="text-xs text-slate-500">
            Verify bank transfers, send automated email status updates, and delete failed/abandoned attempts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
            Total Records: {total}
          </span>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between shadow-xs ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-slate-400 hover:text-slate-600 ml-4 font-bold text-sm cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Filter Bar & Search */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by Reference, Voter Name, Phone, Email, or Bank Session ID..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending Approval</option>
              <option value="APPROVED">Approved Only</option>
              <option value="REJECTED">Rejected / Failed</option>
            </select>

            <select
              value={candidateFilter}
              onChange={(e) => {
                setCandidateFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 cursor-pointer"
            >
              <option value="ALL">All Candidates</option>
              {candidates.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.state})
                </option>
              ))}
            </select>

            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl bg-blue-950 hover:bg-blue-900 text-white font-bold text-xs cursor-pointer"
            >
              Filter
            </button>
          </div>
        </form>

        {/* Batch / Cleanup Action Bar */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSelectAll}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-[11px] flex items-center gap-1.5 cursor-pointer"
            >
              {selectedIds.length > 0 && selectedIds.length === payments.length ? (
                <>
                  <CheckSquare className="w-3.5 h-3.5 text-blue-700" />
                  <span>Deselect All</span>
                </>
              ) : (
                <>
                  <Square className="w-3.5 h-3.5 text-slate-500" />
                  <span>Select All on Page</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleSelectOnlyRejectedOrPending}
              className="px-2.5 py-1.5 rounded-lg border border-amber-200 bg-amber-50/80 hover:bg-amber-100 text-amber-900 font-bold text-[11px] flex items-center gap-1.5 cursor-pointer"
              title="Select all rejected votes and abandoned attempts"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Select Failed / Rejected</span>
            </button>

            {selectedIds.length > 0 && (
              <span className="text-[11px] font-bold text-blue-900 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">
                {selectedIds.length} selected
              </span>
            )}
          </div>

          {selectedIds.length > 0 && (
            <button
              type="button"
              onClick={() => setShowBulkDeleteModal(true)}
              className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-black text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Selected ({selectedIds.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Transactions Container: Table for Desktop/Tablet, Cards for Mobile */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Desktop / Tablet Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[760px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-black tracking-wider text-[10px]">
                <th className="py-3 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={payments.length > 0 && selectedIds.length === payments.length}
                    onChange={handleSelectAll}
                    className="rounded border-slate-300 text-blue-950 focus:ring-blue-950 cursor-pointer"
                  />
                </th>
                <th className="py-3 px-3">Ref Code</th>
                <th className="py-3 px-3">Voter / Contact</th>
                <th className="py-3 px-3">Candidate</th>
                <th className="py-3 px-3 text-center">Votes</th>
                <th className="py-3 px-3 text-right">Amount</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-center">Proof</th>
                <th className="py-3 px-3 text-center">Actions</th>
                <th className="py-3 px-3 text-center w-16">Delete</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400">
                    Loading transactions...
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400">
                    No transactions found matching your filters.
                  </td>
                </tr>
              ) : (
                payments.map((tx) => {
                  const isSelected = selectedIds.includes(tx.id);
                  return (
                    <tr
                      key={tx.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isSelected ? 'bg-blue-50/40' : ''
                      }`}
                    >
                      {/* Checkbox column */}
                      <td className="py-3.5 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(tx.id)}
                          className="rounded border-slate-300 text-blue-950 focus:ring-blue-950 cursor-pointer"
                        />
                      </td>

                      {/* Reference code */}
                      <td className="py-3.5 px-3 font-mono font-bold text-blue-950">
                        <div className="flex items-center gap-1.5">
                          <span>{tx.paymentReference}</span>
                          {tx.voterEmail && (
                            <Mail
                              className="w-3 h-3 text-slate-400"
                              title={`Voter email on file: ${tx.voterEmail}`}
                            />
                          )}
                        </div>
                      </td>

                      {/* Voter info */}
                      <td className="py-3.5 px-3">
                        <div className="font-bold text-slate-900">{tx.voterName || 'Anonymous Voter'}</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {tx.voterPhone || tx.voterEmail || 'No contact specified'}
                        </div>
                      </td>

                      {/* Candidate */}
                      <td className="py-3.5 px-3">
                        <div className="font-semibold text-slate-800">{tx.candidateName}</div>
                        <div className="text-[10px] text-blue-700 font-bold">{tx.candidateState}</div>
                      </td>

                      {/* Vote quantity */}
                      <td className="py-3.5 px-3 text-center font-black text-blue-900">
                        {tx.voteQuantity}
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-3 text-right font-semibold">
                        <div>₦{tx.expectedAmount.toLocaleString()}</div>
                        {tx.amountTransferred > 0 && tx.amountTransferred !== tx.expectedAmount && (
                          <div className="text-[10px] text-amber-700 font-bold">
                            Paid: ₦{tx.amountTransferred.toLocaleString()}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                            tx.status === 'APPROVED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : tx.status === 'PENDING'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {tx.status}
                        </span>
                        {tx.status === 'REJECTED' && tx.rejectionReason && (
                          <span
                            className="block text-[9px] text-red-600 font-medium truncate max-w-[120px] mx-auto mt-0.5"
                            title={tx.rejectionReason}
                          >
                            {tx.rejectionReason}
                          </span>
                        )}
                      </td>

                      {/* Proof receipt */}
                      <td className="py-3.5 px-3 text-center">
                        {tx.receiptUrl ? (
                          <a
                            href={tx.receiptUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-blue-800 hover:text-blue-950 font-bold text-xs bg-blue-50 px-2 py-1 rounded-md border border-blue-200"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Receipt</span>
                          </a>
                        ) : (
                          <span className="text-slate-400 text-[10px]">No file</span>
                        )}
                      </td>

                      {/* Review / Process Action */}
                      <td className="py-3.5 px-3 text-center">
                        <button
                          onClick={() => setSelectedTx(tx)}
                          className="px-3 py-1.5 rounded-lg bg-blue-950 hover:bg-blue-900 text-white font-bold text-xs transition-colors cursor-pointer shadow-2xs"
                        >
                          Review
                        </button>
                      </td>

                      {/* Delete History Column */}
                      <td className="py-3.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setTxToDelete(tx);
                            setShowDeleteModal(true);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
                          title="Delete transaction history record"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Dedicated Mobile Card View (Fluid on phone screens) */}
        <div className="block md:hidden divide-y divide-slate-100">
          {isLoading ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              Loading transactions...
            </div>
          ) : payments.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No transactions found matching your filters.
            </div>
          ) : (
            payments.map((tx) => {
              const isSelected = selectedIds.includes(tx.id);
              return (
                <div
                  key={tx.id}
                  className={`p-4 space-y-3 transition-colors ${
                    isSelected ? 'bg-blue-50/50' : 'hover:bg-slate-50/50'
                  }`}
                >
                  {/* Top Bar: Checkbox, Ref Code, Status Badge */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(tx.id)}
                        className="rounded border-slate-300 text-blue-950 focus:ring-blue-950 cursor-pointer h-4 w-4 shrink-0"
                      />
                      <span className="font-mono font-bold text-xs text-blue-950 truncate">
                        {tx.paymentReference}
                      </span>
                    </div>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider shrink-0 ${
                        tx.status === 'APPROVED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : tx.status === 'PENDING'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {tx.status}
                    </span>
                  </div>

                  {/* Voter & Candidate Details Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200/70">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Voter</span>
                      <div className="font-bold text-slate-900 truncate">
                        {tx.voterName || 'Anonymous Voter'}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono truncate">
                        {tx.voterPhone || tx.voterEmail || 'No contact'}
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Candidate</span>
                      <div className="font-bold text-blue-950 truncate">{tx.candidateName}</div>
                      <div className="text-[10px] text-blue-700 font-semibold">{tx.candidateState}</div>
                    </div>
                  </div>

                  {/* Financial & Votes Row */}
                  <div className="flex items-center justify-between text-xs px-1">
                    <div>
                      <span className="text-slate-500 text-[11px]">Votes: </span>
                      <span className="font-black text-blue-950">{tx.voteQuantity}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[11px]">Amount: </span>
                      <span className="font-black text-slate-900">₦{tx.expectedAmount.toLocaleString()}</span>
                    </div>
                    {tx.receiptUrl ? (
                      <a
                        href={tx.receiptUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-blue-800 font-bold text-[11px] bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200"
                      >
                        <FileText className="w-3 h-3" /> Receipt
                      </a>
                    ) : (
                      <span className="text-slate-400 text-[10px]">No file</span>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setTxToDelete(tx);
                        setShowDeleteModal(true);
                      }}
                      className="px-2.5 py-1.5 rounded-lg text-slate-500 hover:text-red-700 hover:bg-red-50 text-xs font-semibold flex items-center gap-1 border border-slate-200 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                      <span>Delete</span>
                    </button>
                    <button
                      onClick={() => setSelectedTx(tx)}
                      className="flex-1 py-1.5 px-3 rounded-lg bg-blue-950 hover:bg-blue-900 text-white font-bold text-xs text-center cursor-pointer shadow-2xs"
                    >
                      Review Payment
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
            <span className="text-slate-600 font-medium">
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1.5 rounded-lg border bg-white disabled:opacity-50 flex items-center gap-1 font-bold cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Prev
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1.5 rounded-lg border bg-white disabled:opacity-50 flex items-center gap-1 font-bold cursor-pointer"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Review Modal */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="bg-blue-950 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-400" />
                <h3 className="font-extrabold text-sm sm:text-base">
                  PAYMENT REVIEW: {selectedTx.paymentReference}
                </h3>
              </div>
              <button
                onClick={() => setSelectedTx(null)}
                className="text-slate-300 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 text-xs flex-1">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 font-semibold">Payment Reference</span>
                  <div className="font-mono font-bold text-sm text-blue-950 mt-0.5">
                    {selectedTx.paymentReference}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 font-semibold">Candidate Supported</span>
                  <div className="font-bold text-slate-900 mt-0.5">
                    {selectedTx.candidateName}
                  </div>
                  <div className="text-[10px] text-blue-700 font-bold">{selectedTx.candidateState}</div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 font-semibold">Votes Purchased</span>
                  <div className="font-black text-sm text-blue-900 mt-0.5">
                    {selectedTx.voteQuantity} Votes
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 font-semibold">Expected Amount</span>
                  <div className="font-bold text-slate-900 mt-0.5">
                    ₦{selectedTx.expectedAmount.toLocaleString()}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 font-semibold">Amount Transferred</span>
                  <div className="font-bold text-emerald-700 mt-0.5">
                    ₦{selectedTx.amountTransferred?.toLocaleString() || '0'}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 font-semibold">Current Status</span>
                  <div className="mt-0.5">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
                        selectedTx.status === 'APPROVED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : selectedTx.status === 'PENDING'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {selectedTx.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Voter Contact Info */}
              <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-100 space-y-2">
                <h4 className="font-bold text-blue-950 uppercase tracking-wider text-[11px] flex items-center justify-between">
                  <span>Voter Contact & Bank Details</span>
                  {selectedTx.voterEmail && (
                    <span className="text-[10px] text-blue-700 font-normal flex items-center gap-1">
                      <Mail className="w-3 h-3" /> Email enabled
                    </span>
                  )}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <span className="text-slate-500">Voter Name:</span>
                    <div className="font-bold text-slate-800">{selectedTx.voterName || 'N/A'}</div>
                  </div>
                  <div>
                    <span className="text-slate-500">Email:</span>
                    <div className="font-medium text-slate-800">{selectedTx.voterEmail || 'N/A'}</div>
                  </div>
                  <div>
                    <span className="text-slate-500">Phone:</span>
                    <div className="font-medium text-slate-800">{selectedTx.voterPhone || 'N/A'}</div>
                  </div>
                </div>
                {selectedTx.bankTransactionId && (
                  <div className="pt-1 text-[11px]">
                    <span className="text-slate-500 font-semibold">Bank Session ID:</span>{' '}
                    <strong className="font-mono text-slate-900">{selectedTx.bankTransactionId}</strong>
                  </div>
                )}
              </div>

              {/* Receipt Preview */}
              {selectedTx.receiptUrl && (
                <div className="space-y-2">
                  <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                    Payment Receipt Proof
                  </span>
                  <div className="border border-slate-200 rounded-xl p-2 bg-slate-50 flex justify-center">
                    <img
                      src={selectedTx.receiptUrl}
                      alt="Payment Receipt"
                      className="max-h-56 object-contain rounded-lg shadow-xs"
                    />
                  </div>
                </div>
              )}

              {/* Audit history for transaction */}
              {selectedTx.approvedAt && (
                <div className="text-[11px] text-emerald-800 bg-emerald-50 p-3 rounded-lg border border-emerald-200 space-y-1">
                  <div className="font-bold">
                    ✅ Approved on {new Date(selectedTx.approvedAt).toLocaleString()} by Admin ({selectedTx.approvedByName || selectedTx.approvedBy})
                  </div>
                </div>
              )}
              {selectedTx.rejectedAt && (
                <div className="text-[11px] text-red-800 bg-red-50 p-3 rounded-lg border border-red-200 space-y-1">
                  <div className="font-bold">
                    ⚠️ Rejected on {new Date(selectedTx.rejectedAt).toLocaleString()} by Admin ({selectedTx.rejectedByName || selectedTx.rejectedBy})
                  </div>
                  <div className="font-semibold text-red-900">Reason: {selectedTx.rejectionReason}</div>
                </div>
              )}
            </div>

            {/* Actions Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center justify-between sm:justify-start gap-2 w-full sm:w-auto">
                <button
                  onClick={() => setSelectedTx(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-100 text-xs cursor-pointer flex-1 sm:flex-none text-center"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTxToDelete(selectedTx);
                    setShowDeleteModal(true);
                  }}
                  className="px-3 py-2 rounded-xl text-red-600 hover:bg-red-50 font-bold text-xs flex items-center justify-center gap-1 border border-red-200 cursor-pointer flex-1 sm:flex-none"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Record</span>
                </button>
              </div>

              {selectedTx.status === 'PENDING' ? (
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => setShowRejectModal(true)}
                    className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-xs cursor-pointer text-center"
                  >
                    Reject Payment
                  </button>
                  <button
                    onClick={() => setShowApproveConfirm(true)}
                    className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs shadow-md cursor-pointer text-center"
                  >
                    Approve Payment
                  </button>
                </div>
              ) : (
                <span className="text-xs text-slate-500 italic text-center sm:text-right">
                  Status: {selectedTx.status}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog on Approve */}
      {showApproveConfirm && selectedTx && (
        <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h4 className="text-base font-extrabold text-blue-950">
              Confirm Payment Approval
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to approve this payment? Approving this transaction will atomically add{' '}
              <strong className="text-blue-950">{selectedTx.voteQuantity} votes</strong> to{' '}
              <strong className="text-blue-950">{selectedTx.candidateName}</strong> in the authoritative vote ledger.
            </p>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                disabled={actionLoading}
                onClick={() => setShowApproveConfirm(false)}
                className="py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={actionLoading}
                onClick={handleApprove}
                className="py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs shadow-md disabled:opacity-50 cursor-pointer"
              >
                {actionLoading ? 'Approving Votes...' : 'Approve Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal with Structured Reasons */}
      {showRejectModal && selectedTx && (
        <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-2 text-red-600">
              <XCircle className="w-5 h-5" />
              <h4 className="text-base font-extrabold">Reject Payment Transaction</h4>
            </div>

            <p className="text-xs text-slate-600">
              Please specify the reason for rejection. This reason will be recorded in the audit log for record-keeping and status lookup.
            </p>

            <div className="space-y-3 text-xs">
              <label className="block font-bold text-slate-700">Select Rejection Reason:</label>
              <select
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-medium bg-slate-50 focus:bg-white text-xs cursor-pointer"
              >
                <option value="Payment transfer not received in church bank statement">Payment transfer not received in church bank statement</option>
                <option value="Transferred amount is less than expected votes cost">Transferred amount is less than expected votes cost</option>
                <option value="Invalid, fake, or unreadable receipt image">Invalid, fake, or unreadable receipt image</option>
                <option value="Duplicate payment submission / already processed">Duplicate payment submission / already processed</option>
                <option value="Bank transaction reference could not be verified">Bank transaction reference could not be verified</option>
                <option value="Other">Other (specify custom detailed reason)</option>
              </select>

              {rejectionReason === 'Other' && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Custom Explanation:
                  </label>
                  <textarea
                    rows={3}
                    value={customRejectReason}
                    onChange={(e) => setCustomRejectReason(e.target.value)}
                    placeholder="Enter detailed reason explaining why payment was not verified..."
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-red-500"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                disabled={actionLoading}
                onClick={() => setShowRejectModal(false)}
                className="py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={actionLoading}
                onClick={handleReject}
                className="py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs shadow-md disabled:opacity-50 cursor-pointer"
              >
                {actionLoading ? 'Rejecting...' : 'Reject Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Single Transaction Confirmation Modal */}
      {showDeleteModal && txToDelete && (
        <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="p-2.5 bg-red-100 rounded-xl">
                <Trash2 className="w-5 h-5 text-red-700" />
              </div>
              <div>
                <h4 className="text-base font-extrabold text-slate-900">Delete Transaction History</h4>
                <span className="text-[11px] font-mono text-slate-500 font-bold">{txToDelete.paymentReference}</span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to permanently delete this transaction record for{' '}
              <strong className="text-slate-900">{txToDelete.voterName || 'Anonymous'}</strong>? This helps clean up test transactions, failed attempts, and clutter.
            </p>

            {txToDelete.status === 'APPROVED' && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-[11px] text-red-800 font-semibold flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Warning:</strong> This transaction is marked as <strong>APPROVED</strong>. Deleting it will also deduct <strong>{txToDelete.voteQuantity} votes</strong> from {txToDelete.candidateName}'s official tally.
                </span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                disabled={actionLoading}
                onClick={() => {
                  setShowDeleteModal(false);
                  setTxToDelete(null);
                }}
                className="py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={actionLoading}
                onClick={handleDeleteSingle}
                className="py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs shadow-md disabled:opacity-50 cursor-pointer"
              >
                {actionLoading ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Modal */}
      {showBulkDeleteModal && selectedIds.length > 0 && (
        <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="p-2.5 bg-red-100 rounded-xl">
                <Trash2 className="w-5 h-5 text-red-700" />
              </div>
              <div>
                <h4 className="text-base font-extrabold text-slate-900">Bulk Delete Transactions</h4>
                <span className="text-xs text-red-600 font-bold">{selectedIds.length} records selected</span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to permanently delete all <strong>{selectedIds.length} selected transaction records</strong>? This operation removes failed, rejected, or abandoned attempts to make your transaction history neat and uncluttered.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                disabled={actionLoading}
                onClick={() => setShowBulkDeleteModal(false)}
                className="py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={actionLoading}
                onClick={handleBulkDelete}
                className="py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs shadow-md disabled:opacity-50 cursor-pointer"
              >
                {actionLoading ? 'Deleting...' : `Delete ${selectedIds.length} Records`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
