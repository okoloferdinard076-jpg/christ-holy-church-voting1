import React, { useState, useEffect } from 'react';
import { User, AdminDashboardStats, Candidate, PaymentSettings } from '../types';
import { getAdminInstantAccess, adminLogin, fetchAdminStats } from '../services/api';
import { AdminDashboard } from './admin/AdminDashboard';
import { PaymentReviews } from './admin/PaymentReviews';
import { CandidateManager } from './admin/CandidateManager';
import { PaymentSettingsManager } from './admin/PaymentSettingsManager';
import { AuditLogViewer } from './admin/AuditLogViewer';
import { ReportsView } from './admin/ReportsView';
import { ChcLogo } from './ChcLogo';
import {
  LayoutDashboard,
  CreditCard,
  Users,
  Settings,
  ShieldCheck,
  FileSpreadsheet,
  LogOut,
  ArrowLeft,
  Sparkles,
  Loader2,
  CheckCircle2,
  ShieldAlert,
} from 'lucide-react';

interface AdminPortalProps {
  onClose: () => void;
  candidates: Candidate[];
  paymentSettings: PaymentSettings;
  onRefreshData: () => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  onClose,
  candidates,
  paymentSettings,
  onRefreshData,
}) => {
  // Authentication State
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('chc_admin_token');
  });
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('chc_admin_user');
    return saved ? JSON.parse(saved) : null;
  });

  // Direct login loading
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Active Sub-Tab
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'payments' | 'candidates' | 'settings' | 'audit' | 'reports'
  >('dashboard');
  const [paymentFilterPreset, setPaymentFilterPreset] = useState<string>('ALL');

  // Dashboard Stats
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);

  // Auto-authenticate on mount if token is missing
  useEffect(() => {
    const autoAuthenticate = async () => {
      if (token) return;
      setIsAuthorizing(true);
      setAuthError(null);
      try {
        const res = await getAdminInstantAccess();
        setToken(res.token);
        setCurrentUser(res.user);
        localStorage.setItem('chc_admin_token', res.token);
        localStorage.setItem('chc_admin_user', JSON.stringify(res.user));
      } catch (err: any) {
        console.warn('Auto-auth failed, user can click direct enter:', err);
        setAuthError('Click below to enter the dashboard directly.');
      } finally {
        setIsAuthorizing(false);
      }
    };

    autoAuthenticate();
  }, [token]);

  const loadStats = async () => {
    if (!token) return;
    try {
      const data = await fetchAdminStats(token);
      setStats(data);
    } catch (err: any) {
      console.error('Failed to load admin stats:', err);
    }
  };

  useEffect(() => {
    if (token) {
      loadStats();
    }
  }, [token]);

  const handleInstantEnter = async () => {
    setIsAuthorizing(true);
    setAuthError(null);
    try {
      const res = await getAdminInstantAccess();
      setToken(res.token);
      setCurrentUser(res.user);
      localStorage.setItem('chc_admin_token', res.token);
      localStorage.setItem('chc_admin_user', JSON.stringify(res.user));
    } catch (err: any) {
      // Fallback try adminLogin with default credentials
      try {
        const res2 = await adminLogin();
        setToken(res2.token);
        setCurrentUser(res2.user);
        localStorage.setItem('chc_admin_token', res2.token);
        localStorage.setItem('chc_admin_user', JSON.stringify(res2.user));
      } catch (err2: any) {
        setAuthError(err2.message || 'Unable to open dashboard. Please try again.');
      }
    } finally {
      setIsAuthorizing(false);
    }
  };

  const handleLogout = () => {
    setToken(null);
    setCurrentUser(null);
    localStorage.removeItem('chc_admin_token');
    localStorage.removeItem('chc_admin_user');
  };

  const navigateToPayments = (filter: string = 'ALL') => {
    setPaymentFilterPreset(filter);
    setActiveTab('payments');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900 overflow-y-auto flex flex-col" id="admin-portal">
      {/* Top Admin Bar */}
      <header className="bg-blue-950 border-b border-blue-900/80 px-4 sm:px-6 py-3 text-white flex items-center justify-between shrink-0 shadow-md">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-blue-900/60 hover:bg-blue-900 text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold"
            title="Return to Public Site"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Exit to Voting Portal</span>
          </button>

          <div className="h-5 w-px bg-blue-800 hidden sm:block" />

          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <ChcLogo size="sm" className="shrink-0" />
            <div className="min-w-0">
              <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider block leading-tight truncate">
                Christ Holy Church No. 2 Benin
              </span>
              <span className="text-[9px] sm:text-[10px] text-amber-400 font-bold block truncate">
                Admin Dashboard (Passwordless Access)
              </span>
            </div>
          </div>
        </div>

        {token && (
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-bold text-slate-200">{currentUser?.name || 'Administrator'}</div>
              <div className="text-[10px] text-emerald-400 font-mono font-semibold">
                SUPER ADMIN
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 sm:p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              title="Reset session"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          </div>
        )}
      </header>

      {/* Main Admin Content */}
      <div className="flex-1 flex flex-col bg-slate-100">
        {!token ? (
          /* Passwordless Instant Access Screen (if auto-auth is in progress or reset) */
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-200 text-center space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-blue-950 text-white flex items-center justify-center mx-auto shadow-md">
                <ShieldCheck className="w-8 h-8 text-amber-400" />
              </div>
              
              <div className="space-y-1.5">
                <h2 className="text-xl font-black text-blue-950">
                  Administrator Dashboard
                </h2>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Direct password-free access enabled. Click below to enter the administration panel.
                </p>
              </div>

              {authError && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium">
                  {authError}
                </div>
              )}

              <button
                type="button"
                disabled={isAuthorizing}
                onClick={handleInstantEnter}
                className="w-full py-3.5 rounded-2xl bg-blue-900 hover:bg-blue-950 text-white font-black text-sm tracking-wide shadow-lg hover:shadow-xl transition-all transform active:scale-98 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isAuthorizing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
                    <span>Opening Dashboard...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 text-amber-400" />
                    <span>Enter Admin Dashboard Directly</span>
                  </>
                )}
              </button>

              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-800 flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Password check bypassed as requested. Full admin rights active.</span>
              </div>
            </div>
          </div>
        ) : (
          /* Authenticated Admin Dashboard Layout */
          <div className="flex-1 flex flex-col md:flex-row">
            {/* Sidebar Navigation */}
            <nav className="w-full md:w-64 bg-white border-b md:border-b-0 md:border-r border-slate-200 p-2 sm:p-4 flex md:flex-col overflow-x-auto gap-1 shrink-0">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                  activeTab === 'dashboard'
                    ? 'bg-blue-900 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard</span>
              </button>

              <button
                onClick={() => {
                  setPaymentFilterPreset('ALL');
                  setActiveTab('payments');
                }}
                className={`flex items-center justify-between gap-2 sm:gap-3 px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                  activeTab === 'payments'
                    ? 'bg-blue-900 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2 sm:gap-3">
                  <CreditCard className="w-4 h-4" />
                  <span>Payment Reviews</span>
                </div>
                {stats && stats.pendingPaymentsCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px]">
                    {stats.pendingPaymentsCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('candidates')}
                className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                  activeTab === 'candidates'
                    ? 'bg-blue-900 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Candidates</span>
              </button>

              <button
                onClick={() => setActiveTab('reports')}
                className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                  activeTab === 'reports'
                    ? 'bg-blue-900 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Reports & Export</span>
              </button>

              <button
                onClick={() => setActiveTab('settings')}
                className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                  activeTab === 'settings'
                    ? 'bg-blue-900 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Settings className="w-4 h-4" />
                <span>Bank & Vote Settings</span>
              </button>

              <button
                onClick={() => setActiveTab('audit')}
                className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                  activeTab === 'audit'
                    ? 'bg-blue-900 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Audit Logs</span>
              </button>
            </nav>

            {/* Sub-View Content */}
            <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
              {activeTab === 'dashboard' && (
                <AdminDashboard
                  stats={stats}
                  onNavigateToPayments={navigateToPayments}
                  onNavigateToCandidates={() => setActiveTab('candidates')}
                  onNavigateToSettings={() => setActiveTab('settings')}
                />
              )}

              {activeTab === 'payments' && (
                <PaymentReviews
                  token={token}
                  candidates={candidates}
                  initialStatusFilter={paymentFilterPreset}
                  onStatsUpdated={() => {
                    loadStats();
                    onRefreshData();
                  }}
                />
              )}

              {activeTab === 'candidates' && (
                <CandidateManager
                  token={token}
                  candidates={candidates}
                  onRefresh={() => {
                    loadStats();
                    onRefreshData();
                  }}
                />
              )}

              {activeTab === 'reports' && (
                <ReportsView token={token} stats={stats} candidates={candidates} />
              )}

              {activeTab === 'settings' && (
                <PaymentSettingsManager
                  token={token}
                  settings={paymentSettings}
                  onUpdated={(newSettings) => {
                    loadStats();
                    onRefreshData();
                  }}
                />
              )}

              {activeTab === 'audit' && <AuditLogViewer token={token} />}
            </main>
          </div>
        )}
      </div>
    </div>
  );
};
