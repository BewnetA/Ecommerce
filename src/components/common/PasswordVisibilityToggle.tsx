import React from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface PasswordVisibilityToggleProps {
  /** Whether the password is currently shown as plain text. */
  visible: boolean;
  onToggle: () => void;
  /** Match the colors of a dark or light form. */
  tone?: 'dark' | 'light';
}

/**
 * Eye button placed inside a password field (the field's wrapper must be
 * `relative`, and the input needs right padding such as `pr-10`).
 * Toggles between showing and hiding the typed password.
 */
export const PasswordVisibilityToggle: React.FC<PasswordVisibilityToggleProps> = ({
  visible,
  onToggle,
  tone = 'light',
}) => {
  const label = visible ? 'Hide password' : 'Show password';
  const colors =
    tone === 'dark'
      ? 'text-slate-500 hover:text-lime-400 focus-visible:ring-lime-400/40'
      : 'text-slate-400 hover:text-slate-700 focus-visible:ring-[#75C96B]/40';

  return (
    <button
      type="button"
      onClick={onToggle}
      // Keep the cursor in the password field while toggling.
      onMouseDown={(e) => e.preventDefault()}
      aria-label={label}
      aria-pressed={visible}
      title={label}
      className={`absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md transition focus:outline-none focus-visible:ring-2 ${colors}`}
    >
      {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
    </button>
  );
};
