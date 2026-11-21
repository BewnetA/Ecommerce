import React, { useEffect, useState } from 'react';
import { CheckCircle2, Flag, Info, AlertTriangle, X } from 'lucide-react';
import { reportsApi } from '../../services/api';
import { MAX_REPORT_DETAILS_LENGTH } from '../../services/api/reportsApi';
import type { Product, ReportReasonCode, User } from '../../types';
import { REPORT_REASONS } from '../../utils/members';

interface ReportListingModalProps {
  product: Pick<Product, 'id' | 'name' | 'sellerId'>;
  reporter: User;
  onClose: () => void;
}

/**
 * Community-based listing report form. Submitting only creates a moderation
 * record for the admin team — it never hides or removes the listing.
 */
export const ReportListingModal: React.FC<ReportListingModalProps> = ({ product, reporter, onClose }) => {
  const [reasonCode, setReasonCode] = useState<ReportReasonCode | ''>('');
  const [details, setDetails] = useState('');
  const [showReasonError, setShowReasonError] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [alreadyReported, setAlreadyReported] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    reportsApi
      .hasOpenReport(product.id, reporter)
      .then((exists) => {
        if (!cancelled) setAlreadyReported(exists);
      })
      .catch(() => {
        // The backend still prevents duplicates if this check fails.
      })
      .finally(() => {
        if (!cancelled) setIsChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [product.id, reporter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Prevent accidental repeated submissions.
    if (isSubmitting || submitted) return;
    if (!reasonCode) {
      setShowReasonError(true);
      return;
    }
    setIsSubmitting(true);
    setError('');
    try {
      await reportsApi.submitListingReport({ product, reporter, reasonCode, details });
      setSubmitted(true);
    } catch (err: any) {
      const message = err.message || 'Could not submit your report. Please try again.';
      setError(message);
      if (message.toLowerCase().includes('already reported')) setAlreadyReported(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="report-title">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 id="report-title" className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Flag className="w-4 h-4 text-rose-600" /> Report Listing
            </h3>
            <p className="text-xs text-slate-500 mt-1 truncate max-w-[18rem]">{product.name}</p>
          </div>
          <button onClick={onClose} disabled={isSubmitting} className="text-slate-400 hover:text-slate-600 rounded-lg p-1 disabled:opacity-40" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        {isChecking ? (
          <div className="py-10 flex justify-center">
            <div className="w-8 h-8 border-3 border-rose-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : submitted ? (
          <div className="py-6 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
            <p className="text-sm font-bold text-slate-900">Report submitted</p>
            <p className="text-xs text-slate-500">
              Thank you. Our moderation team will review this listing and take action if needed.
            </p>
            <button onClick={onClose} className="mt-2 px-5 py-2 bg-[#75C96B] hover:bg-[#65b85b] text-[#202226] text-xs font-bold rounded-xl">
              Done
            </button>
          </div>
        ) : alreadyReported ? (
          <div className="py-4 space-y-4">
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex gap-2">
              <Info className="w-4 h-4 shrink-0" />
              <span>You have already reported this listing. Our moderation team will review it — there is no need to report it again.</span>
            </div>
            <div className="flex justify-end">
              <button onClick={onClose} className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl">
                Close
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4" noValidate>
            <fieldset>
              <legend className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Why are you reporting this listing? *
              </legend>
              <div className="space-y-1.5">
                {REPORT_REASONS.map((r) => (
                  <label
                    key={r.code}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition ${
                      reasonCode === r.code ? 'border-rose-400 bg-rose-50 text-rose-900 font-semibold' : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="report-reason"
                      value={r.code}
                      checked={reasonCode === r.code}
                      disabled={isSubmitting}
                      onChange={() => {
                        setReasonCode(r.code);
                        setShowReasonError(false);
                      }}
                      className="accent-rose-600"
                    />
                    {r.label}
                  </label>
                ))}
              </div>
              {showReasonError && <p className="text-xs text-rose-600 mt-1.5">Please select a reason for your report.</p>}
            </fieldset>

            <div>
              <label htmlFor="report-details" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Additional details {reasonCode === 'other' ? '(recommended)' : '(optional)'}
              </label>
              <textarea
                id="report-details"
                rows={3}
                maxLength={MAX_REPORT_DETAILS_LENGTH}
                disabled={isSubmitting}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Tell the moderation team what is wrong with this listing"
                className="w-full text-xs rounded-xl border border-slate-200 p-2.5 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
              <p className="text-[10px] text-slate-400 text-right">
                {details.length}/{MAX_REPORT_DETAILS_LENGTH}
              </p>
            </div>

            <p className="text-[11px] text-slate-500 flex gap-1.5">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              Reports are reviewed by the Addis Repair moderation team. Reporting does not remove the listing automatically.
            </p>

            {error && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex gap-2" role="alert">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button type="button" onClick={onClose} disabled={isSubmitting} className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-xl disabled:opacity-40">
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl shadow-xs disabled:opacity-60"
              >
                {isSubmitting ? 'Submitting…' : 'Submit Report'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
