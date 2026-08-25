import React, { useState, useEffect } from 'react';
import { AuditLog } from '../../types';
import { fetchAuditLogs } from '../../services/api';
import { ShieldCheck, RefreshCw, Clock, UserCheck, Terminal } from 'lucide-react';

interface AuditLogViewerProps {
  token: string;
}

export const AuditLogViewer: React.FC<AuditLogViewerProps> = ({ token }) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const data = await fetchAuditLogs(token);
      setLogs(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [token]);

  return (
    <div className="space-y-6" id="admin-audit-logs">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-blue-950">System Audit Logs</h2>
          <p className="text-xs text-slate-500">
            Immutable chronological record of approvals, rejections, setting updates, and candidate management.
          </p>
        </div>
        <button
          onClick={loadLogs}
          className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Entity</th>
                <th className="py-3 px-4">Details / Metadata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 font-sans">
                    No audit log records found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md font-bold text-[10px] ${
                          log.action.includes('APPROVED')
                            ? 'bg-emerald-100 text-emerald-800'
                            : log.action.includes('REJECTED')
                            ? 'bg-red-100 text-red-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-800 font-bold font-sans">
                      {log.actorName}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {log.entityType} ({log.entityId})
                    </td>
                    <td className="py-3 px-4 text-slate-600 text-[11px] max-w-xs truncate font-sans">
                      {log.metadata ? JSON.stringify(log.metadata) : log.newValue || 'Updated'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
