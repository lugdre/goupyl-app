import { cn } from '../../utils/cn';

export default function Input({ label, error, id, className = '', ...props }) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-white">
          {label}
        </label>
      )}
      <input
        id={id}
        className={cn(
          'w-full h-11 px-3.5 rounded-xl text-[15px] transition-all duration-150',
          'bg-white/[0.05] border border-white/[0.08]',
          'placeholder:text-gray-500 text-white',
          'focus:outline-none focus:bg-white/[0.08] focus:border-primary-500 focus:ring-3 focus:ring-primary-500/15',
          error
            ? 'bg-red-500/10 border-red-400 focus:ring-red-400/15 focus:border-red-400'
            : 'hover:bg-white/[0.07]',
          className
        )}
        {...props}
      />
      {error && <p className="text-[13px] text-red-400 font-medium">{error}</p>}
    </div>
  );
}
