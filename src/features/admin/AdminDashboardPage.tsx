import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, Package, Clock, CheckCircle2, ArrowRight, Activity, Flag, ShieldAlert } from 'lucide-react';
import { reportsApi, memberApi } from '../../services/api';
import type { AdminStats, ActivityLog, ReportedItem } from '../../types';
import type { MemberWithDetails } from '../../services/api';
import { useAuth } from '../auth/AuthContext';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { INDUSTRY_ROLE_LABELS, isOpenReport, reportReasonLabel } from '../../utils/members';

/**
 * Admin overview for the two separate administrative responsibilities:
 *  A. One-time member verification (at registration).
 *  B. Listing moderation, only when a listing is reported.
 * There is no per-listing approval queue — ordinary listings go live immediately.
 */
export const AdminDashboardPage: React.FC = () => {
  const { user: adminUser } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [pendingMembers, setPendingMembers] = useState<MemberWithDetails[]>([]);
  const [openReports, setOpenReports] = useState<ReportedItem[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  const [rejectMemberTarget, setRejectMemberTarget] = useState<MemberWithDetails | null>(null);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const [adminStats, members, reports, logs] = await Promise.all([
        reportsApi.getAdminStats(),
        memberApi.getAllMembers('pending'),
        reportsApi.getReportedItems(),
        reportsApi.getActivityLogs(),
      ]);

      setStats(adminStats);
      setPendingMembers(members);
      setOpenReports(reports.filter((r) => isOpenReport(r.status)));
      setActivityLogs(logs.slice(0, 8));
    } catch (err) {
      console.error('Failed to load admin dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleApproveMember = async (memberId: string) => {
    try {
      await memberApi.approveMember(memberId, adminUser || undefined);
      await fetchDashboard();
    } catch (err: any) {
      alert(err.message || 'Approval failed.');
    }
  };

  const handleRejectMemberConfirm = async (reason?: string) => {
    if (!rejectMemberTarget || !reason) return;
    try {
      await memberApi.rejectMember(rejectMemberTarget.user.id, reason, adminUser || undefined);
      setRejectMemberTarget(null);
      await fetchDashboard();
    } catch (err: any) {
      alert(err.message || 'Rejection failed.');
    }
  };

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const statCards = [
    { to: '/admin/members', label: 'Members', value: stats?.totalMembers || 0, note: 'One account type', icon: Users, color: 'text-slate-900', accent: 'text-indigo-500' },
    { to: '/admin/members/verification', label: 'Pending Verification', value: stats?.pendingVerifications || 0, note: 'One-time review', icon: Clock, color: 'text-amber-600', accent: 'text-amber-500' },
    { to: '/admin/members', label: 'Verified Members', value: stats?.approvedMembers || 0, note: 'Full marketplace access', icon: CheckCircle2, color: 'text-emerald-600', accent: 'text-emerald-500' },
    { to: '/admin/products', label: 'Active Listings', value: stats?.activeListings || 0, note: 'Published immediately', icon: Package, color: 'text-slate-900', accent: 'text-purple-500' },
    { to: '/admin/reports/items', label: 'Open Reports', value: stats?.openReports || 0, note: 'Awaiting review', icon: Flag, color: 'text-rose-600', accent: 'text-rose-500' },
    { to: '/admin/products', label: 'Moderated Listings', value: stats?.moderatedListings || 0, note: 'Hidden / suspended / removed', icon: ShieldAlert, color: 'text-slate-900', accent: 'text-slate-500' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Platform Metrics & Governance</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Member verification happens once; listings publish immediately and are moderated only when reported
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/admin/members/verification"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition"
          >
            <Clock className="w-4 h-4" />
            <span>Verify Members ({stats?.pendingVerifications || 0})</span>
          </Link>
          <Link
            to="/admin/reports/items"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
          >
            <Flag className="w-4 h-4" />
            <span>Review Reports ({stats?.openReports || 0})</span>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((card) => (
          <Link
            key={card.label}
            to={card.to}
            className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs hover:border-indigo-400 hover:shadow-md transition group"
          >
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase group-hover:text-indigo-600 transition-colors">{card.label}</span>
              <card.icon className={`w-4 h-4 ${card.accent}`} />
            </div>
            <span className={`text-2xl font-black ${card.color}`}>{card.value}</span>
            <p className="text-[11px] text-slate-500 mt-1">{card.note}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* A. Member verification */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-600" />
              <h3 className="font-bold text-sm text-slate-900">Member Verification Queue</h3>
            </div>
            <Link to="/admin/members/verification" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
              View Full Queue <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {pendingMembers.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              All new members have been reviewed.
            </div>
          ) : (
            <div className="space-y-3">
              {pendingMembers.slice(0, 3).map((entry) => (
                <div
                  key={entry.user.id}
                  className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <span className="font-bold text-xs text-slate-900 block truncate">{entry.user.name}</span>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {entry.user.verification
                        ? INDUSTRY_ROLE_LABELS[entry.user.verification.industryRole] || entry.user.verification.industryRole
                        : 'Member'}{' '}
                      • {entry.user.phone}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">{entry.profile.location}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleApproveMember(entry.user.id)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs transition"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => setRejectMemberTarget(entry)}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs rounded-xl transition border border-rose-200"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* B. Report-driven listing moderation */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flag className="w-5 h-5 text-rose-600" />
              <h3 className="font-bold text-sm text-slate-900">Open Listing Reports</h3>
            </div>
            <Link to="/admin/reports/items" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
              Review Reports <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {openReports.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              No open reports. Listings need no approval — they are reviewed only when reported.
            </div>
          ) : (
            <div className="space-y-3">
              {openReports.slice(0, 3).map((r) => (
                <Link
                  key={r.id}
                  to="/admin/reports/items"
                  className="block p-4 rounded-2xl bg-slate-50 border border-slate-200/70 hover:border-rose-300 transition"
                >
                  <span className="font-bold text-xs text-slate-900 block truncate">{r.targetName}</span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {reportReasonLabel(r.reasonCode)} • reported by {r.reporterName} • {new Date(r.createdAt).toLocaleDateString()}
                  </p>
                  {r.details && <p className="text-[11px] text-slate-500 truncate">“{r.details}”</p>}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Platform Activity Feed (Mandatory PRD Section 2.1) */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-sm text-slate-900">Recent Platform Activity & Audit Log</h3>
          </div>
          <Link to="/admin/reports" className="text-xs text-indigo-600 hover:underline">
            View All Audit Logs
          </Link>
        </div>

        <div className="divide-y divide-slate-100">
          {activityLogs.map((log) => (
            <div key={log.id} className="py-3 flex items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-3 min-w-0">
                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono text-[10px] uppercase font-bold shrink-0">
                  {log.action}
                </span>
                <span className="text-slate-800 truncate">{log.details}</span>
              </div>
              <span className="text-[10px] text-slate-400 shrink-0">
                {new Date(log.createdAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          ))}
        </div>
      </div>

      <ConfirmDialog
        isOpen={Boolean(rejectMemberTarget)}
        title="Reject Member Verification"
        message={`Please document the reason for rejecting "${rejectMemberTarget?.user.name}". The member will see this explanation.`}
        confirmLabel="Confirm Rejection"
        requiresReason
        reasonPlaceholder="e.g. Could not confirm a connection to the mobile phone repair industry..."
        isDestructive
        onConfirm={handleRejectMemberConfirm}
        onCancel={() => setRejectMemberTarget(null)}
      />
    </div>
  );
};
