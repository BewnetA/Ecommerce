import React, { useState, useEffect } from 'react';
import {
  Search,
  Eye,
  MapPin,
} from 'lucide-react';
import { userApi } from '../../services/api';
import type { BuyerWithDetails } from '../../services/api';

export const BuyerManagementPage: React.FC = () => {
  const [buyers, setBuyers] = useState<BuyerWithDetails[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [detailsTarget, setDetailsTarget] = useState<BuyerWithDetails | null>(null);

  const fetchBuyers = async () => {
    try {
      setLoading(true);
      const list = await userApi.getAllBuyers();
      setBuyers(list);
    } catch (err) {
      console.error('Failed to load buyers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBuyers();
  }, []);

  const filtered = buyers.filter((b) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      b.user.name.toLowerCase().includes(q) ||
      b.user.email.toLowerCase().includes(q) ||
      b.user.phone.includes(q) ||
      (b.profile.deliveryAddress && b.profile.deliveryAddress.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Registered Buyers & Customers</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            View customer accounts, inquiry frequency, and delivery location profiles
          </p>
        </div>

        <div className="relative flex items-center max-w-xs w-full">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3" />
          <input
            type="text"
            placeholder="Search buyers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading customers...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">No buyers found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Phone Number</th>
                  <th className="py-3 px-4">Delivery Area</th>
                  <th className="py-3 px-4">Inquiries Started</th>
                  <th className="py-3 px-4">Registered Date</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((b) => (
                  <tr key={b.user.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={b.user.avatarUrl}
                          alt=""
                          className="w-9 h-9 rounded-xl object-cover border border-slate-100 shrink-0"
                        />
                        <div>
                          <span className="font-bold text-slate-900 block">{b.user.name}</span>
                          <span className="text-[11px] text-slate-500">{b.user.email}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 font-mono">{b.user.phone}</td>

                    <td className="py-3 px-4">
                      {b.profile.deliveryCity || b.profile.deliverySubcity ? (
                        <span className="flex items-center gap-1 text-slate-800">
                          <MapPin className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span className="truncate max-w-[150px]">
                            {b.profile.deliverySubcity
                              ? `${b.profile.deliverySubcity}, `
                              : ''}
                            {b.profile.deliveryCity || 'Addis Ababa'}
                          </span>
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Not specified</span>
                      )}
                    </td>

                    <td className="py-3 px-4 font-semibold text-slate-800">
                      {b.inquiryCount} {b.inquiryCount === 1 ? 'inquiry' : 'inquiries'}
                    </td>

                    <td className="py-3 px-4 text-slate-500">
                      {new Date(b.user.createdAt).toLocaleDateString()}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => setDetailsTarget(b)}
                        className="p-1.5 text-slate-500 hover:text-indigo-600 rounded-lg hover:bg-slate-100 transition"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Buyer Detail Modal */}
      {detailsTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <img
                  src={detailsTarget.user.avatarUrl}
                  alt=""
                  className="w-12 h-12 rounded-xl object-cover"
                />
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    {detailsTarget.user.name}
                  </h3>
                  <span className="text-xs text-indigo-600 font-semibold uppercase">
                    Customer Account
                  </span>
                </div>
              </div>
              <button onClick={() => setDetailsTarget(null)} className="text-slate-400">
                ✕
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-slate-600">
              <p>
                <strong>Email:</strong> {detailsTarget.user.email}
              </p>
              <p>
                <strong>Phone:</strong> {detailsTarget.user.phone}
              </p>
              <p>
                <strong>Registration Date:</strong>{' '}
                {new Date(detailsTarget.user.createdAt).toLocaleString()}
              </p>
              <p>
                <strong>Total Inquiries Sent:</strong> {detailsTarget.inquiryCount}
              </p>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <strong className="block text-slate-800">Saved Delivery Information:</strong>
                <p>Address: {detailsTarget.profile.deliveryAddress || 'Not set'}</p>
                <p>City: {detailsTarget.profile.deliveryCity || 'Addis Ababa'}</p>
                <p>Subcity: {detailsTarget.profile.deliverySubcity || 'None'}</p>
                {detailsTarget.profile.deliveryNotes && (
                  <p className="italic">Notes: "{detailsTarget.profile.deliveryNotes}"</p>
                )}
                {detailsTarget.profile.locationCoordinates && (
                  <p className="font-mono text-[10px]">
                    GPS: {detailsTarget.profile.locationCoordinates.latitude.toFixed(4)},{' '}
                    {detailsTarget.profile.locationCoordinates.longitude.toFixed(4)}
                  </p>
                )}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setDetailsTarget(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl"
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
