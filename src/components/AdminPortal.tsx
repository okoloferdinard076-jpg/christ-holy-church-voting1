import React, { useState, useEffect } from 'react';
import { AdminDashboardStats, Candidate, PaymentSettings } from '../types';
import { fetchAdminStats } from '../services/api';
import { AdminDashboard } from './admin/AdminDashboard';
import { PaymentReviews } from './admin/PaymentReviews';
import { CandidateManager } from './admin/CandidateManager';
import { PaymentSettingsManager } from './admin/PaymentSettingsManager';
import { AuditLogViewer } from './admin/AuditLogViewer';
import { ReportsView } from './admin/ReportsView';
import { FirebaseConfigManager } from './admin/FirebaseConfigManager';
import { ChcLogo } from './ChcLogo';
import {
  LayoutDashboard,
  CreditCard,
  Users,
  Settings,
  ShieldCheck,
  FileSpreadsheet,
  ArrowLeft,
  RefreshCw,
  Lock,
  Mail,
  Eye,
  EyeOff,
  AlertCircle,
  LogOut,
  Shield,
  Cloud,
} from 'lucide-react';

interface AdminPortalProps {
  onClose: () => void;
  candidates: Candidate[];
  paymentSettings: PaymentSettings;
  onRefreshData: () => void;
}

const ADMIN_TOKEN = 'admin_session_unlocked';

export const AdminPortal: React.FC<AdminPortalProps> = ({
  onClose,
  candidates,
  paymentSettings,
  onRefreshData,
}) => {
  // Session Authentication State based on sessionStorage
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('isAdminAuthenticated') === 'true';
  });

  // Login Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Active Sub-Tab
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'payments' | 'candidates' | 'settings' | 'audit' | 'reports'
  >('dashboard');
  const [paymentFilterPreset, setPaymentFilterPreset] = useState<string>('ALL');

  // Dashboard Stats
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadStats = async () => {
    setIsRefreshing(true);
    try {
      const data = await fetchAdminStats(ADMIN_TOKEN);
      setStats(data);
    } catch (err: any) {
      console.warn('Stats sync fallback:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadStats();
    }
  }, [isAuthenticated]);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    
    // Direct synchronous validation without mock delays or network promises
    if (cleanEmail === 'preciousokonkwo@gmail.com' && password === 'Admin@2026') {
      sessionStorage.setItem('isAdminAuthenticated', 'true');
      localStorage.setItem('chc_admin_token', ADMIN_TOKEN);
      setErrorMessage(null);
      setIsAuthenticated(true);
      onRefreshData();
    } else {
      setErrorMessage('Invalid email or password');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('isAdminAuthenticated');
    localStorage.removeItem('chc_admin_token');
    setIsAuthenticated(false);
    setEmail('');
    setPassword('');
    setErrorMessage(null);
    onRefreshData();
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
            id="admin-exit-btn"
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
                {isAuthenticated ? 'Admin Dashboard (Active Session)' : 'Admin Authentication'}
              </span>
            </div>
          </div>
        </div>

        {isAuthenticated ? (
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              onClick={() => {
                loadStats();
                onRefreshData();
              }}
              disabled={isRefreshing}
              className="p-1.5 sm:p-2 rounded-lg bg-blue-900/60 hover:bg-blue-900 text-slate-200 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              title="Refresh dashboard stats"
              id="admin-refresh-stats-btn"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>

            <div className="text-right hidden sm:block">
              <div className="text-xs font-bold text-slate-200">Precious Okonkwo</div>
              <div className="text-[10px] text-emerald-400 font-mono font-semibold">
                SUPER ADMIN
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-rose-900/80 hover:bg-rose-800 text-rose-100 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-rose-700/50 shadow-xs"
              title="Logout from Admin Dashboard"
              id="admin-logout-btn"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-xs text-amber-400 font-semibold">
            <Shield className="w-4 h-4" />
            <span className="hidden sm:inline">Protected Area</span>
          </div>
        )}
      </header>

      {/* Main Admin Area */}
      <div className="flex-1 flex flex-col bg-slate-100">
        {!isAuthenticated ? (
          /* Login Screen */
          <div className="flex-1 flex items-center justify-center p-4 sm:p-6" id="admin-login-screen">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200 space-y-6">
              <div className="text-center space-y-2">
                <div className="w-14 h-14 rounded-2xl bg-blue-950 text-white flex items-center justify-center mx-auto shadow-md">
                  <ShieldCheck className="w-7 h-7 text-amber-400" />
                </div>
                <h2 className="text-xl font-black text-blue-950">
                  Administrator Login
                </h2>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Enter your official church administrator credentials to access the management portal.
                </p>
              </div>

              {errorMessage && (
                <div
                  className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2"
                  id="admin-login-error"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleLoginSubmit} className="space-y-4" id="admin-login-form">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Admin Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      placeholder="preciousokonkwo@gmail.com"
                      required
                      autoComplete="username"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-blue-900 transition-all"
                      id="admin-email-input"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Admin Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      placeholder="••••••••"
                      required
                      autoComplete="current-password"
                      className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-blue-900 transition-all"
                      id="admin-password-input"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                      tabIndex={-1}
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-blue-900 hover:bg-blue-950 text-white font-black text-sm tracking-wide shadow-md hover:shadow-lg transition-all transform active:scale-98 flex items-center justify-center gap-2 cursor-pointer mt-2"
                  id="admin-submit-btn"
                >
                  <Lock className="w-4 h-4 text-amber-400" />
                  <span>Sign In to Dashboard</span>
                </button>
              </form>

              <div className="pt-2 border-t border-slate-100 text-center">
                <button
                  type="button"
                  onClick={onClose}
                  className="text-xs text-slate-500 hover:text-slate-800 font-medium transition-colors cursor-pointer"
                >
                  ← Return to Public Voting Page
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Authenticated Dashboard Layout */
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
                id="admin-tab-dashboard"
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
                id="admin-tab-payments"
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
                id="admin-tab-candidates"
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
                id="admin-tab-reports"
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
                id="admin-tab-settings"
              >
                <Settings className="w-4 h-4" />
                <span>Bank & Vote Settings</span>
              </button>

              <button
                onClick={() => setActiveTab('firebase')}
                className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                  activeTab === 'firebase'
                    ? 'bg-blue-900 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
                id="admin-tab-firebase"
              >
                <Cloud className="w-4 h-4 text-amber-500" />
                <span>Firebase Sync</span>
              </button>

              <button
                onClick={() => setActiveTab('audit')}
                className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                  activeTab === 'audit'
                    ? 'bg-blue-900 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
                id="admin-tab-audit"
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
                  token={ADMIN_TOKEN}
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
                  token={ADMIN_TOKEN}
                  candidates={candidates}
                  onRefresh={() => {
                    loadStats();
                    onRefreshData();
                  }}
                />
              )}

              {activeTab === 'reports' && (
                <ReportsView token={ADMIN_TOKEN} stats={stats} candidates={candidates} />
              )}

              {activeTab === 'settings' && (
                <PaymentSettingsManager
                  token={ADMIN_TOKEN}
                  settings={paymentSettings}
                  onUpdated={() => {
                    loadStats();
                    onRefreshData();
                  }}
                />
              )}

              {activeTab === 'firebase' && (
                <FirebaseConfigManager candidates={candidates} onSyncComplete={onRefreshData} />
              )}

              {activeTab === 'audit' && <AuditLogViewer token={ADMIN_TOKEN} />}
            </main>
          </div>
        )}
      </div>
    </div>
  );
};


