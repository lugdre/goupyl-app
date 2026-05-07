import { cn } from '../../utils/cn';

export default function Card({ children, className = '', style: propStyle = {}, ...props }) {
  return (
    <div
      className={cn(className)}
      style={{
        background: '#ffffff',
        border: '1px solid rgba(0,0,0,0.09)',
        borderRadius: 4,
        padding: '20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        ...propStyle,
      }}
      {...props}
    >
      {children}
    </div>
  );
}
