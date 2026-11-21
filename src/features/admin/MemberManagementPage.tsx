import React, { useState, useCallback } from 'react';
import { Search, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { memberApi } from '../../services/api';
import type { MemberWithDetails } from '../../services/api';
import type { MemberStatus } from '../../types';
import { useAuth } from '../auth/AuthContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { useInfiniteList, InfiniteScrollSentinel } from '../../hooks/useInfiniteList';
import { INDUSTRY_ROLE_LABELS } from '../../utils/members';
import { MemberDetailsModal } from './MemberDetailsModal';

type PendingAction = { type: 'reject' | 'suspend'; member: MemberWithDetails } | null;

/**
 * Single member directory (no separate seller and buyer lists). Verification
 * decisions — approve, reject, suspend, reinstate — are administrator actions
 * and must also be enforced by the backend.
 */
export const MemberManagementPage: React.FC = () => {
  const { user: adminUser } = useAuth();
  const [statusFilter, setStatusFilter] = useState<MemberStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [viewingMember, setViewingMember] = useState<MemberWithDetails | null>(null);
  const closeMemberDetails = useCallback(() => setViewingMember(null), []);

  const fetchBatch = useCallback(
    async (offset: number, limit: number) => memberApi.getAllMembers(undefined, limit, offset),
    []
  );

  const { items: members, loading, loadingMore, hasMore, reload, sentinelRef } = useInfiniteList<MemberWithDetails>({
    fetchFn: fetchBatch,
    limit: 50,
  });

  const filtered = members.filter(({ user, profile }) => {
    if (statusFilter !== 'all' && user.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      return (
        user.name.toLowerCase().includes(q) ||
        user.email.toLowerCase().includes(q) ||
        user.phone.includes(q) ||
        profile.businessName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const run = async (memberId: string, action: () => Promise<unknown>, success: string) => {
    setProcessingId(memberId);
    try {
      await action();
      toast.success(success);
      await reload();
    } catch (err: any) {
      toast.error(err.message || 'Action failed.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReasonConfirm = async (reason?: string) => {
    if (!pendingAction || !reason) return;
    const { type, member } = pendingAction;
    setPendingAction(null);
    if (type === 'reject') {
      await run(member.user.id, () => memberApi.rejectMember(member.user.id, reason, adminUser || undefined), 'Verification rejected.');
    } else {
      await run(member.user.id, () => memberApi.suspendMember(member.user.id, reason, adminUser || undefined), 'Member suspended.');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Members</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          One account type for everyone. Verification happens once; approved members can post ads without further approval.
        </p>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1">
          {(['all', 'pending', 'approved', 'rejected', 'suspended'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize whitespace-nowrap transition ${
                statusFilter === s ? 'bg-slate-900 text-white' : 'bg-slate-50 hover:bg-slate-100 text-slate-600'
              }`}
            >
              {s} ({s === 'all' ? members.length : members.filter((m) => m.user.status === s).length})
            </button>
          ))}
        </div>
        <div className="relative flex items-center max-w-xs w-full">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3" />
          <input
            type="text"
            placeholder="Search name, email, phone, business..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading members...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">No members found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Member</th>
                  <th className="py-3 px-4">Industry Role</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Ads</th>
                  <th className="py-3 px-4">Verification</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((entry) => {
                  const { user, profile } = entry;
                  const busy = processingId === user.id;
                  return (
                    <tr key={user.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => setViewingMember(entry)}
                          title="View member details"
                          className="group flex items-center gap-3 text-left rounded-xl -m-1 p-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                        >
                          <img src={user.avatarUrl} alt="" className="w-9 h-9 rounded-xl object-cover border border-slate-100 shrink-0 transition group-hover:ring-2 group-hover:ring-indigo-200" />
                          <div className="min-w-0">
                            <span className="font-bold text-slate-900 block truncate group-hover:text-indigo-600 group-hover:underline">{user.name}</span>
                            <span className="text-[11px] text-slate-500 font-mono block truncate">{user.email}</span>
                            <span className="text-[11px] text-slate-500 font-mono block">{user.phone}</span>
                          </div>
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        {user.verification ? INDUSTRY_ROLE_LABELS[user.verification.industryRole] || user.verification.industryRole : '—'}
                      </td>
                      <td className="py-3 px-4">{profile.location}</td>
                      <td className="py-3 px-4">
                        {entry.activeListingCount} active / {entry.listingCount} total
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={user.status} size="sm" />
                        {user.verificationNote && (
                          <p className="text-[10px] text-slate-500 mt-1 max-w-[14rem] truncate" title={user.verificationNote}>
                            {user.verificationNote}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {user.status === 'pending' && (
                            <>
                              <button
                                disabled={busy}
                                onClick={() => run(user.id, () => memberApi.approveMember(user.id, adminUser || undefined), 'Member verified.')}
                                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 disabled:opacity-50"
                              >
                                Approve
                              </button>
                              <button
                                disabled={busy}
                                onClick={() => setPendingAction({ type: 'reject', member: entry })}
                                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 disabled:opacity-50"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {user.status === 'approved' && (
                            <button
                              disabled={busy}
                              onClick={() => setPendingAction({ type: 'suspend', member: entry })}
                              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 disabled:opacity-50"
                            >
                              Suspend
                            </button>
                          )}
                          {(user.status === 'suspended' || user.status === 'rejected') && (
                            <button
                              disabled={busy}
                              onClick={() =>
                                run(
                                  user.id,
                                  () => memberApi.reinstateMember(user.id, adminUser || undefined),
                                  user.status === 'rejected' ? 'Member verified.' : 'Member reinstated.'
                                )
                              }
                              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 disabled:opacity-50"
                            >
                              {user.status === 'rejected' ? 'Approve' : 'Reinstate'}
                            </button>
                          )}
                          {user.status === 'approved' && (
                            <button
                              type="button"
                              onClick={() => setViewingMember(entry)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
                              title="View member details"
                              aria-label={`View details of ${user.name}`}
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <InfiniteScrollSentinel sentinelRef={sentinelRef} loadingMore={loadingMore} hasMore={hasMore} itemCount={members.length} />
      </div>

      <ConfirmDialog
        isOpen={Boolean(pendingAction)}
        title={pendingAction?.type === 'reject' ? 'Reject Member Verification' : 'Suspend Member'}
        message={`Please provide a reason for ${pendingAction?.type === 'reject' ? 'rejecting' : 'suspending'} "${pendingAction?.member.user.name}". The member will see this message.`}
        confirmLabel={pendingAction?.type === 'reject' ? 'Reject' : 'Suspend'}
        requiresReason
        reasonPlaceholder="Reason shown to the member..."
        isDestructive
        onConfirm={handleReasonConfirm}
        onCancel={() => setPendingAction(null)}
      />

      {viewingMember && <MemberDetailsModal member={viewingMember} onClose={closeMemberDetails} />}
    </div>
  );
};
