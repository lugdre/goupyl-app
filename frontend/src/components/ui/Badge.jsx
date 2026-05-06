import { cn } from '../../utils/cn';

const variants = {
  CONFIRMED: 'bg-green-500/15 text-green-300',
  PENDING: 'bg-amber-500/15 text-amber-300',
  CANCELLED: 'bg-red-500/15 text-red-300',
  DONE: 'bg-gray-400/15 text-gray-400',
  SPORT: 'bg-primary-500/15 text-primary-300',
  NUTRITION: 'bg-nature-700/20 text-green-300',
  MENTAL: 'bg-mental-600/20 text-purple-300',
  BIENETRE: 'bg-accent-600/20 text-orange-300',
  ELITE: 'bg-accent-600/20 text-orange-300',
  ACTIVE: 'bg-green-500/15 text-green-300',
  EXPIRED: 'bg-gray-400/15 text-gray-400',
  CLIENT: 'bg-blue-500/15 text-blue-300',
  INTERVENANT: 'bg-primary-500/15 text-primary-300',
  ADMIN: 'bg-red-500/15 text-red-300',
  ENTREPRISE: 'bg-amber-500/15 text-amber-300',
};

export default function Badge({ children, variant = 'PENDING', className = '' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide uppercase',
        variants[variant] || 'bg-gray-400/15 text-gray-400',
        className
      )}
    >
      {children}
    </span>
  );
}
