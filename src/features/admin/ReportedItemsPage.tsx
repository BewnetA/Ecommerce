import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ChevronDown, ChevronUp, EyeOff, PauseCircle, Trash2, RotateCcw, CheckCircle2, XCircle, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { memberApi, productApi, reportsApi } from '../../services/api';
import type { MemberWithDetails } from '../../services/api';
import type { ModerationAction, Product, ReportedItem, ReportStatus } from '../../types';
import { useAuth } from '../auth/AuthContext';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { StatusBadge } from '../../components/common/StatusBadge';
import { useInfiniteList, InfiniteScrollSentinel } from '../../hooks/useInfiniteList';
import { formatETB, isOpenReport, reportReasonLabel } from '../../utils/members';

type ListingAction = 'hide' | 'suspend' | 'remove';
type PendingDecision =
  | { kind: 'listing'; action: ListingAction; report: ReportedItem }
  | { kind: 'dismiss'; report: ReportedItem }
  | { kind: 'resolve'; report: ReportedItem }
  | null;

const ACTION_TO_MODERATION: Record<ListingAction, ModerationAction> = {
  hide: 'hide_listing',
  suspend: 'suspend_listing',
  remove: 'remove_listing',
};

/**
 * B. Listing moderation — performed only when a listing is reported. A report
 * never removes a listing automatically; the administrator reviews the report
 * history and decides whether to hide, suspend or remove the listing, then
 * resolves (or dismisses) the report.
 */
export const ReportedItemsPage: React.FC = () => {
  const { user: adminUser } = useAuth();
  const [statusFilter, setStatusFilter] = useState<'open' | ReportStatus | 'all'>('open');
  const [decision, setDecision] = useState<PendingDecision>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [listings, setListings] = useState<Record<string, Product>>({});
  const [owners, setOwners] = useState<Record<string, MemberWithDetails>>({});

  const fetchReportsBatch = useCallback(async (offset: number, limit: number) => {
    return reportsApi.getReportedItems(limit, offset);
  }, []);

  const { items: reports, loading, loadingMore, hasMore, reload, sentinelRef } = useInfiniteList<ReportedItem>({
    fetchFn: fetchReportsBatch,
    limit: 50,
  });

  const loadContext = useCallback(async () => {
    try {
      const [allListings, allMembers] = await Promise.all([
        productApi.getAllProductsAdmin({ limit: 1000 }),
        memberApi.getAllMembers(undefined, 1000, 0),
      ]);
      setListings(Object.fromEntries(allListings.map((p) => [p.id, p])));
      setOwners(Object.fromEntries(allMembers.map((m) => [m.user.id, m])));
    } catch (err) {
      console.error('Failed to load moderation context', err);
    }
  }, []);

  useEffect(() => {
    loadContext();
  }, [loadContext]);

  const filtered = useMemo(
    () =>
      reports.filter((r) => {
        if (statusFilter === 'all') return true;
        if (statusFilter === 'open') return isOpenReport(r.status);
        return r.status === statusFilter;
      }),
    [reports, statusFilter]
  );

  const historyFor = (targetId: string) => reports.filter((r) => r.targetId === targetId);

  const refresh = async () => {
    await Promise.all([reload(), loadContext()]);
  };

  const runDecision = async (note?: string) => {
    if (!decision) return;
    const { report } = decision;
    const current = decision;
    setDecision(null);
    setProcessingId(report.id);
    try {
      if (current.kind === 'listing') {
        const text = note || '';
        if (current.action === 'hide') await productApi.hideListing(report.targetId, text, adminUser || undefined);
        if (current.action === 'suspend') await productApi.suspendListing(report.targetId, text, adminUser || undefined);
        if (current.action === 'remove') await productApi.removeListing(report.targetId, text, adminUser || undefined);
        // Resolve every open report on this listing with the action taken.
        const open = historyFor(report.targetId).filter((r) => isOpenReport(r.status));
        for (const r of open) {
          await reportsApi.resolveReport(r.id, ACTION_TO_MODERATION[current.action], text, adminUser || undefined);
        }
        toast.success('Listing moderated and report resolved.');
      } else if (current.kind === 'resolve') {
        await reportsApi.resolveReport(report.id, 'no_action', note, adminUser || undefined);
        toast.success('Report resolved.');
      } else {
        await reportsApi.dismissReport(report.id, note, adminUser || undefined);
        toast.success('Report dismissed.');
      }
      await refresh();
    } catch (err: any) {
      toast.error(err.message || 'Moderation action failed.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRestore = async (report: ReportedItem) => {
    setProcessingId(report.id);
    try {
      await productApi.restoreListing(report.targetId, adminUser || undefined);
      toast.success('Listing restored to the marketplace.');
      await refresh();
    } catch (err: any) {
      toast.error(err.message || 'Restore failed.');
    } finally {
      setProcessingId(null);
    }
  };

  const decisionCopy = (() => {
    if (!decision) return { title: '', message: '', confirm: '', placeholder: '', requiresReason: false, destructive: false };
    if (decision.kind === 'listing') {
      const verb = decision.action === 'hide' ? 'Hide' : decision.action === 'suspend' ? 'Suspend' : 'Remove';
      return {
        title: `${verb} Listing`,
        message: `${verb} "${decision.report.targetName}"? The owner is notified with your note, and all open reports on this listing are resolved.`,
        confirm: `${verb} Listing`,
        placeholder: 'Note shown to the listing owner (required)...',
        requiresReason: true,
        destructive: true,
      };
    }
    if (decision.kind === 'resolve') {
      return {
        title: 'Resolve Report',
        message: `Mark this report on "${decision.report.targetName}" as reviewed with no action on the listing?`,
        confirm: 'Resolve',
        placeholder: 'Resolution note (required)...',
        requiresReason: true,
        destructive: false,
      };
    }
    return {
      title: 'Dismiss Report',
      message: `Dismiss this report on "${decision.report.targetName}" as unfounded?`,
      confirm: 'Dismiss',
      placeholder: 'Reason for dismissal (required)...',
      requiresReason: true,
      destructive: false,
    };
  })();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link to="/admin/reports" className="text-xs font-semibold text-slate-500 hover:text-indigo-600 flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Reports & Logs
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-xs font-semibold text-slate-700">Report Management</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">Reported Listings</h2>
          <p className="text-xs text-slate-500">
            Community reports never remove a listing automatically. Review the report history, then act and resolve.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1">
        {(['open', 'resolved', 'dismissed', 'all'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition ${
              statusFilter === s ? 'bg-lime-400 text-black' : 'bg-white/90 text-slate-700 hover:bg-white'
            }`}
          >
            {s} (
            {s === 'all'
              ? reports.length
              : s === 'open'
                ? reports.filter((r) => isOpenReport(r.status)).length
                : reports.filter((r) => r.status === s).length}
            )
          </button>
        ))}
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading reports...</div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center text-xs text-slate-500">No reports in this view.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((r) => {
              const listing = r.targetType === 'product' ? listings[r.targetId] : undefined;
              const ownerId = listing?.sellerId || r.listingOwnerId;
              const owner = ownerId ? owners[ownerId] : undefined;
              const history = historyFor(r.targetId);
              const busy = processingId === r.id;
              const open = isOpenReport(r.status);
              return (
                <div key={r.id} className="p-5 sm:p-6 space-y-3 hover:bg-slate-50/60 transition">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                      {r.targetType === 'product' ? 'Listing' : 'Member'}
                    </span>
                    <StatusBadge status={r.status} size="sm" />
                    <span className="text-[11px] text-slate-400">
                      Reported by {r.reporterName} • {new Date(r.createdAt).toLocaleString()}
                    </span>
                  </div>

                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    <div className="space-y-2 flex-1 min-w-0">
                      <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                        {r.targetName}
                        {listing && (
                          <Link to={`/products/${listing.id}`} className="text-slate-400 hover:text-indigo-600" title="Open listing">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                        )}
                      </h3>

                      <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-1">
                        <p>
                          <strong className="text-slate-800">Reason:</strong> {reportReasonLabel(r.reasonCode)}
                        </p>
                        {r.details && (
                          <p>
                            <strong className="text-slate-800">Details:</strong> {r.details}
                          </p>
                        )}
                      </div>

                      {listing && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-600">
                          <p>
                            <span className="text-slate-400">Listing:</span> {listing.listingType} • {formatETB(listing.price)} •{' '}
                            {listing.locationSubCity}, {listing.locationCity}
                          </p>
                          <p className="flex items-center gap-1.5">
                            <span className="text-slate-400">Listing status:</span> <StatusBadge status={listing.status} size="sm" />
                          </p>
                        </div>
                      )}
                      {owner && (
                        <p className="text-[11px] text-slate-600">
                          <span className="text-slate-400">Owner:</span> {owner.user.name} ({owner.profile.businessName}) •{' '}
                          {owner.user.phone} • {owner.user.email} • verification: {owner.user.status} •{' '}
                          {owner.activeListingCount} active ad(s)
                        </p>
                      )}

                      {r.resolutionAction && (
                        <p className="text-xs text-emerald-700 font-medium">
                          ✓ {r.resolutionAction}
                          {r.resolutionNote ? ` — ${r.resolutionNote}` : ''}
                          {r.resolvedBy ? ` (by ${r.resolvedBy})` : ''}
                        </p>
                      )}

                      {history.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600"
                        >
                          {expanded === r.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          Report history ({history.length} reports on this {r.targetType === 'product' ? 'listing' : 'member'})
                        </button>
                      )}
                      {expanded === r.id && (
                        <ul className="text-[11px] text-slate-600 space-y-1 border-l-2 border-slate-200 pl-3">
                          {history.map((h) => (
                            <li key={h.id}>
                              {new Date(h.createdAt).toLocaleDateString()} — {h.reporterName}: {reportReasonLabel(h.reasonCode)}
                              {h.details ? ` ("${h.details}")` : ''} — <span className="font-semibold">{h.status.replace('_', ' ')}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div className="flex flex-wrap lg:flex-col gap-2 shrink-0 lg:w-44">
                      {open && listing && listing.status === 'active' && (
                        <>
                          <button
                            disabled={busy}
                            onClick={() => setDecision({ kind: 'listing', action: 'hide', report: r })}
                            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 disabled:opacity-50"
                          >
                            <EyeOff className="w-3.5 h-3.5" /> Hide listing
                          </button>
                          <button
                            disabled={busy}
                            onClick={() => setDecision({ kind: 'listing', action: 'suspend', report: r })}
                            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-orange-50 text-orange-800 border border-orange-200 hover:bg-orange-100 disabled:opacity-50"
                          >
                            <PauseCircle className="w-3.5 h-3.5" /> Suspend listing
                          </button>
                        </>
                      )}
                      {open && listing && listing.status !== 'removed' && (
                        <button
                          disabled={busy}
                          onClick={() => setDecision({ kind: 'listing', action: 'remove', report: r })}
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Remove listing
                        </button>
                      )}
                      {listing && listing.status !== 'active' && (
                        <button
                          disabled={busy}
                          onClick={() => handleRestore(r)}
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 disabled:opacity-50"
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> Restore listing
                        </button>
                      )}
                      {open && (
                        <>
                          <button
                            disabled={busy}
                            onClick={() => setDecision({ kind: 'resolve', report: r })}
                            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Resolve (no action)
                          </button>
                          <button
                            disabled={busy}
                            onClick={() => setDecision({ kind: 'dismiss', report: r })}
                            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-50"
                          >
                            <XCircle className="w-3.5 h-3.5" /> Dismiss
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <InfiniteScrollSentinel sentinelRef={sentinelRef} loadingMore={loadingMore} hasMore={hasMore} itemCount={reports.length} />
      </div>

      <ConfirmDialog
        isOpen={Boolean(decision)}
        title={decisionCopy.title}
        message={decisionCopy.message}
        confirmLabel={decisionCopy.confirm}
        requiresReason={decisionCopy.requiresReason}
        reasonPlaceholder={decisionCopy.placeholder}
        isDestructive={decisionCopy.destructive}
        onConfirm={runDecision}
        onCancel={() => setDecision(null)}
      />
    </div>
  );
};
