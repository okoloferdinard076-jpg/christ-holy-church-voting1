import React, { useState, useEffect } from 'react';
import { User, AdminDashboardStats, Candidate, PaymentSettings } from '../types';
import { fetchAdminStats } from '../services/api';
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
  ArrowLeft,
  RefreshCw,
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
  // Always active admin session
  const token = ADMIN_TOKEN;

  // Active Sub-Tab
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'payments' | 'candidates' | 'settings' | 'audit' | 'reports'
  >('dashboard');
  const [paymentFilterPreset, setPaymentFilterPreset] = useState<string>('ALL');

  // Dashboard Stats
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Ensure token is persisted locally
  useEffect(() => {
    localStorage.setItem('chc_admin_token', ADMIN_TOKEN);
    localStorage.setItem(
      'chc_admin_user',
      JSON.stringify({
        id: 'admin-super-01',
        name: 'Presiding Officer',
        email: 'admin@chcbenin.org',
        role: 'SUPER_ADMIN',
      })
    );
  }, []);

  const loadStats = async () => {
    setIsRefreshing(true);
    try {
      const data = await fetchAdminStats(token);
      setStats(data);
    } catch (err: any) {
      console.warn('Stats sync fallback:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

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
                Admin Panel (Direct Access)
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            onClick={() => {
              loadStats();
              onRefreshData();
            }}
            disabled={isRefreshing}
            className="p-1.5 sm:p-2 rounded-lg bg-blue-900/60 hover:bg-blue-900 text-slate-200 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh dashboard stats"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>

          <div className="text-right hidden sm:block">
            <div className="text-xs font-bold text-slate-200">Presiding Officer</div>
            <div className="text-[10px] text-emerald-400 font-mono font-semibold">
              SUPER ADMIN
            </div>
          </div>
        </div>
      </header>

      {/* Main Admin Content - Direct Dashboard Layout */}
      <div className="flex-1 flex flex-col bg-slate-100">
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
                onUpdated={() => {
                  loadStats();
                  onRefreshData();
                }}
              />
            )}

            {activeTab === 'audit' && <AuditLogViewer token={token} />}
          </main>
        </div>
      </div>
    </div>
  );
};

