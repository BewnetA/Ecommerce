import React from 'react';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const norm = status?.toLowerCase() || 'pending';
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  let colorClasses = 'bg-slate-100 text-slate-700 border-slate-200';

  if (norm === 'approved' || norm === 'active' || norm === 'published' || norm === 'resolved') {
    colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  } else if (norm === 'pending') {
    colorClasses = 'bg-amber-50 text-amber-700 border-amber-200';
  } else if (norm === 'rejected' || norm === 'suspended' || norm === 'dismissed') {
    colorClasses = 'bg-rose-50 text-rose-700 border-rose-200';
  }

  const label = norm.charAt(0).toUpperCase() + norm.slice(1);

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${sizeClasses} ${colorClasses}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
          norm === 'approved' || norm === 'active' || norm === 'resolved'
            ? 'bg-emerald-500'
            : norm === 'pending'
            ? 'bg-amber-500'
            : 'bg-rose-500'
        }`}
      />
      {label}
    </span>
  );
};
