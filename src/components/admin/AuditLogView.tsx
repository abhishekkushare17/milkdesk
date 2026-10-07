import React, { useState } from 'react';
import { Database } from '../../services/storage';
import { AuditLog } from '../../types';
import { ShieldCheck, Search, Clock, FileText } from 'lucide-react';

export const AuditLogView: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const logs = Database.getAuditLogs();

  const filteredLogs = logs.filter(log => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      log.action.toLowerCase().includes(term) ||
      log.userName.toLowerCase().includes(term) ||
      (log.details && log.details.toLowerCase().includes(term)) ||
      log.entityType.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-brand-700" /> Internal Audit & Change History Log
          </h2>
          <p className="text-xs text-slate-500">
            Records who modified what, old values, new values, and exact timestamps to prevent disputes.
          </p>
        </div>

        <div className="relative w-72">
          <input
            type="text"
            placeholder="Search changes, users, actions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full py-1.5 pl-8 pr-3 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-800"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200 sticky top-0">
              <tr>
                <th className="px-3 py-3 w-40">Timestamp</th>
                <th className="px-3 py-3">User</th>
                <th className="px-3 py-3">Action</th>
                <th className="px-3 py-3">Entity Type</th>
                <th className="px-4 py-3">Modification Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    No audit records matching your search.
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap font-mono text-[11px]">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-3 py-2.5 font-bold text-slate-900">
                      <span className="capitalize">{log.userName}</span>
                      <span className="ml-1 text-[10px] text-slate-400 font-normal">({log.userRole})</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 uppercase font-bold text-[10px] text-slate-500">
                      {log.entityType}
                    </td>
                    <td className="px-4 py-2.5 text-slate-700 text-xs">
                      {log.details || JSON.stringify(log.newValue)}
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
