import { cn } from '../../utils/cn';

export default function Card({ children, className = '', style: propStyle = {}, ...props }) {
  return (
    <div
      className={cn(className)}
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-surface-border)',
        borderRadius: 4,
        padding: '20px',
        boxShadow: 'var(--shadow-card)',
        ...propStyle,
      }}
      {...props}
    >
      {children}
    </div>
  );
}
