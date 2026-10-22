import React, { useState, useEffect } from 'react';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserPlus,
  Search,
  Trash2,
  Ban,
  CheckCircle2,
  Lock,
  Mail,
  Phone,
  User as UserIcon,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { userApi } from '../../services/api';
import { useAuth } from '../auth/AuthContext';
import type { User, AccountStatus } from '../../types';

export const AdminManagementPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [admins, setAdmins] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<AccountStatus | 'all'>('all');
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPhone, setNewAdminPhone] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [newAdminRoleType, setNewAdminRoleType] = useState<'super_admin' | 'moderator'>('super_admin');
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Action targets
  const [actionTarget, setActionTarget] = useState<{
    user: User;
    action: 'suspend' | 'activate' | 'delete';
  } | null>(null);

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const list = await userApi.getAllAdmins();
      setAdmins(list);
    } catch (err) {
      console.error('Failed to load admins:', err);
      toast.error('Failed to load administrator accounts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const filteredAdmins = admins.filter((a) => {
    if (statusFilter !== 'all' && a.status !== statusFilter) return false;
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      a.name.toLowerCase().includes(q) ||
      a.email.toLowerCase().includes(q) ||
      (a.phone && a.phone.includes(q))
    );
  });

  const activeCount = admins.filter((a) => a.status === 'active').length;
  const suspendedCount = admins.filter((a) => a.status === 'suspended').length;

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminName.trim() || !newAdminEmail.trim() || !newAdminPassword.trim()) {
      toast.error('Please complete Name, Email, and Password fields.');
      return;
    }

    try {
      setFormSubmitting(true);
      const created = await userApi.createAdmin({
        name: newAdminName.trim(),
        email: newAdminEmail.trim(),
        phone: newAdminPhone.trim() || undefined,
        password: newAdminPassword.trim(),
      });

      toast.success(`Admin account created for "${created.name}"`);
      setIsAddModalOpen(false);
      setNewAdminName('');
      setNewAdminEmail('');
      setNewAdminPhone('');
      setNewAdminPassword('');
      await fetchAdmins();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create administrator account.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleConfirmAction = async () => {
    if (!actionTarget) return;
    const { user: targetUser, action } = actionTarget;

    try {
      if (action === 'delete') {
        await userApi.deleteAdmin(targetUser.id, currentUser?.id);
        toast.success(`Administrator "${targetUser.name}" has been removed.`);
      } else if (action === 'suspend') {
        await userApi.updateUserStatus(targetUser.id, 'suspended', currentUser || undefined);
        toast.warning(`Administrator "${targetUser.name}" has been suspended.`);
      } else if (action === 'activate') {
        await userApi.updateUserStatus(targetUser.id, 'active', currentUser || undefined);
        toast.success(`Administrator "${targetUser.name}" has been activated.`);
      }
      setActionTarget(null);
      await fetchAdmins();
    } catch (err: any) {
      toast.error(err.message || 'Action failed.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-lime-500/15 border border-lime-500/30 text-lime-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
                Administrator Accounts
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-lime-500/10 text-lime-400 border border-lime-500/30">
                  {admins.length} Total
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Manage administrative personnel, credentials, governance status, and access permissions
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-[#0c0e12] bg-lime-400 hover:bg-lime-300 rounded-xl shadow-lg shadow-lime-500/20 transition-all active:scale-95"
        >
          <UserPlus className="w-4 h-4" />
          Add Administrator
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#15181f] border border-[#232a37] rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Administrators</p>
            <p className="text-2xl font-black text-white mt-1">{admins.length}</p>
            <span className="text-[11px] text-lime-400 font-medium">All registered admin staff</span>
          </div>
          <div className="p-3 rounded-2xl bg-lime-500/10 text-lime-400 border border-lime-500/20">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-[#15181f] border border-[#232a37] rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Status</p>
            <p className="text-2xl font-black text-lime-400 mt-1">{activeCount}</p>
            <span className="text-[11px] text-slate-400 font-medium">Authorized to access console</span>
          </div>
          <div className="p-3 rounded-2xl bg-lime-500/10 text-lime-400 border border-lime-500/20">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-[#15181f] border border-[#232a37] rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Suspended Status</p>
            <p className="text-2xl font-black text-rose-400 mt-1">{suspendedCount}</p>
            <span className="text-[11px] text-slate-400 font-medium">Access revoked / locked</span>
          </div>
          <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <ShieldAlert className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-[#15181f] p-4 rounded-2xl border border-[#232a37] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {(['all', 'active', 'suspended'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition ${
                statusFilter === s
                  ? 'bg-lime-400 text-[#0c0e12] shadow-sm shadow-lime-500/30'
                  : 'bg-[#1c212b] hover:bg-[#252c3a] text-slate-300 border border-[#2a3243]'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="relative flex items-center max-w-sm w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5" />
          <input
            type="text"
            placeholder="Search admins by name, email, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2 text-xs bg-[#111318] border border-[#2a3243] text-white rounded-xl focus:outline-none focus:border-lime-400 focus:ring-1 focus:ring-lime-400/30 placeholder-slate-500 transition"
          />
        </div>
      </div>

      {/* Admins Table */}
      <div className="bg-[#15181f] rounded-2xl border border-[#232a37] shadow-xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading administrator directory...</div>
        ) : filteredAdmins.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">No administrator records found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-[#111318] border-b border-[#232a37] text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Administrator</th>
                  <th className="py-3 px-4">Role Privileges</th>
                  <th className="py-3 px-4">Contact Phone</th>
                  <th className="py-3 px-4">Access Status</th>
                  <th className="py-3 px-4">Date Joined</th>
                  <th className="py-3 px-4 text-right">Moderation Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#232a37]">
                {filteredAdmins.map((admin) => {
                  const isCurrent = currentUser?.id === admin.id;
                  const isSuspended = admin.status === 'suspended';

                  return (
                    <tr
                      key={admin.id}
                      className="hover:bg-[#1a202c]/60 transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={admin.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'}
                            alt=""
                            className="w-9 h-9 rounded-xl object-cover border border-[#2d3648] shrink-0"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white block">{admin.name}</span>
                              {isCurrent && (
                                <span className="text-[10px] bg-lime-500/20 text-lime-300 border border-lime-500/40 px-1.5 py-0.2 rounded font-bold">
                                  You
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-400 font-mono">{admin.email}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-lime-500/10 text-lime-400 border border-lime-500/30">
                          <Shield className="w-3 h-3" />
                          Platform Super Admin
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-slate-300">
                        {admin.phone || '+251 90 000 0000'}
                      </td>

                      <td className="py-3.5 px-4">
                        {isSuspended ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                            <Ban className="w-3 h-3" /> Suspended
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-lime-500/15 text-lime-400 border border-lime-500/30">
                            <CheckCircle2 className="w-3 h-3" /> Active
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-slate-400">
                        {new Date(admin.createdAt).toLocaleDateString()}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Suspend / Activate Button */}
                          <button
                            type="button"
                            disabled={isCurrent}
                            onClick={() =>
                              setActionTarget({
                                user: admin,
                                action: isSuspended ? 'activate' : 'suspend',
                              })
                            }
                            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                              isCurrent
                                ? 'opacity-40 cursor-not-allowed bg-slate-800 text-slate-500'
                                : isSuspended
                                ? 'bg-lime-400/20 text-lime-300 hover:bg-lime-400/30 border border-lime-500/40'
                                : 'bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 border border-amber-500/30'
                            }`}
                            title={isCurrent ? 'Cannot alter your own status' : undefined}
                          >
                            {isSuspended ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Activate
                              </>
                            ) : (
                              <>
                                <Ban className="w-3.5 h-3.5" />
                                Suspend
                              </>
                            )}
                          </button>

                          {/* Delete Admin Button */}
                          <button
                            type="button"
                            disabled={isCurrent}
                            onClick={() => setActionTarget({ user: admin, action: 'delete' })}
                            className={`p-1.5 rounded-lg transition-all ${
                              isCurrent
                                ? 'opacity-40 cursor-not-allowed text-slate-600'
                                : 'text-slate-400 hover:text-rose-400 hover:bg-rose-500/10'
                            }`}
                            title={isCurrent ? 'Cannot remove your own account' : 'Remove Administrator'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add New Admin Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#15181f] rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-[#2e3748] animate-in fade-in zoom-in-95 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#232a37]">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-lime-500/15 text-lime-400 border border-lime-500/30">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">Create New Administrator</h3>
                  <p className="text-[11px] text-slate-400">Provision admin credentials and governance access</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAdmin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Full Name *
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={newAdminName}
                    onChange={(e) => setNewAdminName(e.target.value)}
                    placeholder="e.g. Dawit Bekele"
                    className="w-full pl-10 pr-3 py-2.5 text-xs bg-[#101217] text-white rounded-xl border border-[#2a3243] focus:border-lime-400 focus:outline-none focus:ring-1 focus:ring-lime-400/30"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Email Address / Username *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                    placeholder="admin.name@marketplace.com"
                    className="w-full pl-10 pr-3 py-2.5 text-xs bg-[#101217] text-white rounded-xl border border-[#2a3243] focus:border-lime-400 focus:outline-none focus:ring-1 focus:ring-lime-400/30"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="tel"
                    value={newAdminPhone}
                    onChange={(e) => setNewAdminPhone(e.target.value)}
                    placeholder="+251 91 123 4567"
                    className="w-full pl-10 pr-3 py-2.5 text-xs bg-[#101217] text-white rounded-xl border border-[#2a3243] focus:border-lime-400 focus:outline-none focus:ring-1 focus:ring-lime-400/30"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Admin Password *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    value={newAdminPassword}
                    onChange={(e) => setNewAdminPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-3 py-2.5 text-xs bg-[#101217] text-white rounded-xl border border-[#2a3243] focus:border-lime-400 focus:outline-none focus:ring-1 focus:ring-lime-400/30"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">Credentials will grant immediate management privileges</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Privilege Role Level
                </label>
                <select
                  value={newAdminRoleType}
                  onChange={(e) => setNewAdminRoleType(e.target.value as any)}
                  className="w-full px-3 py-2.5 text-xs bg-[#101217] text-white rounded-xl border border-[#2a3243] focus:border-lime-400 focus:outline-none"
                >
                  <option value="super_admin">Platform Super Admin (Full Governance)</option>
                  <option value="moderator">Catalog & Customer Moderator</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#232a37]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl hover:bg-[#1f2533] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2.5 bg-lime-400 hover:bg-lime-300 text-[#0c0e12] text-xs font-bold rounded-xl shadow-lg shadow-lime-500/20 transition disabled:opacity-50"
                >
                  {formSubmitting ? 'Creating...' : 'Save & Authorize Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Action Confirmation Modal (Suspend, Activate, Delete) */}
      {actionTarget && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#15181f] rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-[#2e3748] animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-center gap-3">
              <div
                className={`p-3 rounded-2xl ${
                  actionTarget.action === 'delete'
                    ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                    : actionTarget.action === 'suspend'
                    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                    : 'bg-lime-500/15 text-lime-400 border border-lime-500/30'
                }`}
              >
                {actionTarget.action === 'delete' ? (
                  <Trash2 className="w-5 h-5" />
                ) : actionTarget.action === 'suspend' ? (
                  <Ban className="w-5 h-5" />
                ) : (
                  <CheckCircle2 className="w-5 h-5" />
                )}
              </div>
              <div>
                <h3 className="font-bold text-base text-white capitalize">
                  {actionTarget.action === 'delete'
                    ? 'Remove Administrator'
                    : `${actionTarget.action} Administrator Account`}
                </h3>
                <span className="text-xs text-slate-400 font-mono">{actionTarget.user.email}</span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {actionTarget.action === 'delete' && (
                <>
                  Are you sure you want to permanently remove administrator{' '}
                  <strong className="text-white">"{actionTarget.user.name}"</strong>? This will revoke all
                  system credentials and cannot be undone.
                </>
              )}
              {actionTarget.action === 'suspend' && (
                <>
                  Are you sure you want to suspend administrator{' '}
                  <strong className="text-white">"{actionTarget.user.name}"</strong>? They will be locked out
                  of the central administration console until re-activated.
                </>
              )}
              {actionTarget.action === 'activate' && (
                <>
                  Re-activate administrator <strong className="text-white">"{actionTarget.user.name}"</strong>?
                  They will regain full governance access immediately.
                </>
              )}
            </p>

            <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#232a37]">
              <button
                type="button"
                onClick={() => setActionTarget(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl hover:bg-[#1f2533] transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAction}
                className={`px-5 py-2 text-xs font-bold rounded-xl shadow-lg transition ${
                  actionTarget.action === 'delete'
                    ? 'bg-rose-600 hover:bg-rose-500 text-white'
                    : actionTarget.action === 'suspend'
                    ? 'bg-amber-500 hover:bg-amber-400 text-black'
                    : 'bg-lime-400 hover:bg-lime-300 text-black shadow-lime-500/20'
                }`}
              >
                {actionTarget.action === 'delete'
                  ? 'Confirm Removal'
                  : actionTarget.action === 'suspend'
                  ? 'Confirm Suspension'
                  : 'Confirm Activation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
