import type {
  ActivityLog,
  AdminStats,
  ModerationAction,
  Product,
  ReportReasonCode,
  ReportedItem,
  User,
} from '../../types';
import { loadStorageData, saveStorageData, simulateLatency } from '../mockStorage';
import { getSupabase } from '../supabaseClient';
import {
  isOpenReport,
  normalizeListingStatus,
  normalizeMemberStatus,
  normalizeReasonCode,
  normalizeReportStatus,
  normalizeRole,
  reportReasonLabel,
} from '../../utils/members';

export const MAX_REPORT_DETAILS_LENGTH = 500;

export interface SubmitListingReportInput {
  product: Pick<Product, 'id' | 'name' | 'sellerId'>;
  reporter: User;
  reasonCode: ReportReasonCode;
  details?: string;
}

/** One row of the admin "reported listings" queue. */
export interface ReportedListingSummary {
  listingId: string;
  listingName: string;
  listingOwnerId?: string;
  openReports: number;
  totalReports: number;
  lastReportedAt: string;
  reasons: ReportReasonCode[];
}

const MODERATION_ACTION_LABELS: Record<ModerationAction, string> = {
  no_action: 'Reviewed — no action needed',
  hide_listing: 'Listing hidden',
  suspend_listing: 'Listing suspended',
  remove_listing: 'Listing removed',
  restore_listing: 'Listing restored',
};

function mapSupabaseReport(r: any): ReportedItem {
  const reasonCode = normalizeReasonCode(r.reason_code, r.reason);
  return {
    id: r.id,
    targetType: r.target_type,
    targetId: r.target_id,
    targetName: r.target_name,
    listingOwnerId: r.listing_owner_id || undefined,
    reporterId: r.reporter_id || undefined,
    reporterName: r.reporter_name,
    reasonCode,
    reason: r.reason_code ? reportReasonLabel(reasonCode) : r.reason,
    details: r.details || undefined,
    status: normalizeReportStatus(r.status),
    resolutionAction:
      (MODERATION_ACTION_LABELS as Record<string, string>)[r.resolution_action] || r.resolution_action || undefined,
    resolutionNote: r.resolution_note || undefined,
    resolvedAt: r.resolved_at || undefined,
    resolvedBy: r.resolved_by || undefined,
    createdAt: r.created_at,
  };
}

const EMPTY_STATS: AdminStats = {
  totalMembers: 0,
  pendingVerifications: 0,
  approvedMembers: 0,
  suspendedMembers: 0,
  totalListings: 0,
  activeListings: 0,
  moderatedListings: 0,
  openReports: 0,
  activeConversations: 0,
};

export const reportsApi = {
  async getAdminStats(): Promise<AdminStats> {
    const supabase = getSupabase();

    if (supabase) {
      try {
        const [profilesRes, productsRes, reportsRes, conversationsRes] = await Promise.all([
          supabase.from('profiles').select('role, status'),
          supabase.from('products').select('status'),
          supabase.from('reported_items').select('status'),
          supabase.from('conversations').select('id', { count: 'exact', head: true }),
        ]);
        const members = (profilesRes.data || []).filter((p: any) => normalizeRole(p.role) === 'member');
        const statuses = members.map((p: any) => normalizeMemberStatus(p.status));
        const listingStatuses = (productsRes.data || []).map((p: any) => normalizeListingStatus(p.status));
        return {
          totalMembers: members.length,
          pendingVerifications: statuses.filter((s) => s === 'pending').length,
          approvedMembers: statuses.filter((s) => s === 'approved').length,
          suspendedMembers: statuses.filter((s) => s === 'suspended').length,
          totalListings: listingStatuses.length,
          activeListings: listingStatuses.filter((s) => s === 'active').length,
          moderatedListings: listingStatuses.filter((s) => s !== 'active').length,
          openReports: (reportsRes.data || []).filter((r: any) => isOpenReport(normalizeReportStatus(r.status))).length,
          activeConversations: conversationsRes.count || 0,
        };
      } catch (err) {
        console.error('Supabase getAdminStats error:', err);
        return { ...EMPTY_STATS };
      }
    }

    const data = loadStorageData();
    const members = data.users.filter((u) => u.role !== 'admin');
    const stats: AdminStats = {
      totalMembers: members.length,
      pendingVerifications: members.filter((u) => u.status === 'pending').length,
      approvedMembers: members.filter((u) => u.status === 'approved').length,
      suspendedMembers: members.filter((u) => u.status === 'suspended').length,
      totalListings: data.products.length,
      activeListings: data.products.filter((p) => p.status === 'active').length,
      moderatedListings: data.products.filter((p) => p.status !== 'active').length,
      openReports: data.reportedItems.filter((r) => isOpenReport(r.status)).length,
      activeConversations: data.conversations.length,
    };
    return simulateLatency(stats, 100);
  },

  async getReportedItems(limit: number = 50, offset: number = 0): Promise<ReportedItem[]> {
    const supabase = getSupabase();

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('reported_items')
          .select('*')
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);

        if (error) {
          console.error('Supabase getReportedItems error:', error);
          return [];
        }
        return (data || []).map(mapSupabaseReport);
      } catch (err) {
        console.error('Supabase getReportedItems error:', err);
        return [];
      }
    }

    const data = loadStorageData();
    const sorted = [...data.reportedItems].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return simulateLatency(sorted.slice(offset, offset + limit), 100);
  },

  /** Full report history for one listing (or member). */
  async getReportsForTarget(targetId: string): Promise<ReportedItem[]> {
    const all = await this.getReportedItems(500, 0);
    return all.filter((r) => r.targetId === targetId);
  },

  /** Listings grouped with their report counts, newest activity first. */
  async getReportedListings(): Promise<ReportedListingSummary[]> {
    const all = await this.getReportedItems(500, 0);
    const byListing = new Map<string, ReportedListingSummary>();
    all
      .filter((r) => r.targetType === 'product')
      .forEach((r) => {
        const current = byListing.get(r.targetId) || {
          listingId: r.targetId,
          listingName: r.targetName,
          listingOwnerId: r.listingOwnerId,
          openReports: 0,
          totalReports: 0,
          lastReportedAt: r.createdAt,
          reasons: [],
        };
        current.totalReports += 1;
        if (isOpenReport(r.status)) current.openReports += 1;
        if (new Date(r.createdAt) > new Date(current.lastReportedAt)) current.lastReportedAt = r.createdAt;
        if (!current.reasons.includes(r.reasonCode)) current.reasons.push(r.reasonCode);
        byListing.set(r.targetId, current);
      });
    return [...byListing.values()].sort(
      (a, b) => new Date(b.lastReportedAt).getTime() - new Date(a.lastReportedAt).getTime()
    );
  },

  /** Whether the member already has an open report for this listing. */
  async hasOpenReport(listingId: string, reporter: User): Promise<boolean> {
    const supabase = getSupabase();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('reported_items')
          .select('id')
          .eq('target_id', listingId)
          .eq('reporter_id', reporter.id)
          .in('status', ['pending', 'under_review'])
          .limit(1);
        if (!error) return (data || []).length > 0;
      } catch {
        // Current schema has no reporter_id column; fall back to reporter name.
      }
      try {
        const { data } = await supabase
          .from('reported_items')
          .select('id')
          .eq('target_id', listingId)
          .eq('reporter_name', reporter.name)
          .eq('status', 'pending')
          .limit(1);
        return (data || []).length > 0;
      } catch {
        return false;
      }
    }

    const data = loadStorageData();
    return data.reportedItems.some(
      (r) =>
        r.targetId === listingId &&
        (r.reporterId === reporter.id || (!r.reporterId && r.reporterName === reporter.name)) &&
        isOpenReport(r.status)
    );
  },

  /**
   * Community report on a listing. Creates a moderation record only — the
   * listing stays visible until an administrator reviews the report.
   */
  async submitListingReport(input: SubmitListingReportInput): Promise<ReportedItem> {
    const { product, reporter, reasonCode } = input;
    const details = input.details?.trim() || undefined;

    if (reporter.role !== 'admin' && reporter.status !== 'approved') {
      throw new Error('Only verified members can report listings.');
    }
    if (product.sellerId === reporter.id) {
      throw new Error('You cannot report your own listing. Manage it from My Ads instead.');
    }
    if (!reasonCode) {
      throw new Error('Please select a reason for your report.');
    }
    if (details && details.length > MAX_REPORT_DETAILS_LENGTH) {
      throw new Error(`Additional details must be ${MAX_REPORT_DETAILS_LENGTH} characters or fewer.`);
    }
    if (await this.hasOpenReport(product.id, reporter)) {
      throw new Error('You have already reported this listing. Our moderation team will review it.');
    }

    const now = new Date().toISOString();
    const report: ReportedItem = {
      id: `rep-${Date.now()}`,
      targetType: 'product',
      targetId: product.id,
      targetName: product.name,
      listingOwnerId: product.sellerId,
      reporterId: reporter.id,
      reporterName: reporter.name,
      reasonCode,
      reason: reportReasonLabel(reasonCode),
      details,
      status: 'pending',
      createdAt: now,
    };
    const adminNotice = {
      title: 'New Listing Report',
      message: `${reporter.name} reported "${product.name}": ${report.reason}`,
    };

    const supabase = getSupabase();
    if (supabase) {
      const legacyRow = {
        id: report.id,
        target_type: 'product',
        target_id: report.targetId,
        target_name: report.targetName,
        reporter_name: report.reporterName,
        reason: details ? `${report.reason}: ${details}` : report.reason,
        status: 'pending',
        created_at: now,
      };
      const { error } = await supabase.from('reported_items').insert({
        ...legacyRow,
        reason: report.reason,
        reason_code: reasonCode,
        details: details ?? null,
        reporter_id: reporter.id,
        listing_owner_id: product.sellerId,
      });
      if (error) {
        console.warn('Report insert note, retrying legacy columns:', error.message);
        const { error: legacyError } = await supabase.from('reported_items').insert(legacyRow);
        if (legacyError) throw new Error('Could not submit your report. Please try again.');
      }
      await supabase.from('notifications').insert({
        id: `notif-${Date.now()}`,
        user_id: 'user-admin',
        title: adminNotice.title,
        message: adminNotice.message,
        type: 'report_received',
        is_read: false,
        link_to: '/admin/reports/items',
        created_at: now,
      });
      return report;
    }

    const data = loadStorageData();
    data.reportedItems.unshift(report);
    data.notifications.unshift({
      id: `notif-${Date.now()}`,
      userId: 'user-admin',
      title: adminNotice.title,
      message: adminNotice.message,
      type: 'report_received',
      isRead: false,
      linkTo: '/admin/reports/items',
      createdAt: now,
    });
    saveStorageData(data);

    return simulateLatency(report, 300);
  },

  /** Marks a report as resolved after the administrator acted on it. */
  async resolveReport(
    reportId: string,
    action: ModerationAction,
    note: string | undefined,
    adminUser?: User
  ): Promise<ReportedItem> {
    return updateReport(reportId, 'resolved', action, note, adminUser);
  },

  async dismissReport(reportId: string, note: string | undefined, adminUser?: User): Promise<ReportedItem> {
    return updateReport(reportId, 'dismissed', 'no_action', note || 'Dismissed as unfounded.', adminUser);
  },

  async getActivityLogs(): Promise<ActivityLog[]> {
    const supabase = getSupabase();

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('activity_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) {
          console.error('Supabase getActivityLogs error:', error);
          return [];
        }
        return (data || []).map((l: any) => ({
          id: l.id,
          actorName: l.actor_name,
          actorRole: l.actor_role,
          action: l.action,
          details: l.details,
          createdAt: l.created_at,
        }));
      } catch (err) {
        console.error('Supabase getActivityLogs error:', err);
        return [];
      }
    }

    const data = loadStorageData();
    const logs = [...data.activityLogs].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return simulateLatency(logs, 100);
  },
};

async function updateReport(
  reportId: string,
  status: 'resolved' | 'dismissed',
  action: ModerationAction,
  note: string | undefined,
  adminUser?: User
): Promise<ReportedItem> {
  const now = new Date().toISOString();
  const actionLabel = MODERATION_ACTION_LABELS[action];
  const supabase = getSupabase();

  if (supabase) {
    const legacyUpdate = {
      status,
      resolution_action: note ? `${actionLabel}. ${note}` : actionLabel,
    };
    const { error } = await supabase
      .from('reported_items')
      .update({
        ...legacyUpdate,
        resolution_action: action,
        resolution_note: note ?? null,
        resolved_at: now,
        resolved_by: adminUser?.id ?? null,
      })
      .eq('id', reportId);
    if (error) {
      const { error: legacyError } = await supabase.from('reported_items').update(legacyUpdate).eq('id', reportId);
      if (legacyError) throw new Error(legacyError.message);
    }
    await supabase.from('activity_logs').insert({
      id: `act-${Date.now()}`,
      actor_name: adminUser?.name || 'Administrator',
      actor_role: 'admin',
      action: status === 'resolved' ? 'RESOLVE_REPORT' : 'DISMISS_REPORT',
      details: `${status === 'resolved' ? 'Resolved' : 'Dismissed'} report (${reportId}). ${actionLabel}.`,
      created_at: now,
    });
    const { data } = await supabase.from('reported_items').select('*').eq('id', reportId).maybeSingle();
    if (!data) throw new Error('Reported item record not found.');
    return mapSupabaseReport(data);
  }

  const data = loadStorageData();
  const index = data.reportedItems.findIndex((r) => r.id === reportId);
  if (index === -1) throw new Error('Reported item record not found.');

  data.reportedItems[index] = {
    ...data.reportedItems[index],
    status,
    resolutionAction: actionLabel,
    resolutionNote: note,
    resolvedAt: now,
    resolvedBy: adminUser?.name || 'Administrator',
  };

  data.activityLogs.unshift({
    id: `act-${Date.now()}`,
    actorName: adminUser?.name || 'Administrator',
    actorRole: 'admin',
    action: status === 'resolved' ? 'RESOLVE_REPORT' : 'DISMISS_REPORT',
    details: `${status === 'resolved' ? 'Resolved' : 'Dismissed'} report for "${data.reportedItems[index].targetName}". ${actionLabel}.`,
    createdAt: now,
  });

  saveStorageData(data);
  return simulateLatency(data.reportedItems[index], 120);
}
