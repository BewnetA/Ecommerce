import type { AdminStats, ReportedItem, ActivityLog, User } from '../../types';
import { loadStorageData, saveStorageData, simulateLatency } from '../mockStorage';
import { getSupabase } from '../supabaseClient';

export const reportsApi = {
  async getAdminStats(): Promise<AdminStats> {
    const supabase = getSupabase();

    if (supabase) {
      try {
        const [
          sellersRes,
          buyersRes,
          productsRes,
          pendingSellersRes,
          pendingProdsRes,
          approvedProdsRes,
          rejectedProdsRes,
          conversationsRes,
        ] = await Promise.all([
          supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'seller'),
          supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'buyer'),
          supabase.from('products').select('id', { count: 'exact', head: true }),
          supabase.from('seller_profiles').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
          supabase.from('products').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
          supabase.from('products').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
          supabase.from('products').select('id', { count: 'exact', head: true }).eq('status', 'rejected'),
          supabase.from('conversations').select('id', { count: 'exact', head: true }),
        ]);

        return {
          totalSellers: sellersRes.count || 0,
          totalBuyers: buyersRes.count || 0,
          totalProducts: productsRes.count || 0,
          pendingSellerApprovals: pendingSellersRes.count || 0,
          pendingProductApprovals: pendingProdsRes.count || 0,
          approvedProducts: approvedProdsRes.count || 0,
          rejectedProducts: rejectedProdsRes.count || 0,
          activeConversations: conversationsRes.count || 0,
        };
      } catch (err) {
        console.error('Supabase getAdminStats error:', err);
        return {
          totalSellers: 0,
          totalBuyers: 0,
          totalProducts: 0,
          pendingSellerApprovals: 0,
          pendingProductApprovals: 0,
          approvedProducts: 0,
          rejectedProducts: 0,
          activeConversations: 0,
        };
      }
    }

    const data = loadStorageData();

    const totalSellers = data.users.filter((u) => u.role === 'seller').length;
    const totalBuyers = data.users.filter((u) => u.role === 'buyer').length;
    const totalProducts = data.products.length;

    const pendingSellerApprovals = data.sellerProfiles.filter((s) => s.status === 'pending').length;
    const pendingProductApprovals = data.products.filter((p) => p.status === 'pending').length;
    const approvedProducts = data.products.filter((p) => p.status === 'approved').length;
    const rejectedProducts = data.products.filter((p) => p.status === 'rejected').length;
    const activeConversations = data.conversations.length;

    const stats: AdminStats = {
      totalSellers,
      totalBuyers,
      totalProducts,
      pendingSellerApprovals,
      pendingProductApprovals,
      approvedProducts,
      rejectedProducts,
      activeConversations,
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
        return (data || []).map((r: any) => ({
          id: r.id,
          targetType: r.target_type,
          targetId: r.target_id,
          targetName: r.target_name,
          reporterName: r.reporter_name,
          reason: r.reason,
          status: r.status,
          resolutionAction: r.resolution_action,
          createdAt: r.created_at,
        }));
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

  async reportItem(input: {
    targetType: 'product' | 'user';
    targetId: string;
    targetName: string;
    reporterName: string;
    reason: string;
  }): Promise<ReportedItem> {
    const now = new Date().toISOString();
    const newReport: ReportedItem = {
      id: `rep-${Date.now()}`,
      targetType: input.targetType,
      targetId: input.targetId,
      targetName: input.targetName,
      reporterName: input.reporterName,
      reason: input.reason.trim(),
      status: 'pending',
      createdAt: now,
    };

    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.from('reported_items').insert({
          id: newReport.id,
          target_type: newReport.targetType,
          target_id: newReport.targetId,
          target_name: newReport.targetName,
          reporter_name: newReport.reporterName,
          reason: newReport.reason,
          status: 'pending',
          created_at: now,
        });

        await supabase.from('notifications').insert({
          id: `notif-${Date.now()}`,
          user_id: 'user-admin',
          title: 'New Moderation Report Filed',
          message: `${input.reporterName} reported ${input.targetType} "${input.targetName}": ${input.reason}`,
          type: 'system',
          is_read: false,
          link_to: '/admin/reports',
          created_at: now,
        });
      } catch (err) {
        console.warn('Supabase reportItem error:', err);
      }
    }

    const data = loadStorageData();
    data.reportedItems.unshift(newReport);
    data.notifications.unshift({
      id: `notif-${Date.now()}`,
      userId: 'user-admin',
      title: 'New Moderation Report Filed',
      message: `${input.reporterName} reported ${input.targetType} "${input.targetName}": ${input.reason}`,
      type: 'system',
      isRead: false,
      linkTo: '/admin/reports',
      createdAt: now,
    });
    saveStorageData(data);

    return simulateLatency(newReport, 150);
  },

  async resolveReport(reportId: string, resolutionAction: string, adminUser?: User): Promise<ReportedItem> {
    const supabase = getSupabase();
    const now = new Date().toISOString();

    if (supabase) {
      try {
        await supabase
          .from('reported_items')
          .update({ status: 'resolved', resolution_action: resolutionAction })
          .eq('id', reportId);

        await supabase.from('activity_logs').insert({
          id: `act-${Date.now()}`,
          actor_name: adminUser?.name || 'Administrator',
          actor_role: 'admin',
          action: 'RESOLVE_REPORT',
          details: `Resolved report (${reportId}). Action: ${resolutionAction}`,
          created_at: now,
        });
      } catch (err) {
        console.warn('Supabase resolveReport error:', err);
      }
    }

    const data = loadStorageData();
    const index = data.reportedItems.findIndex((r) => r.id === reportId);
    if (index === -1) throw new Error('Reported item record not found.');

    data.reportedItems[index].status = 'resolved';
    data.reportedItems[index].resolutionAction = resolutionAction;

    data.activityLogs.unshift({
      id: `act-${Date.now()}`,
      actorName: adminUser?.name || 'Administrator',
      actorRole: 'admin',
      action: 'RESOLVE_REPORT',
      details: `Resolved report for ${data.reportedItems[index].targetName}. Action: ${resolutionAction}`,
      createdAt: now,
    });

    saveStorageData(data);
    return simulateLatency(data.reportedItems[index], 120);
  },

  async dismissReport(reportId: string, adminUser?: User): Promise<ReportedItem> {
    const supabase = getSupabase();
    const now = new Date().toISOString();

    if (supabase) {
      try {
        await supabase
          .from('reported_items')
          .update({ status: 'dismissed', resolution_action: 'Dismissed as unfounded or resolved amicably.' })
          .eq('id', reportId);

        await supabase.from('activity_logs').insert({
          id: `act-${Date.now()}`,
          actor_name: adminUser?.name || 'Administrator',
          actor_role: 'admin',
          action: 'DISMISS_REPORT',
          details: `Dismissed report (${reportId}).`,
          created_at: now,
        });
      } catch (err) {
        console.warn('Supabase dismissReport error:', err);
      }
    }

    const data = loadStorageData();
    const index = data.reportedItems.findIndex((r) => r.id === reportId);
    if (index === -1) throw new Error('Reported item record not found.');

    data.reportedItems[index].status = 'dismissed';
    data.reportedItems[index].resolutionAction = 'Dismissed as unfounded or resolved amicably.';

    data.activityLogs.unshift({
      id: `act-${Date.now()}`,
      actorName: adminUser?.name || 'Administrator',
      actorRole: 'admin',
      action: 'DISMISS_REPORT',
      details: `Dismissed report for ${data.reportedItems[index].targetName}.`,
      createdAt: now,
    });

    saveStorageData(data);
    return simulateLatency(data.reportedItems[index], 120);
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
