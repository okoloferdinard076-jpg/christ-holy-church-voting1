import React, { useState } from 'react';
import { PaymentSettings } from '../../types';
import { updatePaymentSettings } from '../../services/api';
import { Building, Save, AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react';

interface PaymentSettingsManagerProps {
  token: string;
  settings: PaymentSettings;
  onUpdated: (newSettings: PaymentSettings) => void;
}

export const PaymentSettingsManager: React.FC<PaymentSettingsManagerProps> = ({
  token,
  settings,
  onUpdated,
}) => {
  const [bankName, setBankName] = useState(settings.bankName);
  const [accountName, setAccountName] = useState(settings.accountName);
  const [accountNumber, setAccountNumber] = useState(settings.accountNumber);
  const [votePrice, setVotePrice] = useState(settings.votePrice);
  const [paymentInstructions, setPaymentInstructions] = useState(settings.paymentInstructions);

  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankName.trim() || !accountName.trim() || !accountNumber.trim()) {
      setMessage({ type: 'error', text: 'All bank details are required' });
      return;
    }
    if (votePrice <= 0) {
      setMessage({ type: 'error', text: 'Vote price must be a positive number' });
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      const res = await updatePaymentSettings(token, {
        bankName: bankName.trim(),
        accountName: accountName.trim(),
        accountNumber: accountNumber.trim(),
        votePrice: Number(votePrice),
        paymentInstructions: paymentInstructions.trim(),
      });
      setMessage({ type: 'success', text: 'Payment settings successfully updated and logged to audit ledger.' });
      onUpdated(res.paymentSettings);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to update payment settings' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8" id="admin-payment-settings">
      <div>
        <h2 className="text-xl font-extrabold text-blue-950">Bank & Payment Settings</h2>
        <p className="text-xs text-slate-500">
          Configure designated bank transfer details, official vote pricing, and voter instructions.
        </p>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between ${
            message.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600" />
            )}
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="cursor-pointer">✕</button>
        </div>
      )}

      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 shrink-0 text-amber-700 mt-0.5" />
            <p className="leading-relaxed">
              Modifying these settings immediately updates the live payment instruction pages and new transaction price calculations. Every modification is cryptographically signed in the <strong>Audit Logs</strong>.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Bank Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold focus:border-blue-900"
                placeholder="e.g. OPAY"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Account Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-sm font-bold text-blue-950 focus:border-blue-900"
                placeholder="e.g. 9017311644"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Account Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-medium focus:border-blue-900"
                placeholder="e.g. Okonkwo Precious"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Official Vote Price (₦ / vote) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                required
                min="1"
                value={votePrice}
                onChange={(e) => setVotePrice(Number(e.target.value) || 50)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-bold text-emerald-700 focus:border-blue-900"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Payment Instructions
            </label>
            <textarea
              rows={3}
              value={paymentInstructions}
              onChange={(e) => setPaymentInstructions(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:border-blue-900"
              placeholder="Instructions displayed to voters on the bank transfer page..."
            />
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs shadow-md disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving Changes...' : 'Save Payment Settings'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Admin Security & Password Change Section */}
      {/* Security & Access Section */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
          <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-blue-950">Administrator Access Status</h3>
            <p className="text-[11px] text-slate-500">Direct Passwordless Access is currently enabled for all administrator tools.</p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 text-emerald-900 text-xs flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Password-Free Administrator Access Active</p>
            <p className="text-[11px] text-emerald-700 mt-0.5">
              You and your authorized team can open the Admin Portal directly without needing to remember or type any password. Full privileges to approve payments, edit contestants, upload pictures, and download reports are automatically granted.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
