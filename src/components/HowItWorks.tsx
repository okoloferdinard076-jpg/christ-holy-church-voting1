import React, { useState } from 'react';
import { UserCheck, Vote, Key, Building2, Send, CheckCircle2, ShieldCheck, Copy, Check } from 'lucide-react';
import { PaymentSettings } from '../types';

interface HowItWorksProps {
  paymentSettings: PaymentSettings;
  onStartVoting: () => void;
}

export const HowItWorks: React.FC<HowItWorksProps> = ({
  paymentSettings,
  onStartVoting,
}) => {
  const [copiedBankInfo, setCopiedBankInfo] = useState(false);
  const price = paymentSettings?.votePrice || 50;

  const handleCopyAccount = (e: React.MouseEvent) => {
    e.stopPropagation();
    const text = `${paymentSettings.bankName} - ${paymentSettings.accountNumber} (${paymentSettings.accountName})`;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopiedBankInfo(true);
    setTimeout(() => setCopiedBankInfo(false), 2500);
  };

  const steps = [
    {
      number: '1',
      title: 'Choose a candidate',
      description: 'Select the ambassador you want to support from the candidate list.',
      icon: UserCheck,
    },
    {
      number: '2',
      title: 'Select your votes',
      description: `Each vote costs ₦${price}. Select or enter any quantity you wish to purchase.`,
      icon: Vote,
    },
    {
      number: '3',
      title: 'Get your payment reference',
      description: 'The system securely generates a unique payment reference for your transaction.',
      icon: Key,
    },
    {
      number: '4',
      title: 'Make your bank transfer',
      description: `Transfer the exact amount to the official designated bank account (${paymentSettings.bankName} - ${paymentSettings.accountNumber}).`,
      icon: Building2,
    },
    {
      number: '5',
      title: 'Submit your payment details',
      description: 'Enter your transfer details, contact info, and upload your payment receipt if available.',
      icon: Send,
    },
    {
      number: '6',
      title: 'Wait for verification',
      description: 'An administrator verifies the payment, and your votes are immediately allocated and counted in the official ledger.',
      icon: CheckCircle2,
    },
  ];

  return (
    <section className="py-16 bg-white dark:bg-slate-950 border-b border-slate-200/80 dark:border-slate-800 transition-colors duration-200" id="how-it-works">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800/60 text-blue-900 dark:text-blue-300 text-xs font-bold uppercase tracking-wider mb-3">
            <ShieldCheck className="w-4 h-4 text-blue-800 dark:text-blue-400" />
            <span>Secure 6-Step Process</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-blue-950 dark:text-white tracking-tight">
            How Voting Works
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-2">
            A transparent, auditable process designed to ensure complete integrity for every single vote.
          </p>
        </div>

        {/* 6 Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.number}
                className="bg-slate-50/70 dark:bg-slate-900/80 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 hover:border-blue-900/30 dark:hover:border-slate-700 hover:bg-blue-50/30 dark:hover:bg-slate-800/50 transition-all flex flex-col justify-between relative group"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-900 dark:bg-slate-800 text-white flex items-center justify-center font-black text-lg shadow-sm group-hover:scale-105 transition-transform border border-transparent dark:border-slate-700">
                      <Icon className="w-6 h-6 text-amber-400" />
                    </div>
                    <span className="text-3xl font-black text-slate-200 dark:text-slate-800 group-hover:text-blue-900/20 dark:group-hover:text-amber-400/20 transition-colors font-mono">
                      0{step.number}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-blue-950 dark:text-white mb-2">
                    {step.number}. {step.title}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {step.description}
                  </p>

                  {step.number === '4' && (
                    <div className="mt-3 pt-2.5 border-t border-slate-200/80 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={handleCopyAccount}
                        className={`w-full py-1.5 px-2.5 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          copiedBankInfo
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 shadow-2xs'
                        }`}
                      >
                        {copiedBankInfo ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Bank Details Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                            <span>Copy Account & Bank</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Callout Rule Box */}
        <div className="mt-10 p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/90 dark:border-amber-700/50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-bold shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-blue-950 dark:text-amber-200">
                Authoritative Vote Counting Principle
              </h4>
              <p className="text-xs text-slate-700 dark:text-slate-300 mt-0.5">
                Submitting payment details records a <strong>PENDING</strong> transaction. Only after an administrator verifies and approves the bank transfer will the votes be added to the live leaderboard.
              </p>
            </div>
          </div>
          <button
            onClick={onStartVoting}
            className="px-6 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-950 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 font-bold text-xs tracking-wide shrink-0 shadow-sm cursor-pointer transition-colors"
          >
            Cast Your Vote Now
          </button>
        </div>
      </div>
    </section>
  );
};
