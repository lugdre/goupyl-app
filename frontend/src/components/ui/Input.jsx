export default function Input({ label, error, id, className = '', style: propStyle = {}, ...props }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && (
        <label htmlFor={id} style={{ fontSize: 12, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', fontFamily: '"JetBrains Mono", monospace', color: 'var(--color-gray-500)' }}>
          {label}
        </label>
      )}
      <input
        id={id}
        className={className}
        style={{
          width: '100%', height: 42, padding: '0 14px',
          fontSize: 14, fontFamily: "'Inter Tight', sans-serif",
          background: 'var(--color-surface)',
          border: error ? '1px solid #dc2626' : '1px solid var(--color-gray-300)',
          borderRadius: 4, color: 'var(--color-gray-900)',
          outline: 'none', transition: 'border-color .15s',
          ...propStyle,
        }}
        onFocus={e => { e.currentTarget.style.borderColor = error ? '#dc2626' : 'var(--color-primary-500)'; e.currentTarget.style.boxShadow = error ? '0 0 0 3px rgba(220,38,38,0.08)' : '0 0 0 3px rgba(108,115,232,0.15)'; }}
        onBlur={e => { e.currentTarget.style.borderColor = error ? '#dc2626' : 'var(--color-gray-300)'; e.currentTarget.style.boxShadow = 'none'; }}
        {...props}
      />
      {error && <p style={{ fontSize: 12, color: '#dc2626', fontWeight: 500 }}>{error}</p>}
    </div>
  );
}
