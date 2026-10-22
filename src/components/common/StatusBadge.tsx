import React from 'react';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const norm = status?.toLowerCase() || 'pending';
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  let colorClasses = 'bg-slate-800 text-slate-300 border-slate-700';

  if (norm === 'approved' || norm === 'active' || norm === 'published' || norm === 'resolved') {
    colorClasses = 'bg-lime-500/15 text-lime-400 border-lime-500/30';
  } else if (norm === 'pending') {
    colorClasses = 'bg-amber-500/15 text-amber-300 border-amber-500/30';
  } else if (norm === 'rejected' || norm === 'suspended' || norm === 'dismissed') {
    colorClasses = 'bg-rose-500/15 text-rose-400 border-rose-500/30';
  }

  const label = norm.charAt(0).toUpperCase() + norm.slice(1);

  return (
    <span
      className={`inline-flex items-center font-bold rounded-full border ${sizeClasses} ${colorClasses}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
          norm === 'approved' || norm === 'active' || norm === 'resolved'
            ? 'bg-lime-400 shadow-sm shadow-lime-500/50'
            : norm === 'pending'
            ? 'bg-amber-400'
            : 'bg-rose-500'
        }`}
      />
      {label}
    </span>
  );
};
