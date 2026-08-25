import React, { useState, useEffect } from 'react';
import { checkTransactionStatus } from '../services/api';
import { VotingTransaction } from '../types';
import { Search, CheckCircle2, Clock, XCircle, AlertCircle, RefreshCw, Hash, Phone, Mail } from 'lucide-react';

interface StatusCheckerProps {
  initialReference?: string;
  onVoteAgain?: () => void;
}

export const StatusChecker: React.FC<StatusCheckerProps> = ({
  initialReference,
  onVoteAgain,
}) => {
  const [referenceInput, setReferenceInput] = useState(initialReference || '');
  const [contactInput, setContactInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [transaction, setTransaction] = useState<VotingTransaction | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (initialReference && initialReference.trim()) {
      setReferenceInput(initialReference.trim());
      handleSearch(initialReference.trim());
    }
  }, [initialReference]);

  const handleSearch = async (refToUse?: string) => {
    const ref = (refToUse || referenceInput).trim();
    if (!ref) {
      setErrorMessage('Please enter your Payment Reference (e.g. VOTE-XXXXXX)');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setTransaction(null);

    try {
      const res = await checkTransactionStatus(ref, contactInput.trim() || undefined);
      setTransaction(res);
    } catch (err: any) {
      setErrorMessage(
        err.message ||
          'No transaction found with this reference. Please check your reference code and try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch();
  };

  return (
    <section className="py-16 bg-white dark:bg-slate-950 border-b border-slate-200/80 dark:border-slate-800 transition-colors duration-200" id="status">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800/60 text-blue-900 dark:text-blue-300 text-xs font-bold uppercase tracking-wider mb-2">
            <Search className="w-3.5 h-3.5" />
            <span>Audit & Verification Tracker</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-blue-950 dark:text-white tracking-tight">
            Check Vote & Payment Status
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1.5">
            Enter your unique payment reference to verify if your bank transfer has been approved and counted.
          </p>
        </div>

        {/* Lookup Card */}
        <div className="bg-slate-50/80 dark:bg-slate-900/80 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs mb-8">
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Payment Reference <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Hash className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400 dark:text-slate-500" />
                <input
                  type="text"
                  required
                  value={referenceInput}
                  onChange={(e) => setReferenceInput(e.target.value.toUpperCase())}
                  placeholder="e.g. VOTE-7F4K92X8"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:border-blue-900 dark:focus:border-amber-400 focus:ring-2 focus:ring-blue-900/10 dark:focus:ring-amber-400/10 font-mono text-base font-bold text-blue-950 dark:text-amber-400 uppercase"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Phone Number <span className="text-slate-400 dark:text-slate-500 font-normal lowercase">(optional verification)</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400 dark:text-slate-500" />
                <input
                  type="text"
                  value={contactInput}
                  onChange={(e) => setContactInput(e.target.value)}
                  placeholder="e.g. 080XXXXXXXX"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:border-blue-900 dark:focus:border-amber-400 focus:ring-2 focus:ring-blue-900/10 text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-blue-900 hover:bg-blue-950 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 font-bold text-xs tracking-wide shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Checking Transaction Status...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Lookup Transaction</span>
                </>
              )}
            </button>
          </form>

          {errorMessage && (
            <div className="mt-4 p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-red-700 dark:text-red-300 text-xs font-medium flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500 dark:text-red-400" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Transaction Result Display */}
        {transaction && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md p-6 space-y-6">
            {/* Status Header Banner */}
            <div
              className={`p-4 rounded-xl flex items-center gap-3.5 ${
                transaction.status === 'APPROVED'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-300'
                  : transaction.status === 'PENDING'
                  ? 'bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-700/60 text-amber-900 dark:text-amber-300'
                  : 'bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-red-900 dark:text-red-300'
              }`}
            >
              <div className="shrink-0">
                {transaction.status === 'APPROVED' && (
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                )}
                {transaction.status === 'PENDING' && (
                  <Clock className="w-8 h-8 text-amber-600 dark:text-amber-400 animate-pulse" />
                )}
                {transaction.status === 'REJECTED' && (
                  <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
                )}
              </div>

              <div>
                <div className="text-xs font-extrabold uppercase tracking-wider">
                  Transaction Status: {transaction.status}
                </div>
                <div className="text-sm font-bold mt-0.5">
                  {transaction.status === 'APPROVED' &&
                    'Your payment has been verified and your votes have been counted.'}
                  {transaction.status === 'PENDING' &&
                    'Your payment is awaiting administrator verification. Votes will be counted once verified.'}
                  {transaction.status === 'REJECTED' &&
                    'Your payment was not approved.'}
                </div>
                {transaction.rejectionReason && (
                  <div className="text-xs text-red-700 dark:text-red-300 font-medium mt-1 bg-white/80 dark:bg-slate-800 p-2 rounded-lg border border-red-200 dark:border-red-800/60">
                    Reason: {transaction.rejectionReason}
                  </div>
                )}
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400 font-semibold">Payment Reference</span>
                <div className="text-base font-black text-blue-950 dark:text-amber-400 font-mono mt-0.5">
                  {transaction.paymentReference}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400 font-semibold">Candidate Supported</span>
                <div className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                  {transaction.candidateName} ({transaction.candidateState})
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400 font-semibold">Votes Purchased</span>
                <div className="text-sm font-bold text-blue-900 dark:text-blue-300 mt-0.5">
                  {transaction.voteQuantity.toLocaleString()} Votes
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400 font-semibold">Expected Amount</span>
                <div className="text-sm font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">
                  ₦{transaction.expectedAmount.toLocaleString()}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400 font-semibold">Submitted Date</span>
                <div className="text-xs font-medium text-slate-700 dark:text-slate-300 mt-0.5">
                  {new Date(transaction.createdAt).toLocaleString()}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400 font-semibold">Last Processed</span>
                <div className="text-xs font-medium text-slate-700 dark:text-slate-300 mt-0.5">
                  {transaction.approvedAt
                    ? new Date(transaction.approvedAt).toLocaleString()
                    : transaction.rejectedAt
                    ? new Date(transaction.rejectedAt).toLocaleString()
                    : 'Awaiting Administrator Review'}
                </div>
              </div>
            </div>

            {onVoteAgain && (
              <div className="text-center pt-2">
                <button
                  onClick={onVoteAgain}
                  className="px-6 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-950 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 font-bold text-xs shadow-xs cursor-pointer"
                >
                  Cast Another Vote
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};
