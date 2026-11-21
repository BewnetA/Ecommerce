import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Phone, MapPin, Calendar, CheckCircle2, XCircle, ArrowLeft, Loader2, Mail, BadgeCheck } from 'lucide-react';
import { memberApi } from '../../services/api';
import type { MemberWithDetails } from '../../services/api';
import { useAuth } from '../auth/AuthContext';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { ActionAlertModal, type ActionAlertState } from '../../components/common/ActionAlertModal';
import { useInfiniteList, InfiniteScrollSentinel } from '../../hooks/useInfiniteList';
import { ID_TYPE_LABELS, INDUSTRY_ROLE_LABELS, maskIdNumber } from '../../utils/members';
import { MemberDetailsModal } from './MemberDetailsModal';

/**
 * A. One-time member verification. Every new member is reviewed once, at
 * registration, to confirm a connection to the mobile phone repair industry.
 * Approved members can post ads immediately — listings are never approved
 * one by one.
 */
export const MemberVerificationQueuePage: React.FC = () => {
  const { user: adminUser } = useAuth();
  const [rejectTarget, setRejectTarget] = useState<MemberWithDetails | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [viewingMember, setViewingMember] = useState<MemberWithDetails | null>(null);
  const closeMemberDetails = useCallback(() => setViewingMember(null), []);
  const [alertState, setAlertState] = useState<ActionAlertState>({
    isOpen: false,
    type: 'success',
    title: '',
    message: '',
  });

  const fetchMembersBatch = useCallback(async (offset: number, limit: number) => {
    return memberApi.getAllMembers('pending', limit, offset);
  }, []);

  const {
    items: pendingMembers,
    loading,
    loadingMore,
    hasMore,
    reload: fetchQueue,
    sentinelRef,
  } = useInfiniteList<MemberWithDetails>({
    fetchFn: fetchMembersBatch,
    limit: 50,
  });

  const handleApprove = async (memberId: string) => {
    setProcessingId(memberId);
    try {
      await memberApi.approveMember(memberId, adminUser || undefined);
      await fetchQueue();
      setAlertState({
        isOpen: true,
        type: 'success',
        title: 'Member Verified!',
        message: 'The member now has full marketplace access, including posting ads.',
      });
    } catch (err: any) {
      setAlertState({
        isOpen: true,
        type: 'error',
        title: 'Approval Failed',
        message: err.message || 'An error occurred while approving the member.',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectConfirm = async (reason?: string) => {
    if (!rejectTarget || !reason) return;
    const targetUserId = rejectTarget.user.id;
    setProcessingId(targetUserId);
    try {
      await memberApi.rejectMember(targetUserId, reason, adminUser || undefined);
      setRejectTarget(null);
      await fetchQueue();
      setAlertState({
        isOpen: true,
        type: 'success',
        title: 'Verification Rejected',
        message: 'The member will see your documented reason on their status page.',
      });
    } catch (err: any) {
      setAlertState({
        isOpen: true,
        type: 'error',
        title: 'Rejection Failed',
        message: err.message || 'An error occurred while rejecting the member.',
      });
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link to="/admin" className="text-xs font-semibold text-slate-500 hover:text-indigo-600 flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-xs font-semibold text-slate-700">Member Verification</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">Members Awaiting Verification ({pendingMembers.length})</h2>
          <p className="text-xs text-slate-500">
            One-time check that each new member is connected to the mobile phone repair industry
          </p>
        </div>
      </div>

      {loading ? (
        <div className="p-16 text-center text-xs text-slate-400">Loading queue...</div>
      ) : pendingMembers.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-16 text-center space-y-3">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">Verification Queue is Clear</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            All new members have been reviewed. New registrations will appear here automatically.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {pendingMembers.map((entry) => {
            const { user: member, profile } = entry;
            const details = member.verification;
            return (
              <div
                key={member.id}
                className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-start justify-between gap-6"
              >
                <div className="flex items-start gap-4 flex-1">
                  <button
                    type="button"
                    onClick={() => setViewingMember(entry)}
                    title="View member details"
                    aria-label={`View details of ${member.name}`}
                    className="shrink-0 rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  >
                    <img
                      src={member.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80'}
                      alt=""
                      className="w-16 h-16 rounded-2xl object-cover border border-slate-200 transition hover:ring-2 hover:ring-indigo-200"
                    />
                  </button>

                  <div className="space-y-2 flex-1">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-base text-slate-900">
                          <button
                            type="button"
                            onClick={() => setViewingMember(entry)}
                            title="View member details"
                            className="text-left hover:text-indigo-600 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded"
                          >
                            {member.name}
                          </button>
                        </h3>
                        <span className="bg-amber-100 text-amber-800 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full">
                          Pending Verification
                        </span>
                      </div>
                      {profile.businessName && profile.businessName !== member.name && (
                        <p className="text-xs text-slate-600 font-medium">Business: {profile.businessName}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-500">
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {profile.location}
                        {profile.addressDescription ? ` • ${profile.addressDescription}` : ''}
                      </span>
                      <span className="flex items-center gap-1.5 font-mono">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        {member.phone}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        {member.email}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        Registered on {new Date(member.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-600 space-y-1.5">
                      <span className="font-bold text-slate-700 block">Repair-industry connection</span>
                      {details ? (
                        <>
                          <p>
                            <span className="font-semibold">Role:</span> {INDUSTRY_ROLE_LABELS[details.industryRole] || details.industryRole} •{' '}
                            {details.yearsOfExperience} year(s) experience
                            {details.workplaceName ? ` • ${details.workplaceName}` : ''}
                          </p>
                          <p className="leading-relaxed">{details.industryDescription}</p>
                          <p className="flex items-center gap-1.5">
                            <BadgeCheck className="w-3.5 h-3.5 text-slate-400" />
                            {ID_TYPE_LABELS[details.idType] || 'ID'}: {maskIdNumber(details.idNumber)}
                            {details.tradeLicenseNumber ? ` • Trade license: ${details.tradeLicenseNumber}` : ''}
                          </p>
                          {details.referenceName && (
                            <p>
                              <span className="font-semibold">Reference:</span> {details.referenceName}
                              {details.referencePhone ? ` (${details.referencePhone})` : ''}
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="leading-relaxed">{profile.businessDescription || 'No verification details were submitted.'}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex md:flex-col gap-2 shrink-0 justify-end">
                  <button
                    type="button"
                    disabled={processingId === member.id}
                    onClick={() => handleApprove(member.id)}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs transition disabled:opacity-60"
                  >
                    {processingId === member.id ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Approving...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Approve Member</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    disabled={processingId === member.id}
                    onClick={() => setRejectTarget(entry)}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs rounded-xl transition border border-rose-200 disabled:opacity-60"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Reject</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <InfiniteScrollSentinel sentinelRef={sentinelRef} loadingMore={loadingMore} hasMore={hasMore} itemCount={pendingMembers.length} />

      <ConfirmDialog
        isOpen={Boolean(rejectTarget)}
        title="Reject Member Verification"
        message={`Please provide a reason for rejecting "${rejectTarget?.user.name}". The member will see this message.`}
        confirmLabel={processingId === rejectTarget?.user.id ? 'Rejecting...' : 'Reject Verification'}
        requiresReason
        reasonPlaceholder="e.g. Could not confirm a connection to the mobile phone repair industry..."
        isDestructive
        onConfirm={handleRejectConfirm}
        onCancel={() => setRejectTarget(null)}
      />

      <ActionAlertModal
        isOpen={alertState.isOpen}
        type={alertState.type}
        title={alertState.title}
        message={alertState.message}
        onClose={() => setAlertState((prev) => ({ ...prev, isOpen: false }))}
      />

      {viewingMember && <MemberDetailsModal member={viewingMember} onClose={closeMemberDetails} />}
    </div>
  );
};
