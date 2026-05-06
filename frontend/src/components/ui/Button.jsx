import { cn } from '../../utils/cn';
import { Loader2 } from 'lucide-react';

const variants = {
  primary: 'bg-primary-500 text-white hover:bg-primary-400 active:bg-primary-300 shadow-[0_1px_2px_rgba(0,0,0,0.3)]',
  secondary: 'bg-white/[0.06] text-primary-300 hover:bg-white/[0.10] border border-white/[0.10]',
  success: 'bg-nature-700 text-white hover:opacity-90 active:opacity-80',
  accent: 'bg-accent-600 text-white hover:opacity-90 active:opacity-80',
  ghost: 'bg-transparent text-gray-500 border border-white/[0.10] hover:bg-white/[0.05] active:bg-white/[0.08]',
  danger: 'bg-red-600 text-white hover:bg-red-500 active:bg-red-400',
};

const sizes = {
  sm: 'px-3.5 py-1.5 text-[13px] font-medium',
  md: 'px-5 py-2.5 text-[15px] font-medium',
  lg: 'px-6 py-3 text-base font-medium',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className = '',
  ...props
}) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-xl transition-all duration-150',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0E0F18]',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        'select-none',
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
      {children}
    </button>
  );
}
