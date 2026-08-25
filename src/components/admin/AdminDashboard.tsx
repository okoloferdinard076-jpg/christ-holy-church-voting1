import React from 'react';
import { AdminDashboardStats } from '../../types';
import {
  Banknote,
  Vote,
  Clock,
  CheckCircle2,
  XCircle,
  Users,
  Award,
  ArrowUpRight,
  TrendingUp,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface AdminDashboardProps {
  stats: AdminDashboardStats | null;
  onNavigateToPayments: (statusFilter?: string) => void;
  onNavigateToCandidates: () => void;
  onNavigateToSettings: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  stats,
  onNavigateToPayments,
  onNavigateToCandidates,
  onNavigateToSettings,
}) => {
  if (!stats) {
    return (
      <div className="p-12 text-center text-slate-500">
        Loading dashboard metrics...
      </div>
    );
  }

  const chartData = stats.candidateBreakdown.map((c) => ({
    name: c.candidateName.split(' ')[0],
    fullName: c.candidateName,
    approvedVotes: c.approvedVotes,
    pendingVotes: c.pendingVotes,
    revenue: c.approvedRevenue,
  }));

  const COLORS = ['#1e40af', '#dc2626', '#d97706', '#059669', '#7c3aed'];

  return (
    <div className="space-y-8" id="admin-dashboard-view">
      {/* Top 4 KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Metric 1: Total Approved Revenue */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Approved Revenue
            </span>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
              <Banknote className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              ₦{stats.totalApprovedRevenue.toLocaleString()}
            </div>
            <p className="text-[11px] text-slate-500 mt-1 font-medium">
              From {stats.approvedPaymentsCount} verified transactions
            </p>
          </div>
        </div>

        {/* Metric 2: Total Approved Votes */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Approved Votes
            </span>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-50 text-blue-900 flex items-center justify-center shrink-0">
              <Vote className="w-5 h-5 text-amber-500" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-blue-950 tracking-tight">
              {stats.totalApprovedVotes.toLocaleString()}
            </div>
            <p className="text-[11px] text-slate-500 mt-1 font-medium">
              Allocated strictly in vote ledger
            </p>
          </div>
        </div>

        {/* Metric 3: Pending Review */}
        <div
          onClick={() => onNavigateToPayments('PENDING')}
          className="bg-white rounded-2xl p-4 sm:p-5 border border-amber-200 shadow-xs flex flex-col justify-between hover:border-amber-400 transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold text-amber-900 uppercase tracking-wider">
              Pending Payments
            </span>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Clock className="w-5 h-5 animate-pulse" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-2xl sm:text-3xl font-black text-amber-900 tracking-tight">
              {stats.pendingPaymentsCount}
            </div>
            <span className="text-xs font-bold text-blue-900 group-hover:underline flex items-center gap-0.5">
              Review <ArrowUpRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>

        {/* Metric 4: Contest Status & Candidates */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
              Active Candidates
            </span>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {stats.candidatesCount}
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
              {stats.competitionStatus}
            </span>
          </div>
        </div>
      </div>

      {/* Candidate Votes Performance Chart */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-extrabold text-blue-950">
              Approved Votes by Candidate
            </h3>
            <p className="text-xs text-slate-500">
              Authoritative tally computed directly from approved transactions in the vote ledger.
            </p>
          </div>
          <button
            onClick={onNavigateToCandidates}
            className="text-xs font-bold text-blue-900 hover:underline flex items-center gap-1 self-start sm:self-auto cursor-pointer"
          >
            Manage Candidates <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="h-60 sm:h-72 w-full pt-2 sm:pt-4 min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 25 }}>
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#475569' }} interval={0} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#475569' }} />
              <Tooltip
                formatter={(value: any, name: any) => [
                  `${Number(value).toLocaleString()} ${name === 'approvedVotes' ? 'Votes' : '₦'}`,
                  name === 'approvedVotes' ? 'Approved Votes' : 'Pending',
                ]}
                labelFormatter={(label) => {
                  const item = chartData.find((d) => d.name === label);
                  return item ? item.fullName : label;
                }}
              />
              <Bar dataKey="approvedVotes" radius={[6, 6, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Candidate Breakdown Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-blue-950">
            Candidate Standings & Revenue Summary
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[550px]">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Candidate</th>
                <th className="py-3 px-4">State</th>
                <th className="py-3 px-4 text-right">Approved Votes</th>
                <th className="py-3 px-4 text-right">Approved Revenue (₦)</th>
                <th className="py-3 px-4 text-right">Pending Votes</th>
                <th className="py-3 px-4 text-right">Pending Revenue (₦)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stats.candidateBreakdown.map((c) => (
                <tr key={c.candidateId} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-bold text-blue-950">{c.candidateName}</td>
                  <td className="py-3 px-4 text-slate-600">{c.state}</td>
                  <td className="py-3 px-4 text-right font-black text-slate-900">
                    {c.approvedVotes.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-emerald-700">
                    ₦{c.approvedRevenue.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right font-medium text-amber-700">
                    {c.pendingVotes.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right font-medium text-slate-600">
                    ₦{c.pendingRevenue.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
