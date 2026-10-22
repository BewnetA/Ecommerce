import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  requiresReason?: boolean;
  reasonPlaceholder?: string;
  onConfirm: (reason?: string) => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDestructive = false,
  requiresReason = false,
  reasonPlaceholder = 'Enter reason...',
  onConfirm,
  onCancel,
}) => {
  const [reason, setReason] = React.useState('');
  const [error, setError] = React.useState('');

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (requiresReason && !reason.trim()) {
      setError('A reason is required to proceed.');
      return;
    }
    setError('');
    onConfirm(requiresReason ? reason.trim() : undefined);
    setReason('');
  };

  const handleClose = () => {
    setError('');
    setReason('');
    onCancel();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#15181f] rounded-2xl max-w-md w-full shadow-2xl border border-[#2a3243] overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-150">
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`p-2.5 rounded-xl ${
                  isDestructive ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30' : 'bg-lime-500/15 text-lime-400 border border-lime-500/30'
                }`}
              >
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">{title}</h3>
            </div>
            <button
              onClick={handleClose}
              className="text-slate-400 hover:text-white rounded-lg p-1 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <p className="mt-3 text-sm text-slate-300 leading-relaxed">{message}</p>

          {requiresReason && (
            <div className="mt-4">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Reason *
              </label>
              <textarea
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  if (error) setError('');
                }}
                rows={3}
                placeholder={reasonPlaceholder}
                className="w-full text-xs rounded-xl border border-[#2a3243] bg-[#101217] text-white p-3 focus:outline-none focus:ring-1 focus:ring-lime-400/40 focus:border-lime-400"
              />
              {error && <p className="text-xs text-rose-400 mt-1 font-medium">{error}</p>}
            </div>
          )}

          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white hover:bg-[#1f2533] rounded-xl transition"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className={`px-4 py-2 text-xs font-bold rounded-xl shadow-xs transition ${
                isDestructive
                  ? 'bg-rose-600 hover:bg-rose-500 text-white'
                  : 'bg-lime-400 hover:bg-lime-300 text-black shadow-lime-500/20'
              }`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
