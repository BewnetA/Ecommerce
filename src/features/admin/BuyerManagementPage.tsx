import React, { useState, useEffect } from 'react';
import {
  Search,
  Eye,
  MapPin,
  Ban,
  CheckCircle2,
  Users,
  X,
  Phone,
  Mail,
  Calendar,
  MessageSquare,
} from 'lucide-react';
import { toast } from 'sonner';
import { userApi } from '../../services/api';
import type { BuyerWithDetails } from '../../services/api';
import { useAuth } from '../auth/AuthContext';

export const BuyerManagementPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [buyers, setBuyers] = useState<BuyerWithDetails[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [loading, setLoading] = useState(true);
  const [detailsTarget, setDetailsTarget] = useState<BuyerWithDetails | null>(null);

  const [confirmTarget, setConfirmTarget] = useState<{
    buyer: BuyerWithDetails;
    action: 'suspend' | 'activate';
  } | null>(null);

  const fetchBuyers = async () => {
    try {
      setLoading(true);
      const list = await userApi.getAllBuyers();
      setBuyers(list);
    } catch (err) {
      console.error('Failed to load buyers:', err);
      toast.error('Failed to load buyers directory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBuyers();
  }, []);

  const filtered = buyers.filter((b) => {
    if (statusFilter !== 'all' && b.user.status !== statusFilter) return false;
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      b.user.name.toLowerCase().includes(q) ||
      b.user.email.toLowerCase().includes(q) ||
      b.user.phone.includes(q) ||
      (b.profile.deliveryAddress && b.profile.deliveryAddress.toLowerCase().includes(q)) ||
      (b.profile.deliverySubcity && b.profile.deliverySubcity.toLowerCase().includes(q))
    );
  });

  const activeCount = buyers.filter((b) => b.user.status === 'active').length;
  const suspendedCount = buyers.filter((b) => b.user.status === 'suspended').length;

  const handleStatusChange = async () => {
    if (!confirmTarget) return;
    const { buyer, action } = confirmTarget;
    const targetStatus = action === 'suspend' ? 'suspended' : 'active';

    try {
      await userApi.updateUserStatus(buyer.user.id, targetStatus, currentUser || undefined);
      if (targetStatus === 'suspended') {
        toast.warning(`Buyer account "${buyer.user.name}" has been suspended.`);
      } else {
        toast.success(`Buyer account "${buyer.user.name}" has been activated.`);
      }

      setConfirmTarget(null);
      if (detailsTarget && detailsTarget.user.id === buyer.user.id) {
        setDetailsTarget({
          ...detailsTarget,
          user: {
            ...detailsTarget.user,
            status: targetStatus,
          },
        });
      }
      await fetchBuyers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update account status.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-lime-500/15 border border-lime-500/30 text-lime-400">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
              Registered Buyers & Customers
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-lime-500/10 text-lime-400 border border-lime-500/30">
                {buyers.length} Customers
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Review customer identities, activity frequency, delivery addresses, and account moderation status
            </p>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#15181f] border border-[#232a37] rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Buyers</p>
            <p className="text-2xl font-black text-white mt-1">{buyers.length}</p>
            <span className="text-[11px] text-slate-400 font-medium">Customer database</span>
          </div>
          <div className="p-3 rounded-2xl bg-[#1d232e] text-slate-300 border border-[#2d3648]">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-[#15181f] border border-[#232a37] rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Customers</p>
            <p className="text-2xl font-black text-lime-400 mt-1">{activeCount}</p>
            <span className="text-[11px] text-lime-400/80 font-medium">Authorized to purchase & chat</span>
          </div>
          <div className="p-3 rounded-2xl bg-lime-500/10 text-lime-400 border border-lime-500/20">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-[#15181f] border border-[#232a37] rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Suspended Buyers</p>
            <p className="text-2xl font-black text-rose-400 mt-1">{suspendedCount}</p>
            <span className="text-[11px] text-rose-400/80 font-medium">Locked out of buying</span>
          </div>
          <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <Ban className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
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
            placeholder="Search buyers by name, email, phone, location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2 text-xs bg-[#111318] border border-[#2a3243] text-white rounded-xl focus:outline-none focus:border-lime-400 focus:ring-1 focus:ring-lime-400/30 placeholder-slate-500 transition"
          />
        </div>
      </div>

      {/* Buyers Table */}
      <div className="bg-[#15181f] rounded-2xl border border-[#232a37] shadow-xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading customer accounts...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">No buyers matching filter found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-[#111318] border-b border-[#232a37] text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Contact Phone</th>
                  <th className="py-3 px-4">Delivery Location</th>
                  <th className="py-3 px-4">Inquiries</th>
                  <th className="py-3 px-4">Account Status</th>
                  <th className="py-3 px-4">Registered</th>
                  <th className="py-3 px-4 text-right">Moderation Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#232a37]">
                {filtered.map((b) => {
                  const isSuspended = b.user.status === 'suspended';

                  return (
                    <tr key={b.user.id} className="hover:bg-[#1a202c]/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={b.user.avatarUrl}
                            alt=""
                            className="w-9 h-9 rounded-xl object-cover border border-[#2d3648] shrink-0"
                          />
                          <div>
                            <span className="font-bold text-white block">{b.user.name}</span>
                            <span className="text-[11px] text-slate-400 font-mono">{b.user.email}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-slate-300">{b.user.phone}</td>

                      <td className="py-3.5 px-4">
                        {b.profile.deliveryCity || b.profile.deliverySubcity ? (
                          <span className="flex items-center gap-1 text-slate-300">
                            <MapPin className="w-3.5 h-3.5 text-lime-400 shrink-0" />
                            <span className="truncate max-w-[150px]">
                              {b.profile.deliverySubcity ? `${b.profile.deliverySubcity}, ` : ''}
                              {b.profile.deliveryCity || 'Addis Ababa'}
                            </span>
                          </span>
                        ) : (
                          <span className="text-slate-500 italic">Not specified</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 font-semibold text-slate-200">
                          <MessageSquare className="w-3 h-3 text-lime-400" />
                          {b.inquiryCount} {b.inquiryCount === 1 ? 'chat' : 'chats'}
                        </span>
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
                        {new Date(b.user.createdAt).toLocaleDateString()}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Suspend / Activate Button */}
                          <button
                            type="button"
                            onClick={() =>
                              setConfirmTarget({
                                buyer: b,
                                action: isSuspended ? 'activate' : 'suspend',
                              })
                            }
                            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                              isSuspended
                                ? 'bg-lime-400/20 text-lime-300 hover:bg-lime-400/30 border border-lime-500/40'
                                : 'bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 border border-rose-500/30'
                            }`}
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

                          {/* View Details Button */}
                          <button
                            type="button"
                            onClick={() => setDetailsTarget(b)}
                            className="p-1.5 text-slate-400 hover:text-lime-400 hover:bg-lime-500/10 rounded-lg transition"
                            title="View Customer Profile"
                          >
                            <Eye className="w-4 h-4" />
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

      {/* Confirmation Dialog for Suspend / Activate */}
      {confirmTarget && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#15181f] rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-[#2e3748] animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-center gap-3">
              <div
                className={`p-3 rounded-2xl ${
                  confirmTarget.action === 'suspend'
                    ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                    : 'bg-lime-500/15 text-lime-400 border border-lime-500/30'
                }`}
              >
                {confirmTarget.action === 'suspend' ? (
                  <Ban className="w-5 h-5" />
                ) : (
                  <CheckCircle2 className="w-5 h-5" />
                )}
              </div>
              <div>
                <h3 className="font-bold text-base text-white">
                  {confirmTarget.action === 'suspend' ? 'Suspend Buyer Account' : 'Activate Buyer Account'}
                </h3>
                <span className="text-xs text-slate-400 font-mono">{confirmTarget.buyer.user.email}</span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {confirmTarget.action === 'suspend' ? (
                <>
                  Are you sure you want to suspend customer{' '}
                  <strong className="text-white">"{confirmTarget.buyer.user.name}"</strong>? They will be
                  prevented from initiating inquiries, messaging sellers, or placing repair orders.
                </>
              ) : (
                <>
                  Activate customer <strong className="text-white">"{confirmTarget.buyer.user.name}"</strong>?
                  Their account will be immediately restored with standard purchasing privileges.
                </>
              )}
            </p>

            <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#232a37]">
              <button
                type="button"
                onClick={() => setConfirmTarget(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl hover:bg-[#1f2533] transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStatusChange}
                className={`px-5 py-2 text-xs font-bold rounded-xl shadow-lg transition ${
                  confirmTarget.action === 'suspend'
                    ? 'bg-rose-600 hover:bg-rose-500 text-white'
                    : 'bg-lime-400 hover:bg-lime-300 text-black shadow-lime-500/20'
                }`}
              >
                {confirmTarget.action === 'suspend' ? 'Confirm Suspension' : 'Confirm Activation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Buyer Detail Modal */}
      {detailsTarget && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#15181f] rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-[#2e3748] animate-in fade-in zoom-in-95 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#232a37]">
              <div className="flex items-center gap-3">
                <img
                  src={detailsTarget.user.avatarUrl}
                  alt=""
                  className="w-12 h-12 rounded-2xl object-cover border border-[#2d3648]"
                />
                <div>
                  <h3 className="font-bold text-base text-white">{detailsTarget.user.name}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-lime-400 font-bold uppercase tracking-wider">
                      Buyer Account
                    </span>
                    <span className="text-slate-600">•</span>
                    {detailsTarget.user.status === 'suspended' ? (
                      <span className="text-[10px] font-bold text-rose-400">Suspended</span>
                    ) : (
                      <span className="text-[10px] font-bold text-lime-400">Active</span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setDetailsTarget(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-lime-400 shrink-0" />
                <span className="text-slate-400">Email:</span>
                <span className="text-white font-mono">{detailsTarget.user.email}</span>
              </div>

              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-lime-400 shrink-0" />
                <span className="text-slate-400">Phone:</span>
                <span className="text-white font-mono">{detailsTarget.user.phone}</span>
              </div>

              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-lime-400 shrink-0" />
                <span className="text-slate-400">Registered:</span>
                <span className="text-white">
                  {new Date(detailsTarget.user.createdAt).toLocaleString()}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-lime-400 shrink-0" />
                <span className="text-slate-400">Inquiries Sent:</span>
                <span className="text-white font-bold">{detailsTarget.inquiryCount}</span>
              </div>

              <div className="p-4 bg-[#101217] rounded-2xl border border-[#232a37] space-y-1.5">
                <strong className="block text-white text-xs flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-lime-400" /> Saved Delivery Information:
                </strong>
                <p className="text-slate-300">
                  <span className="text-slate-500">Address:</span>{' '}
                  {detailsTarget.profile.deliveryAddress || 'Not set'}
                </p>
                <p className="text-slate-300">
                  <span className="text-slate-500">City / Subcity:</span>{' '}
                  {detailsTarget.profile.deliverySubcity
                    ? `${detailsTarget.profile.deliverySubcity}, `
                    : ''}
                  {detailsTarget.profile.deliveryCity || 'Addis Ababa'}
                </p>
                {detailsTarget.profile.deliveryNotes && (
                  <p className="text-slate-400 italic">
                    <span className="text-slate-500">Notes:</span> "{detailsTarget.profile.deliveryNotes}"
                  </p>
                )}
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-[#232a37]">
              {/* Suspend / Activate direct action in modal */}
              <button
                type="button"
                onClick={() => {
                  setConfirmTarget({
                    buyer: detailsTarget,
                    action: detailsTarget.user.status === 'suspended' ? 'activate' : 'suspend',
                  });
                }}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition ${
                  detailsTarget.user.status === 'suspended'
                    ? 'bg-lime-400/20 text-lime-300 hover:bg-lime-400/30 border border-lime-500/40'
                    : 'bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 border border-rose-500/30'
                }`}
              >
                {detailsTarget.user.status === 'suspended' ? 'Activate Account' : 'Suspend Account'}
              </button>

              <button
                onClick={() => setDetailsTarget(null)}
                className="px-4 py-2 bg-[#1f2533] hover:bg-[#283042] text-white text-xs font-semibold rounded-xl transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
