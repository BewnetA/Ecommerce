import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart3,
  Store,
  Activity,
  ShieldAlert,
} from 'lucide-react';
import { reportsApi, memberApi } from '../../services/api';
import type { ActivityLog, User } from '../../types';

export const AdminReportsPage: React.FC = () => {
  const [sellers, setSellers] = useState<User[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReportsData = async () => {
      try {
        setLoading(true);
        const [sList, actLogs] = await Promise.all([
          memberApi.getAllMembers(undefined, 1000, 0),
          reportsApi.getActivityLogs(),
        ]);
        setSellers(sList.map((m) => m.user));
        setLogs(actLogs);
      } catch (err) {
        console.error('Failed to load reports:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchReportsData();
  }, []);

  if (loading) {
    return (
      <div className="py-16 text-center text-xs text-slate-400">
        Loading reports & audit metrics...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
            Platform Reports & System Audits
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Listing distributions, member verification status, and timestamped moderation audit trails
          </p>
        </div>

        <Link
          to="/admin/reports/items"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition"
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Reported Listings</span>
        </Link>
      </div>

      {/* Member Verification Statuses */}
      <div className="grid grid-cols-1 gap-8">
        {/* Member Verification Status Distribution */}
        <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Store className="w-4 h-4 text-indigo-600" />
              Member Verification Status
            </h3>
            <span className="text-xs font-semibold text-slate-500">
              {sellers.length} Total
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
              <span className="text-xs text-emerald-800 font-semibold block">Verified Members</span>
              <span className="text-2xl font-black text-emerald-700 mt-1 block">
                {sellers.filter((s) => s.status === 'approved').length}
              </span>
              <span className="text-[11px] text-emerald-600">Full marketplace access</span>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100">
              <span className="text-xs text-amber-800 font-semibold block">Pending Verification</span>
              <span className="text-2xl font-black text-amber-700 mt-1 block">
                {sellers.filter((s) => s.status === 'pending').length}
              </span>
              <span className="text-[11px] text-amber-600">Awaiting one-time review</span>
            </div>

            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100">
              <span className="text-xs text-rose-800 font-semibold block">Rejected</span>
              <span className="text-2xl font-black text-rose-700 mt-1 block">
                {sellers.filter((s) => s.status === 'rejected').length}
              </span>
              <span className="text-[11px] text-rose-600">Documented rejection reasons</span>
            </div>

            <div className="p-4 rounded-2xl bg-red-100/60 border border-red-200">
              <span className="text-xs text-red-900 font-semibold block">Suspended</span>
              <span className="text-2xl font-black text-red-800 mt-1 block">
                {sellers.filter((s) => s.status === 'suspended').length}
              </span>
              <span className="text-[11px] text-red-700">Marketplace access blocked</span>
            </div>
          </div>
        </div>
      </div>

      {/* Complete Audit Log Feed */}
      <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-sm text-slate-900">Platform Activity Audit Log</h3>
          </div>
          <span className="text-xs text-slate-400">{logs.length} logged events</span>
        </div>

        <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
          {logs.map((log) => (
            <div key={log.id} className="py-3 flex items-start justify-between gap-4 text-xs">
              <div className="flex items-start gap-3 min-w-0">
                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono text-[10px] uppercase font-bold shrink-0 mt-0.5">
                  {log.action}
                </span>
                <div>
                  <span className="font-semibold text-slate-900">{log.actorName}</span>{' '}
                  <span className="text-slate-600">{log.details}</span>
                </div>
              </div>
              <span className="text-[10px] text-slate-400 shrink-0 whitespace-nowrap">
                {new Date(log.createdAt).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
