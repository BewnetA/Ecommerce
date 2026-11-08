import React from 'react';
import { CheckCircle2, XCircle, X } from 'lucide-react';

export interface ActionAlertState {
  isOpen: boolean;
  type: 'success' | 'error';
  title: string;
  message: string;
}

interface ActionAlertModalProps {
  isOpen: boolean;
  type?: 'success' | 'error';
  title: string;
  message: string;
  onClose: () => void;
}

export const ActionAlertModal: React.FC<ActionAlertModalProps> = ({
  isOpen,
  type = 'success',
  title,
  message,
  onClose,
}) => {
  if (!isOpen) return null;

  const isSuccess = type === 'success';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl border border-slate-100 text-center space-y-4 relative animate-in zoom-in-95 duration-150">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition"
        >
          <X className="w-4 h-4" />
        </button>

        <div
          className={`w-14 h-14 rounded-2xl mx-auto flex items-center justify-center ${
            isSuccess ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
          }`}
        >
          {isSuccess ? <CheckCircle2 className="w-8 h-8" /> : <XCircle className="w-8 h-8" />}
        </div>

        <div className="space-y-1.5">
          <h3 className="text-base font-bold text-slate-900">{title}</h3>
          <p className="text-xs text-slate-500 leading-relaxed">{message}</p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-white shadow-xs transition ${
            isSuccess ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-900 hover:bg-slate-800'
          }`}
        >
          Continue
        </button>
      </div>
    </div>
  );
};

