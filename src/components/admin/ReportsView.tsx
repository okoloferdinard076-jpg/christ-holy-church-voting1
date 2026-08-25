import React from 'react';
import { AdminDashboardStats, Candidate } from '../../types';
import { Download, FileSpreadsheet, BarChart2, PieChart as PieIcon } from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface ReportsViewProps {
  token: string;
  stats: AdminDashboardStats | null;
  candidates: Candidate[];
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  token,
  stats,
  candidates,
}) => {
  if (!stats) return null;

  const exportCSV = () => {
    // Generate CSV content
    const headers = ['Candidate Name', 'State', 'Approved Votes', 'Approved Revenue (NGN)', 'Pending Votes', 'Pending Revenue (NGN)'];
    const rows = stats.candidateBreakdown.map((c) => [
      `"${c.candidateName}"`,
      `"${c.state}"`,
      c.approvedVotes,
      c.approvedRevenue,
      c.pendingVotes,
      c.pendingRevenue,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `CHC_No2_Benin_Ambassadorship_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const pieData = stats.candidateBreakdown
    .filter((c) => c.approvedVotes > 0)
    .map((c) => ({
      name: c.candidateName,
      value: c.approvedVotes,
    }));

  const COLORS = ['#1e40af', '#dc2626', '#d97706', '#059669', '#7c3aed'];

  return (
    <div className="space-y-6" id="admin-reports-view">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-blue-950">Analytics & Audit Reports</h2>
          <p className="text-xs text-slate-500">
            Export comprehensive revenue and vote distribution data for church committee reporting.
          </p>
        </div>
        <button
          onClick={exportCSV}
          className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 cursor-pointer"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Export Summary (CSV)</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Vote Share Distribution Chart */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-extrabold text-sm text-blue-950 flex items-center gap-2">
            <PieIcon className="w-4 h-4 text-blue-800" />
            <span>Vote Share Distribution</span>
          </h3>

          {pieData.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [`${Number(val).toLocaleString()} Votes`, 'Approved Tally']}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-xs text-slate-400">
              No approved votes recorded yet. Approve transactions to populate chart.
            </div>
          )}
        </div>

        {/* Financial & Vote Audit Summary Card */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-extrabold text-sm text-blue-950 flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-blue-800" />
            <span>Audited Financial Summary</span>
          </h3>

          <div className="space-y-3 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 flex items-center justify-between">
              <span className="text-slate-600 font-semibold">Total Approved Revenue</span>
              <span className="font-bold text-slate-900 text-sm">
                ₦{stats.totalApprovedRevenue.toLocaleString()}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 flex items-center justify-between">
              <span className="text-slate-600 font-semibold">Total Approved Ledger Votes</span>
              <span className="font-bold text-blue-950 text-sm">
                {stats.totalApprovedVotes.toLocaleString()}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 flex items-center justify-between">
              <span className="text-slate-600 font-semibold">Pending Approval Revenue</span>
              <span className="font-bold text-amber-800 text-sm">
                ₦{(stats.pendingPaymentsCount * 50).toLocaleString()} (approx)
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 flex items-center justify-between">
              <span className="text-slate-600 font-semibold">Verified Bank Transactions</span>
              <span className="font-bold text-emerald-700 text-sm">
                {stats.approvedPaymentsCount}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
