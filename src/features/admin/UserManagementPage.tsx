import React, { useState, useEffect } from 'react';
import {
  Search,
  Shield,
  Store,
  UserCheck,
} from 'lucide-react';
import { userApi } from '../../services/api';
import type { User, UserRole, AccountStatus } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';

export const UserManagementPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<AccountStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const [suspendTarget, setSuspendTarget] = useState<User | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const list = await userApi.getAllUsers();
      setUsers(list);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filtered = users.filter((u) => {
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;
    if (statusFilter !== 'all' && u.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.phone.includes(q)
      );
    }
    return true;
  });

  const handleToggleStatus = async (userToUpdate: User) => {
    if (userToUpdate.status === 'suspended') {
      try {
        await userApi.updateUserStatus(userToUpdate.id, 'active');
        await fetchUsers();
      } catch (err: any) {
        alert(err.message || 'Status update failed.');
      }
    } else {
      setSuspendTarget(userToUpdate);
    }
  };

  const handleSuspendConfirm = async () => {
    if (!suspendTarget) return;
    try {
      await userApi.updateUserStatus(suspendTarget.id, 'suspended');
      setSuspendTarget(null);
      await fetchUsers();
    } catch (err: any) {
      alert(err.message || 'Status update failed.');
    }
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
            <Shield className="w-3 h-3" /> Admin
          </span>
        );
      case 'seller':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
            <Store className="w-3 h-3" /> Seller
          </span>
        );
      case 'buyer':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
            <UserCheck className="w-3 h-3" /> Buyer
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Unified User Directory</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            View all account records across administrator, merchant, and customer roles
          </p>
        </div>
      </div>

      {/* Filter and search bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {/* Role Filter */}
          <div className="flex items-center gap-1">
            {(['all', 'admin', 'seller', 'buyer'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize whitespace-nowrap transition ${
                  roleFilter === r
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-600'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-700 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="rejected">Rejected</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>

        <div className="relative flex items-center max-w-xs w-full">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3" />
          <input
            type="text"
            placeholder="Search by name, email, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading user accounts...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">No user accounts found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Phone Number</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Created Date</th>
                  <th className="py-3 px-4 text-right">Moderation Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={u.avatarUrl}
                          alt=""
                          className="w-9 h-9 rounded-xl object-cover border border-slate-100 shrink-0"
                        />
                        <div>
                          <span className="font-bold text-slate-900 block">{u.name}</span>
                          <span className="text-[11px] text-slate-500 font-mono">{u.email}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">{getRoleBadge(u.role)}</td>

                    <td className="py-3 px-4 font-mono">{u.phone}</td>

                    <td className="py-3 px-4">
                      <StatusBadge status={u.status} size="sm" />
                    </td>

                    <td className="py-3 px-4 text-slate-500">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>

                    <td className="py-3 px-4 text-right">
                      {u.role !== 'admin' && (
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(u)}
                          className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                            u.status === 'suspended'
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                          }`}
                        >
                          {u.status === 'suspended' ? 'Activate Account' : 'Suspend Account'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={Boolean(suspendTarget)}
        title="Suspend User Account"
        message={`Are you sure you want to suspend "${suspendTarget?.name}"? They will be locked out of platform features.`}
        confirmLabel="Suspend"
        isDestructive
        onConfirm={handleSuspendConfirm}
        onCancel={() => setSuspendTarget(null)}
      />
    </div>
  );
};
