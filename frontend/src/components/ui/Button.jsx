import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';

const variants = {
  primary: {
    style: { background: '#252d62', color: '#ffffff', borderColor: '#252d62' },
    hover: { background: '#1a2050', borderColor: '#1a2050' },
  },
  secondary: {
    style: { background: 'transparent', color: '#0a0a0a', borderColor: 'rgba(0,0,0,0.18)' },
    hover: { borderColor: '#0a0a0a' },
  },
  success: {
    style: { background: '#4A7C59', color: '#ffffff', borderColor: '#4A7C59' },
    hover: { opacity: 0.9 },
  },
  accent: {
    style: { background: '#252d62', color: '#ffffff', borderColor: '#252d62' },
    hover: { background: '#1a2050' },
  },
  ghost: {
    style: { background: 'transparent', color: '#555555', borderColor: 'rgba(0,0,0,0.12)' },
    hover: { color: '#0a0a0a', borderColor: 'rgba(0,0,0,0.30)' },
  },
  danger: {
    style: { background: '#dc2626', color: '#ffffff', borderColor: '#dc2626' },
    hover: { background: '#b91c1c' },
  },
};

const sizes = {
  sm: { height: 32, padding: '0 14px', fontSize: 12, letterSpacing: '.02em' },
  md: { height: 40, padding: '0 20px', fontSize: 13.5, letterSpacing: '.02em' },
  lg: { height: 48, padding: '0 26px', fontSize: 14, letterSpacing: '.02em' },
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className = '',
  style: propStyle = {},
  ...props
}) {
  const v = variants[variant] || variants.primary;
  const s = sizes[size] || sizes.md;

  return (
    <button
      className={cn('select-none', className)}
      disabled={disabled || loading}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
        height: s.height, padding: s.padding, fontSize: s.fontSize,
        fontFamily: "'Inter Tight', sans-serif", fontWeight: 600,
        letterSpacing: s.letterSpacing,
        borderRadius: 999, border: '1px solid transparent',
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled || loading ? 0.45 : 1,
        transition: 'background .15s, border-color .15s, color .15s',
        whiteSpace: 'nowrap',
        ...v.style,
        ...propStyle,
      }}
      onMouseOver={e => {
        if (!disabled && !loading && v.hover) {
          Object.assign(e.currentTarget.style, v.hover);
        }
      }}
      onMouseOut={e => {
        if (!disabled && !loading) {
          Object.assign(e.currentTarget.style, v.style, propStyle);
        }
      }}
      {...props}
    >
      {loading && <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} />}
      {children}
    </button>
  );
}
