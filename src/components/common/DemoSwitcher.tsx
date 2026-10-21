import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext';
import {
  ShieldAlert,
  Store,
  Clock,
  Ban,
  UserCheck,
  RefreshCw,
  LogOut,
  ChevronDown,
  Sparkles,
} from 'lucide-react';

export const DemoSwitcher: React.FC = () => {
  const { user, demoUsers, switchUser, logout, resetAllDemoData } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const navigate = useNavigate();

  const handleSelectUser = async (userId: string) => {
    setIsOpen(false);
    const target = demoUsers.find((d) => d.user.id === userId);
    await switchUser(userId);
    if (target?.user.role === 'admin') {
      navigate('/admin');
    } else if (
      target?.user.role === 'seller' &&
      target.sellerStatus !== 'rejected' &&
      target.user.status !== 'rejected'
    ) {
      navigate('/seller/dashboard');
    } else {
      navigate('/buyer/dashboard');
    }
  };

  const handleLogout = async () => {
    setIsOpen(false);
    await logout();
    navigate('/');
  };

  const handleResetData = async () => {
    if (window.confirm('Reset all demo data back to original seeded state? Any newly created products or messages will be restored to defaults.')) {
      setIsResetting(true);
      try {
        await resetAllDemoData();
        setIsOpen(false);
        navigate('/');
      } finally {
        setIsResetting(false);
      }
    }
  };

  const getRoleIcon = (role: string, sellerStatus?: string) => {
    if (role === 'admin') return <ShieldAlert className="w-4 h-4 text-purple-600" />;
    if (role === 'buyer') return <UserCheck className="w-4 h-4 text-blue-600" />;
    if (sellerStatus === 'pending') return <Clock className="w-4 h-4 text-amber-500" />;
    if (sellerStatus === 'rejected') return <Ban className="w-4 h-4 text-rose-500" />;
    if (sellerStatus === 'suspended') return <Ban className="w-4 h-4 text-red-700" />;
    return <Store className="w-4 h-4 text-emerald-600" />;
  };

  return (
    <div className="relative inline-block text-left">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-xl bg-[#292C31] text-white hover:bg-[#363A40] shadow-sm transition border border-[#363A40]"
      >
        <span className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[#75C96B]" />
          <span className="hidden sm:inline">Role:</span>
          <span className="text-[#75C96B] font-bold">
            {user ? user.name.split(' ')[0] : 'Guest'}
          </span>
          {user && (
            <span className="uppercase text-[9px] sm:text-[10px] tracking-wider bg-white/15 px-1.5 py-0.5 rounded-sm">
              {user.role}
            </span>
          )}
        </span>
        <ChevronDown className="w-3.5 h-3.5 opacity-80" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-2xl bg-white shadow-2xl border border-slate-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-4 py-2 border-b border-slate-100">
            <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Quick Role Switcher
            </p>
            <p className="text-[11px] text-slate-500">
              Instantly test and inspect different user workflows
            </p>
          </div>

          <div className="max-h-72 overflow-y-auto p-1 divide-y divide-slate-50">
            {demoUsers.map((item) => {
              const isActive = user?.id === item.user.id;
              return (
                <button
                  key={item.user.id}
                  onClick={() => handleSelectUser(item.user.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl transition flex items-start gap-2.5 ${
                    isActive ? 'bg-[#EEF9EC] text-[#1E4D1A] font-semibold' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="mt-0.5">{getRoleIcon(item.user.role, item.sellerStatus)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold truncate">{item.label}</span>
                      {item.sellerStatus && (
                        <span
                          className={`text-[9px] uppercase px-1.5 py-0.2 rounded font-bold ${
                            item.sellerStatus === 'approved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : item.sellerStatus === 'pending'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {item.sellerStatus}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 leading-tight mt-0.5 line-clamp-1">
                      {item.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="p-1 border-t border-slate-100 space-y-1">
            {user && (
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition"
              >
                <LogOut className="w-3.5 h-3.5 text-slate-400" />
                <span>Switch to Guest (Log out)</span>
              </button>
            )}

            <button
              onClick={handleResetData}
              disabled={isResetting}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-amber-700 bg-amber-50/70 hover:bg-amber-100 rounded-xl transition"
            >
              <span className="flex items-center gap-2">
                <RefreshCw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
                <span>Reset Demo Data</span>
              </span>
              <span className="text-[10px] text-amber-600 font-semibold">Defaults</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
