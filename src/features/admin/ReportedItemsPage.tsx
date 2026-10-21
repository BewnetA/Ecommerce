import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { reportsApi } from '../../services/api';
import type { ReportedItem } from '../../types';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';

export const ReportedItemsPage: React.FC = () => {
  const [reports, setReports] = useState<ReportedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolveTarget, setResolveTarget] = useState<ReportedItem | null>(null);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const list = await reportsApi.getReportedItems();
      setReports(list);
    } catch (err) {
      console.error('Failed to load reported items:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleResolveConfirm = async (actionText?: string) => {
    if (!resolveTarget) return;
    try {
      await reportsApi.resolveReport(resolveTarget.id, actionText || 'Action taken by administrator.');
      setResolveTarget(null);
      await fetchReports();
    } catch (err: any) {
      alert(err.message || 'Resolution failed.');
    }
  };

  const handleDismiss = async (reportId: string) => {
    try {
      await reportsApi.dismissReport(reportId);
      await fetchReports();
    } catch (err: any) {
      alert(err.message || 'Dismissal failed.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              to="/admin/reports"
              className="text-xs font-semibold text-slate-500 hover:text-indigo-600 flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Reports & Logs
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-xs font-semibold text-slate-700">Safety & Moderation Queue</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            Flagged & Reported Items ({reports.length})
          </h2>
          <p className="text-xs text-slate-500">
            Review user reports on suspected counterfeit products, policy breaches, and defective items
          </p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading moderation items...</div>
        ) : reports.length === 0 ? (
          <div className="p-16 text-center text-xs text-slate-500">
            No moderation reports on file.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {reports.map((r) => (
              <div
                key={r.id}
                className="p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/60 transition"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        r.targetType === 'product'
                          ? 'bg-purple-50 text-purple-700 border border-purple-200'
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}
                    >
                      {r.targetType}
                    </span>

                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        r.status === 'resolved'
                          ? 'bg-emerald-50 text-emerald-700'
                          : r.status === 'dismissed'
                          ? 'bg-slate-100 text-slate-600'
                          : 'bg-rose-50 text-rose-700'
                      }`}
                    >
                      {r.status}
                    </span>

                    <span className="text-[11px] text-slate-400">
                      Reported by {r.reporterName} • {new Date(r.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 className="font-bold text-sm text-slate-900">{r.targetName}</h3>

                  <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <strong className="text-slate-800">Report Reason:</strong> {r.reason}
                  </p>

                  {r.resolutionAction && (
                    <p className="text-xs text-emerald-700 font-medium">
                      ✓ Resolution: {r.resolutionAction}
                    </p>
                  )}
                </div>

                {r.status === 'pending' && (
                  <div className="flex items-center gap-2 shrink-0 justify-end">
                    <button
                      type="button"
                      onClick={() => setResolveTarget(r)}
                      className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs transition"
                    >
                      Take Action & Resolve
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDismiss(r.id)}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-xs rounded-xl transition"
                    >
                      Dismiss
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={Boolean(resolveTarget)}
        title="Resolve Moderation Report"
        message={`Specify the administrative action taken for "${resolveTarget?.targetName}".`}
        confirmLabel="Confirm Resolution"
        requiresReason
        reasonPlaceholder="e.g. Delisted item, suspended user account, issued formal warning..."
        onConfirm={handleResolveConfirm}
        onCancel={() => setResolveTarget(null)}
      />
    </div>
  );
};
