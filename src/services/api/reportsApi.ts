import type { AdminStats, ReportedItem, ActivityLog, User } from '../../types';
import { loadStorageData, saveStorageData, simulateLatency } from '../mockStorage';

export const reportsApi = {
  async getAdminStats(): Promise<AdminStats> {
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

  async getReportedItems(): Promise<ReportedItem[]> {
    const data = loadStorageData();
    const sorted = [...data.reportedItems].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return simulateLatency(sorted, 100);
  },

  async reportItem(input: {
    targetType: 'product' | 'user';
    targetId: string;
    targetName: string;
    reporterName: string;
    reason: string;
  }): Promise<ReportedItem> {
    const data = loadStorageData();

    const newReport: ReportedItem = {
      id: `rep-${Date.now()}`,
      targetType: input.targetType,
      targetId: input.targetId,
      targetName: input.targetName,
      reporterName: input.reporterName,
      reason: input.reason.trim(),
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    data.reportedItems.unshift(newReport);

    // Notify admin
    data.notifications.unshift({
      id: `notif-${Date.now()}`,
      userId: 'user-admin',
      title: 'New Moderation Report Filed',
      message: `${input.reporterName} reported ${input.targetType} "${input.targetName}": ${input.reason}`,
      type: 'system',
      isRead: false,
      linkTo: '/admin/reports',
      createdAt: new Date().toISOString(),
    });

    saveStorageData(data);
    return simulateLatency(newReport, 150);
  },

  async resolveReport(reportId: string, resolutionAction: string, adminUser?: User): Promise<ReportedItem> {
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
      createdAt: new Date().toISOString(),
    });

    saveStorageData(data);
    return simulateLatency(data.reportedItems[index], 120);
  },

  async dismissReport(reportId: string, adminUser?: User): Promise<ReportedItem> {
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
      createdAt: new Date().toISOString(),
    });

    saveStorageData(data);
    return simulateLatency(data.reportedItems[index], 120);
  },

  async getActivityLogs(): Promise<ActivityLog[]> {
    const data = loadStorageData();
    const logs = [...data.activityLogs].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return simulateLatency(logs, 100);
  },
};
