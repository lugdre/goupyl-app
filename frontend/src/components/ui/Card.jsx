import { cn } from '../../utils/cn';

export default function Card({ children, className = '', ...props }) {
  return (
    <div
      className={cn('bg-surface rounded-2xl p-5 border border-surface-border', className)}
      style={{ boxShadow: 'var(--shadow-card)' }}
      {...props}
    >
      {children}
    </div>
  );
}
