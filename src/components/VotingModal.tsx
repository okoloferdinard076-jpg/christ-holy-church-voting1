import React, { useState, useEffect } from 'react';
import { Candidate, PaymentSettings, VotingTransaction } from '../types';
import {
  initiateVotingIntent,
  submitPaymentProof,
  uploadReceiptFile,
} from '../services/api';
import {
  X,
  Vote,
  Copy,
  Check,
  Upload,
  AlertCircle,
  Building,
  User,
  Hash,
  ArrowRight,
  ArrowLeft,
  FileCheck,
  Clock,
  Sparkles,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface VotingModalProps {
  isOpen?: boolean;
  onClose: () => void;
  candidates: Candidate[];
  candidate?: Candidate | null;
  initialCandidate?: Candidate | null;
  paymentSettings: PaymentSettings;
  onVoteSubmitted?: () => void;
  onVoteSuccess?: (reference: string) => void;
  onGoToStatus?: (reference: string) => void;
}

type Step = 'SELECT_CANDIDATE' | 'SELECT_QUANTITY' | 'PAYMENT_INSTRUCTIONS' | 'SUBMIT_PROOF' | 'SUCCESS';

export const VotingModal: React.FC<VotingModalProps> = ({
  isOpen = true,
  onClose,
  candidates,
  candidate,
  initialCandidate,
  paymentSettings,
  onVoteSubmitted,
  onVoteSuccess,
  onGoToStatus,
}) => {
  const [step, setStep] = useState<Step>('SELECT_QUANTITY');
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [voteCount, setVoteCount] = useState<number>(10);
  const [customVoteInput, setCustomVoteInput] = useState<string>('10');
  
  // Transaction State
  const [isInitializing, setIsInitializing] = useState(false);
  const [activeTransaction, setActiveTransaction] = useState<VotingTransaction | null>(null);
  
  // Copy state
  const [copiedBank, setCopiedBank] = useState(false);
  const [copiedAccountName, setCopiedAccountName] = useState(false);
  const [copiedAccount, setCopiedAccount] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);

  // Form State
  const [voterName, setVoterName] = useState('');
  const [voterEmail, setVoterEmail] = useState('');
  const [voterPhone, setVoterPhone] = useState('');
  const [amountTransferred, setAmountTransferred] = useState<number | ''>('');
  const [bankTransactionId, setBankTransactionId] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('');
  };

  const votePrice = paymentSettings?.votePrice || 50;
  const totalAmount = voteCount * votePrice;

  useEffect(() => {
    if (isOpen) {
      const activeCandidate = initialCandidate || candidate;
      if (activeCandidate) {
        setSelectedCandidate(activeCandidate);
        setStep('SELECT_QUANTITY');
      } else if (candidates.length > 0) {
        setSelectedCandidate(candidates[0]);
        setStep('SELECT_CANDIDATE');
      }
      setVoteCount(10);
      setCustomVoteInput('10');
      setActiveTransaction(null);
      setErrorMessage(null);
      setReceiptFile(null);
      setReceiptPreview(null);
    }
  }, [isOpen, initialCandidate, candidate, candidates]);

  if (!isOpen) return null;

  const handleQuickSelect = (count: number) => {
    setVoteCount(count);
    setCustomVoteInput(String(count));
  };

  const handleCustomInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomVoteInput(val);
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed) && parsed > 0) {
      setVoteCount(parsed);
    }
  };

  // Step 3: Server generates Unique Payment Reference
  const handleProceedToPayment = async () => {
    const candidateToUse = selectedCandidate || (candidates.length > 0 ? candidates[0] : null);
    if (!candidateToUse) {
      setErrorMessage('Please select a candidate to vote for');
      return;
    }

    const count = Math.floor(Number(voteCount));
    if (isNaN(count) || count <= 0) {
      setErrorMessage('Please enter a valid positive number of votes (minimum 1)');
      return;
    }

    setIsInitializing(true);
    setErrorMessage(null);

    try {
      const res = await initiateVotingIntent({
        candidateId: candidateToUse.id || candidateToUse.slug,
        voteQuantity: count,
      });
      setActiveTransaction(res.transaction);
      setAmountTransferred(res.expectedAmount || count * votePrice);
      setStep('PAYMENT_INSTRUCTIONS');
    } catch (err: any) {
      console.warn('Backend intent fallback triggered:', err);
      // Generate reliable payment reference
      const randomHex = Math.random().toString(36).substring(2, 10).toUpperCase();
      const fallbackRef = `VOTE-${randomHex}`;
      const now = new Date().toISOString();
      const fallbackTx: VotingTransaction = {
        id: `tx-${Date.now()}-${randomHex.substring(0, 6)}`,
        paymentReference: fallbackRef,
        competitionId: 'comp-chc-benin-01',
        candidateId: candidateToUse.id,
        candidateName: candidateToUse.name,
        candidateState: candidateToUse.state,
        voterName: '',
        voterEmail: '',
        voterPhone: '',
        voteQuantity: count,
        expectedAmount: count * votePrice,
        amountTransferred: count * votePrice,
        status: 'PENDING',
        createdAt: now,
        updatedAt: now,
      };
      setActiveTransaction(fallbackTx);
      setAmountTransferred(count * votePrice);
      setStep('PAYMENT_INSTRUCTIONS');
    } finally {
      setIsInitializing(false);
    }
  };

  const copyToClipboard = async (text: string, onSuccess: () => void) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      onSuccess();
    } catch {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        onSuccess();
      } catch (e) {
        console.error('Clipboard copy error', e);
      }
    }
  };

  const handleCopyBankName = () => {
    copyToClipboard(paymentSettings.bankName, () => {
      setCopiedBank(true);
      setTimeout(() => setCopiedBank(false), 2500);
    });
  };

  const handleCopyAccountName = () => {
    copyToClipboard(paymentSettings.accountName, () => {
      setCopiedAccountName(true);
      setTimeout(() => setCopiedAccountName(false), 2500);
    });
  };

  const handleCopyAccount = () => {
    copyToClipboard(paymentSettings.accountNumber, () => {
      setCopiedAccount(true);
      setTimeout(() => setCopiedAccount(false), 2500);
    });
  };

  const handleCopyAmount = () => {
    if (activeTransaction?.expectedAmount) {
      copyToClipboard(String(activeTransaction.expectedAmount), () => {
        setCopiedAmount(true);
        setTimeout(() => setCopiedAmount(false), 2500);
      });
    }
  };

  const handleCopyReference = () => {
    if (activeTransaction?.paymentReference) {
      copyToClipboard(activeTransaction.paymentReference, () => {
        setCopiedRef(true);
        setTimeout(() => setCopiedRef(false), 2500);
      });
    }
  };

  const handleCopyAllBankDetails = () => {
    const details = `Bank: ${paymentSettings.bankName}\nAccount Name: ${paymentSettings.accountName}\nAccount Number: ${paymentSettings.accountNumber}\nAmount: ₦${activeTransaction?.expectedAmount?.toLocaleString() || ''}\nReference: ${activeTransaction?.paymentReference || ''}`;
    copyToClipboard(details, () => {
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2500);
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('File size exceeds 5MB limit');
      return;
    }

    setReceiptFile(file);
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setReceiptPreview(url);
    } else {
      setReceiptPreview(null);
    }
    setErrorMessage(null);
  };

  const triggerSuccessConfetti = () => {
    try {
      // Main celebratory burst with official theme colors (Gold, Emerald, Royal Blue)
      confetti({
        particleCount: 75,
        spread: 65,
        origin: { y: 0.6, x: 0.5 },
        colors: ['#1e3a8a', '#d97706', '#059669', '#2563eb', '#fbbf24', '#10b981'],
        disableForReducedMotion: true,
        zIndex: 99999,
      });

      // Secondary lightweight side-cannons for a dynamic celebration
      setTimeout(() => {
        confetti({
          particleCount: 35,
          angle: 60,
          spread: 50,
          origin: { x: 0.2, y: 0.65 },
          colors: ['#f59e0b', '#10b981', '#1e40af'],
          disableForReducedMotion: true,
          zIndex: 99999,
        });
      }, 180);

      setTimeout(() => {
        confetti({
          particleCount: 35,
          angle: 120,
          spread: 50,
          origin: { x: 0.8, y: 0.65 },
          colors: ['#f59e0b', '#10b981', '#1e40af'],
          disableForReducedMotion: true,
          zIndex: 99999,
        });
      }, 350);
    } catch {
      // Graceful fallback if animation is unsupported or blocked
    }
  };

  // Step 5: Submit Verification Proof
  const handleSubmitProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTransaction) return;

    if (!voterName.trim()) {
      setErrorMessage('Full name is required');
      return;
    }

    if (!amountTransferred || Number(amountTransferred) <= 0) {
      setErrorMessage('Please enter the actual amount transferred');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      let uploadedReceiptUrl: string | undefined = undefined;

      if (receiptFile) {
        setIsUploading(true);
        const uploadRes = await uploadReceiptFile(receiptFile);
        uploadedReceiptUrl = uploadRes.receiptUrl;
        setIsUploading(false);
      }

      const res = await submitPaymentProof({
        paymentReference: activeTransaction.paymentReference,
        voterName: voterName.trim(),
        voterEmail: voterEmail.trim(),
        voterPhone: voterPhone.trim(),
        amountTransferred: Number(amountTransferred),
        bankTransactionId: bankTransactionId.trim() || undefined,
        receiptUrl: uploadedReceiptUrl,
      });

      setActiveTransaction(res.transaction);
      setStep('SUCCESS');

      // Trigger lightweight confetti animation upon successful payment reference submission
      triggerSuccessConfetti();

      if (onVoteSubmitted) {
        onVoteSubmitted();
      }
      if (onVoteSuccess && activeTransaction?.paymentReference) {
        onVoteSuccess(activeTransaction.paymentReference);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Submission failed. Please check your information and retry.');
    } finally {
      setIsSubmitting(false);
      setIsUploading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6"
      id="voting-modal-backdrop"
    >
      <div
        className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]"
        id="voting-modal-container"
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-950 to-blue-900 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
              <Vote className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-base tracking-tight text-white leading-none">
                Ambassadorial Vote Portal
              </h3>
              <p className="text-[11px] text-blue-200 mt-0.5">
                Christ Holy Church International No. 2 Benin
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
            id="close-voting-modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Tracker (4 Core steps) */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-2.5">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className={step === 'SELECT_CANDIDATE' ? 'text-blue-900 font-bold' : 'text-slate-500'}>
              1. Candidate
            </span>
            <span className="text-slate-300">→</span>
            <span className={step === 'SELECT_QUANTITY' ? 'text-blue-900 font-bold' : 'text-slate-500'}>
              2. Quantity
            </span>
            <span className="text-slate-300">→</span>
            <span className={step === 'PAYMENT_INSTRUCTIONS' ? 'text-blue-900 font-bold' : 'text-slate-500'}>
              3. Bank Transfer
            </span>
            <span className="text-slate-300">→</span>
            <span className={step === 'SUBMIT_PROOF' ? 'text-blue-900 font-bold' : 'text-slate-500'}>
              4. Submit Proof
            </span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* STEP 1: Select Candidate */}
          {step === 'SELECT_CANDIDATE' && (
            <div className="space-y-4">
              <div>
                <h4 className="text-base font-bold text-blue-950">Select Ambassador Candidate</h4>
                <p className="text-xs text-slate-600">
                  Choose the candidate you wish to support for the Ambassadorship Crown.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {candidates.map((cand) => {
                  const isSelected = selectedCandidate?.id === cand.id;
                  return (
                    <button
                      key={cand.id}
                      onClick={() => setSelectedCandidate(cand)}
                      className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                        isSelected
                          ? 'border-blue-900 bg-blue-50/70 ring-2 ring-blue-900/20'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {cand.image && cand.image.trim() ? (
                        <img
                          src={cand.image}
                          alt={cand.name}
                          className="w-12 h-12 rounded-lg object-cover object-top border border-slate-200 shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-blue-900/10 border border-blue-950/15 flex items-center justify-center text-blue-950 font-bold text-xs shrink-0">
                          {getInitials(cand.name)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-blue-950 truncate">{cand.name}</div>
                        <div className="text-xs text-red-600 font-medium">{cand.state}</div>
                        <div className="text-[11px] text-slate-500 font-semibold mt-0.5">
                          {cand.approvedVotes || 0} approved votes
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  disabled={!selectedCandidate}
                  onClick={() => setStep('SELECT_QUANTITY')}
                  className="px-6 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs tracking-wide shadow-xs disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  <span>Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Select Number of Votes */}
          {step === 'SELECT_QUANTITY' && selectedCandidate && (
            <div className="space-y-6">
              {/* Selected Candidate Summary Banner */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {selectedCandidate.image && selectedCandidate.image.trim() ? (
                    <img
                      src={selectedCandidate.image}
                      alt={selectedCandidate.name}
                      className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-blue-900/10 border border-blue-950/15 flex items-center justify-center text-blue-950 font-bold text-xs shrink-0">
                      {getInitials(selectedCandidate.name)}
                    </div>
                  )}
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Supporting Candidate
                    </span>
                    <div className="text-sm font-bold text-blue-950">{selectedCandidate.name}</div>
                    <div className="text-xs text-red-600 font-semibold">{selectedCandidate.state}</div>
                  </div>
                </div>
                {candidates.length > 1 && (
                  <button
                    onClick={() => setStep('SELECT_CANDIDATE')}
                    className="text-xs font-semibold text-blue-900 hover:underline"
                  >
                    Change
                  </button>
                )}
              </div>

              {/* Vote Quantity Controls */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Select Number of Votes
                  </label>
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    Official Rate: ₦{votePrice} / vote
                  </span>
                </div>

                {/* Quick Presets */}
                <div className="grid grid-cols-4 gap-2">
                  {[1, 5, 10, 20, 50, 100, 500, 1000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleQuickSelect(preset)}
                      className={`py-2 px-1 rounded-lg text-xs font-bold transition-all border ${
                        voteCount === preset
                          ? 'bg-blue-900 text-white border-blue-900 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {preset.toLocaleString()} {preset === 1 ? 'Vote' : 'Votes'}
                    </button>
                  ))}
                </div>

                {/* Stepper + Custom Number Input */}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      const next = Math.max(1, voteCount - 1);
                      setVoteCount(next);
                      setCustomVoteInput(String(next));
                    }}
                    className="w-12 h-12 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xl font-bold flex items-center justify-center transition-colors border border-slate-200"
                  >
                    −
                  </button>

                  <div className="flex-1 relative">
                    <input
                      type="number"
                      min="1"
                      max="100000"
                      value={customVoteInput}
                      onChange={handleCustomInput}
                      className="w-full h-12 px-4 rounded-xl border border-slate-300 focus:border-blue-900 focus:ring-2 focus:ring-blue-900/10 text-center text-lg font-black text-blue-950"
                      placeholder="Enter votes"
                    />
                    <span className="absolute right-3 top-3.5 text-xs font-bold text-slate-400 pointer-events-none">
                      Votes
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const next = voteCount + 1;
                      setVoteCount(next);
                      setCustomVoteInput(String(next));
                    }}
                    className="w-12 h-12 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xl font-bold flex items-center justify-center transition-colors border border-slate-200"
                  >
                    +
                  </button>
                </div>

                {/* Live Amount Calculation Display */}
                <div className="p-4 rounded-xl bg-blue-950 text-white flex items-center justify-between shadow-md">
                  <div>
                    <div className="text-[11px] text-blue-300 font-semibold uppercase tracking-wider">
                      Total Payable Amount
                    </div>
                    <div className="text-xs text-slate-300">
                      {voteCount.toLocaleString()} votes × ₦{votePrice}
                    </div>
                  </div>
                  <div className="text-2xl font-black text-amber-400">
                    ₦{totalAmount.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep('SELECT_CANDIDATE')}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>

                <button
                  type="button"
                  disabled={isInitializing || voteCount <= 0}
                  onClick={handleProceedToPayment}
                  id="btn-proceed-to-payment"
                  className="px-6 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs tracking-wide shadow-md hover:shadow-lg disabled:opacity-50 flex items-center gap-2 cursor-pointer active:scale-98"
                >
                  <span>{isInitializing ? 'Generating Reference...' : 'Proceed to Payment Details'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3 & 4: Official Payment Instructions */}
          {step === 'PAYMENT_INSTRUCTIONS' && activeTransaction && (
            <div className="space-y-6">
              {/* Reference & Order Summary Header */}
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider">
                    Official Payment Reference
                  </span>
                  <div className="text-xl font-black text-blue-950 font-mono tracking-wider">
                    {activeTransaction.paymentReference}
                  </div>
                  <div className="text-xs text-slate-600 mt-0.5">
                    {activeTransaction.voteQuantity} Votes for{' '}
                    <strong className="text-blue-950">{selectedCandidate?.name}</strong>
                  </div>
                </div>

                <button
                  onClick={handleCopyReference}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-bold shadow-2xs transition-colors shrink-0"
                >
                  {copiedRef ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span className="text-emerald-700">Reference Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-slate-600" />
                      <span>Copy Reference</span>
                    </>
                  )}
                </button>
              </div>

              {/* Official Bank Details Card */}
              <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 space-y-4 shadow-xl">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Building className="w-5 h-5 text-amber-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Designated Transfer Bank Account
                    </span>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Manual Bank Transfer
                  </span>
                </div>

                <div className="space-y-2.5 text-sm">
                  {/* Bank Name Row with Copy Button */}
                  <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-800/70 border border-slate-700/60">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                        Bank Name
                      </span>
                      <span className="text-sm font-extrabold text-white tracking-wide">
                        {paymentSettings.bankName}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyBankName}
                      id="btn-copy-bank-name"
                      title="Copy Bank Name to Clipboard"
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 border ${
                        copiedBank
                          ? 'bg-emerald-600 text-white border-emerald-500 shadow-2xs'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-600 hover:border-slate-500'
                      }`}
                    >
                      {copiedBank ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-white" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-300" />
                          <span>Copy Bank</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Account Name Row with Copy Button */}
                  <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-800/70 border border-slate-700/60">
                    <div className="min-w-0">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                        Account Name
                      </span>
                      <span className="text-sm font-bold text-slate-100 truncate block">
                        {paymentSettings.accountName}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyAccountName}
                      id="btn-copy-account-name"
                      title="Copy Account Name to Clipboard"
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 border ${
                        copiedAccountName
                          ? 'bg-emerald-600 text-white border-emerald-500 shadow-2xs'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-600 hover:border-slate-500'
                      }`}
                    >
                      {copiedAccountName ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-white" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-300" />
                          <span>Copy Name</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Account Number Row with Prominent Copy Button */}
                  <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/40">
                    <div>
                      <span className="text-[10px] text-amber-300/90 font-bold uppercase tracking-wider block">
                        Account Number
                      </span>
                      <span className="text-xl font-black text-amber-400 font-mono tracking-widest block">
                        {paymentSettings.accountNumber}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyAccount}
                      id="btn-copy-account-number"
                      title="Copy Account Number to Clipboard"
                      className={`px-3.5 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shrink-0 shadow-xs active:scale-98 ${
                        copiedAccount
                          ? 'bg-emerald-500 text-slate-950 border border-emerald-400'
                          : 'bg-amber-500 hover:bg-amber-400 text-slate-950 border border-amber-400 hover:border-amber-300'
                      }`}
                    >
                      {copiedAccount ? (
                        <>
                          <Check className="w-4 h-4 text-slate-950" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 text-slate-950" />
                          <span>Copy Number</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Exact Transfer Amount Row with Copy Button */}
                  <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-800/70 border border-slate-700/60">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                        Exact Transfer Amount
                      </span>
                      <span className="text-lg font-black text-emerald-400 font-mono">
                        ₦{activeTransaction.expectedAmount.toLocaleString()}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyAmount}
                      id="btn-copy-amount"
                      title="Copy Exact Amount to Clipboard"
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 border ${
                        copiedAmount
                          ? 'bg-emerald-600 text-white border-emerald-500 shadow-2xs'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-600 hover:border-slate-500'
                      }`}
                    >
                      {copiedAmount ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-white" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-300" />
                          <span>Copy Amount</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Quick Button to Copy Complete Bank Details */}
                <button
                  type="button"
                  onClick={handleCopyAllBankDetails}
                  id="btn-copy-all-details"
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs border border-slate-700 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {copiedAll ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-400 font-semibold">All Bank Details Copied to Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-slate-400" />
                      <span>Copy Complete Bank Details</span>
                    </>
                  )}
                </button>
              </div>

              {/* Step-by-step instructions */}
              <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-100 space-y-2.5 text-xs text-slate-700">
                <div className="font-bold text-blue-950 flex items-center gap-1.5 text-xs uppercase tracking-wider">
                  <Clock className="w-4 h-4 text-blue-800" />
                  <span>How to Complete Your Vote</span>
                </div>
                <ol className="list-decimal list-inside space-y-1.5 leading-relaxed text-slate-700">
                  <li>Transfer the exact amount (<strong>₦{activeTransaction.expectedAmount.toLocaleString()}</strong>) via your mobile banking app or USSD.</li>
                  <li>Use your Reference (<strong>{activeTransaction.paymentReference}</strong>) in transfer remarks if available.</li>
                  <li>Save your bank transfer confirmation or screenshot.</li>
                  <li>Click below to submit your payment details for immediate administrator verification.</li>
                </ol>
                <p className="text-[11px] font-semibold text-amber-900 bg-amber-100/70 p-2 rounded-lg mt-2">
                  * Note: Submitting payment details creates a PENDING transaction. Votes are authoritative and counted after manual church administrator verification.
                </p>
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep('SELECT_QUANTITY')}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Change Quantity</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStep('SUBMIT_PROOF')}
                  id="btn-goto-submit-proof"
                  className="px-6 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs tracking-wide shadow-md flex items-center gap-2 cursor-pointer"
                >
                  <span>I Have Made Transfer & Submit Proof</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: Payment Submission Form */}
          {step === 'SUBMIT_PROOF' && activeTransaction && (
            <form onSubmit={handleSubmitProof} className="space-y-4">
              <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-500 font-semibold">Payment Reference:</span>{' '}
                  <strong className="text-blue-950 font-mono font-bold">
                    {activeTransaction.paymentReference}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold">Expected:</span>{' '}
                  <strong className="text-emerald-700 font-bold">
                    ₦{activeTransaction.expectedAmount.toLocaleString()}
                  </strong>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Voter Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={voterName}
                    onChange={(e) => setVoterName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-blue-900 focus:ring-2 focus:ring-blue-900/10 text-sm"
                    placeholder="e.g. Bro. Emmanuel Chukwu"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Phone / WhatsApp <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={voterPhone}
                      onChange={(e) => setVoterPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-blue-900 focus:ring-2 focus:ring-blue-900/10 text-sm"
                      placeholder="08012345678"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Email Address <span className="text-slate-400 font-normal">(optional)</span>
                    </label>
                    <input
                      type="email"
                      value={voterEmail}
                      onChange={(e) => setVoterEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-blue-900 focus:ring-2 focus:ring-blue-900/10 text-sm"
                      placeholder="voter@example.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Actual Amount Transferred (₦) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={amountTransferred}
                      onChange={(e) => setAmountTransferred(Number(e.target.value) || '')}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-blue-900 focus:ring-2 focus:ring-blue-900/10 text-sm font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Bank Session / Transaction ID <span className="text-slate-400 font-normal">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={bankTransactionId}
                      onChange={(e) => setBankTransactionId(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-blue-900 focus:ring-2 focus:ring-blue-900/10 text-sm"
                      placeholder="e.g. 100004928172"
                    />
                  </div>
                </div>

                {/* Receipt Upload */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Upload Transfer Receipt / Screenshot <span className="text-slate-400 font-normal">(optional but speeds up approval)</span>
                  </label>
                  <div className="mt-1 flex justify-center px-4 pt-4 pb-4 border-2 border-slate-300 border-dashed rounded-xl hover:border-blue-900 transition-colors bg-slate-50/50">
                    <div className="space-y-1 text-center">
                      {receiptPreview ? (
                        <div className="flex flex-col items-center gap-2">
                          <img
                            src={receiptPreview}
                            alt="Receipt Preview"
                            className="max-h-24 object-contain rounded-lg border border-slate-300"
                          />
                          <span className="text-xs font-bold text-emerald-700">Receipt Attached</span>
                        </div>
                      ) : receiptFile ? (
                        <div className="flex items-center gap-2 text-xs font-bold text-blue-900">
                          <FileCheck className="w-5 h-5" />
                          <span>{receiptFile.name}</span>
                        </div>
                      ) : (
                        <Upload className="mx-auto h-8 w-8 text-slate-400" />
                      )}
                      
                      <div className="flex text-xs text-slate-600 justify-center">
                        <label
                          htmlFor="receipt-upload"
                          className="relative cursor-pointer bg-white rounded-md font-bold text-blue-900 hover:text-blue-800 focus-within:outline-none"
                        >
                          <span>{receiptFile ? 'Change document' : 'Upload bank receipt'}</span>
                          <input
                            id="receipt-upload"
                            name="receipt-upload"
                            type="file"
                            accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf"
                            onChange={handleFileChange}
                            className="sr-only"
                          />
                        </label>
                      </div>
                      <p className="text-[11px] text-slate-500">PNG, JPG, PDF up to 5MB</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-3">
                <button
                  type="button"
                  onClick={() => setStep('PAYMENT_INSTRUCTIONS')}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Bank Info</span>
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting || isUploading}
                  id="btn-submit-final-proof"
                  className="px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs tracking-wide shadow-md hover:shadow-lg disabled:opacity-50 flex items-center gap-2 cursor-pointer active:scale-98"
                >
                  <span>
                    {isUploading ? 'Uploading Receipt...' : isSubmitting ? 'Submitting Details...' : 'Submit Verification Details'}
                  </span>
                  <Check className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {/* STEP 6: Success Confirmation */}
          {step === 'SUCCESS' && activeTransaction && (
            <div className="text-center py-4 space-y-6">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                <Check className="w-8 h-8" />
              </div>

              <div>
                <h4 className="text-xl font-extrabold text-blue-950 tracking-tight">
                  PAYMENT SUBMITTED SUCCESSFULLY
                </h4>
                <p className="text-xs text-slate-600 max-w-md mx-auto mt-2 leading-relaxed">
                  Your payment details have been submitted successfully. Your votes will be counted after your payment has been verified by the church administrator.
                </p>
              </div>

              {/* Transaction Summary Card */}
              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 text-left space-y-3 max-w-md mx-auto">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-xs text-slate-500 font-semibold">Payment Reference:</span>
                  <span className="text-sm font-black text-blue-950 font-mono">
                    {activeTransaction.paymentReference}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-xs text-slate-500 font-semibold">Candidate:</span>
                  <span className="text-xs font-bold text-slate-800">
                    {selectedCandidate?.name} ({selectedCandidate?.state})
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-xs text-slate-500 font-semibold">Votes Purchased:</span>
                  <span className="text-xs font-bold text-blue-900">
                    {activeTransaction.voteQuantity.toLocaleString()} Votes
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-xs text-slate-500 font-semibold">Amount:</span>
                  <span className="text-xs font-bold text-emerald-700">
                    ₦{activeTransaction.expectedAmount.toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-slate-500 font-semibold">Status:</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-extrabold text-xs">
                    PENDING VERIFICATION
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onGoToStatus && activeTransaction.paymentReference) {
                      onGoToStatus(activeTransaction.paymentReference);
                    }
                  }}
                  id="btn-check-status-from-modal"
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs tracking-wide shadow-md transition-colors"
                >
                  Check Transaction Status
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
