export default function Input({ label, error, id, className = '', style: propStyle = {}, ...props }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && (
        <label htmlFor={id} style={{ fontSize: 12, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', fontFamily: '"JetBrains Mono", monospace', color: '#555' }}>
          {label}
        </label>
      )}
      <input
        id={id}
        className={className}
        style={{
          width: '100%', height: 42, padding: '0 14px',
          fontSize: 14, fontFamily: "'Inter Tight', sans-serif",
          background: '#ffffff',
          border: error ? '1px solid #dc2626' : '1px solid rgba(0,0,0,0.14)',
          borderRadius: 4, color: '#0a0a0a',
          outline: 'none', transition: 'border-color .15s',
          ...propStyle,
        }}
        onFocus={e => { e.currentTarget.style.borderColor = error ? '#dc2626' : '#252d62'; e.currentTarget.style.boxShadow = error ? '0 0 0 3px rgba(220,38,38,0.08)' : '0 0 0 3px rgba(37,45,98,0.08)'; }}
        onBlur={e => { e.currentTarget.style.borderColor = error ? '#dc2626' : 'rgba(0,0,0,0.14)'; e.currentTarget.style.boxShadow = 'none'; }}
        {...props}
      />
      {error && <p style={{ fontSize: 12, color: '#dc2626', fontWeight: 500 }}>{error}</p>}
    </div>
  );
}
