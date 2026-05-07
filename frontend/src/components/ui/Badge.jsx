const variants = {
  CONFIRMED: { bg: 'rgba(74,124,89,0.12)', color: '#4A7C59', border: 'rgba(74,124,89,0.25)' },
  PENDING: { bg: 'rgba(217,119,6,0.10)', color: '#92400e', border: 'rgba(217,119,6,0.25)' },
  CANCELLED: { bg: 'rgba(220,38,38,0.10)', color: '#dc2626', border: 'rgba(220,38,38,0.20)' },
  DONE: { bg: 'rgba(0,0,0,0.05)', color: '#555', border: 'rgba(0,0,0,0.12)' },
  SPORT: { bg: 'rgba(37,45,98,0.08)', color: '#252d62', border: 'rgba(37,45,98,0.18)' },
  NUTRITION: { bg: 'rgba(74,124,89,0.10)', color: '#4A7C59', border: 'rgba(74,124,89,0.22)' },
  MENTAL: { bg: 'rgba(123,74,140,0.10)', color: '#7B4A8C', border: 'rgba(123,74,140,0.22)' },
  BIENETRE: { bg: 'rgba(196,149,106,0.12)', color: '#92400e', border: 'rgba(196,149,106,0.25)' },
  ELITE: { bg: 'rgba(196,149,106,0.12)', color: '#92400e', border: 'rgba(196,149,106,0.25)' },
  ACTIVE: { bg: 'rgba(74,124,89,0.12)', color: '#4A7C59', border: 'rgba(74,124,89,0.25)' },
  EXPIRED: { bg: 'rgba(0,0,0,0.05)', color: '#555', border: 'rgba(0,0,0,0.12)' },
  CLIENT: { bg: 'rgba(37,45,98,0.08)', color: '#252d62', border: 'rgba(37,45,98,0.18)' },
  INTERVENANT: { bg: 'rgba(74,124,89,0.10)', color: '#4A7C59', border: 'rgba(74,124,89,0.22)' },
  ADMIN: { bg: 'rgba(220,38,38,0.10)', color: '#dc2626', border: 'rgba(220,38,38,0.20)' },
  ENTREPRISE: { bg: 'rgba(196,149,106,0.12)', color: '#92400e', border: 'rgba(196,149,106,0.25)' },
};

const fallback = { bg: 'rgba(0,0,0,0.05)', color: '#555', border: 'rgba(0,0,0,0.12)' };

export default function Badge({ children, variant = 'PENDING', className = '' }) {
  const v = variants[variant] || fallback;
  return (
    <span
      className={className}
      style={{
        display: 'inline-flex', alignItems: 'center',
        padding: '2px 8px', borderRadius: 999,
        fontSize: 10, fontFamily: '"JetBrains Mono", monospace',
        fontWeight: 600, letterSpacing: '.10em', textTransform: 'uppercase',
        background: v.bg, color: v.color,
        border: `1px solid ${v.border}`,
      }}
    >
      {children}
    </span>
  );
}
