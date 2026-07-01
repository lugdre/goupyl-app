import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';

export default function OnboardingChecklist({ steps, title, subtitle }) {
  const [collapsed, setCollapsed] = useState(false);

  const completedCount = steps.filter((s) => s.done).length;
  const allDone = completedCount === steps.length;
  const progress = Math.round((completedCount / steps.length) * 100);

  // Le guide disparait automatiquement une fois toutes les etapes terminees.
  // Il ne peut pas etre ferme manuellement : l'utilisateur doit d'abord
  // completer son profil.
  if (allDone) return null;

  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid rgba(0,0,0,0.09)',
      borderRadius: 4,
      overflow: 'hidden',
      marginBottom: 24,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px' }}>
        <div>
          <p style={{ fontFamily: "'Archivo Narrow', sans-serif", fontWeight: 700, fontSize: 16, color: '#0a0a0a', margin: 0 }}>{title}</p>
          <p style={{ fontSize: 13, color: '#555', marginTop: 2 }}>{subtitle}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, fontFamily: '"JetBrains Mono", monospace', color: '#555', letterSpacing: '.08em' }}>
            {completedCount}/{steps.length}
          </span>
          <button
            onClick={() => setCollapsed(c => !c)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 4, border: '1px solid rgba(0,0,0,0.10)', background: 'transparent', cursor: 'pointer', color: '#555' }}
          >
            {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 2, background: 'rgba(0,0,0,0.06)', margin: '0 20px 4px' }}>
        <div style={{ height: '100%', background: '#252d62', width: `${progress}%`, transition: 'width .5s ease' }} />
      </div>
      <p style={{ fontSize: 11, color: '#888', fontFamily: '"JetBrains Mono", monospace', letterSpacing: '.08em', padding: '0 20px 12px' }}>
        {allDone ? 'TOUT EST CONFIGURÉ' : `${progress}% COMPLÉTÉ`}
      </p>

      {/* Steps */}
      {!collapsed && (
        <div style={{ padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {steps.map((step, i) => (
            <div
              key={step.id}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px',
                background: step.done ? 'rgba(74,124,89,0.05)' : '#f8f8f6',
                border: step.done ? '1px solid rgba(74,124,89,0.15)' : '1px solid rgba(0,0,0,0.07)',
                borderRadius: 3,
              }}
            >
              <div style={{ flexShrink: 0, marginTop: 1 }}>
                {step.done ? (
                  <CheckCircle style={{ width: 16, height: 16, color: '#4A7C59' }} />
                ) : (
                  <div style={{
                    width: 16, height: 16, borderRadius: '50%',
                    border: '1.5px solid rgba(0,0,0,0.25)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: '#888', fontFamily: '"JetBrains Mono", monospace' }}>{i + 1}</span>
                  </div>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  fontSize: 13, fontWeight: 600, margin: 0, color: step.done ? '#4A7C59' : '#0a0a0a',
                  textDecoration: step.done ? 'line-through' : 'none',
                }}>
                  {step.label}
                </p>
                {!step.done && step.description && (
                  <p style={{ fontSize: 12, color: '#888', marginTop: 3 }}>{step.description}</p>
                )}
              </div>
              {!step.done && step.to && (
                <Link
                  to={step.to}
                  style={{
                    flexShrink: 0, fontSize: 11, fontWeight: 600, fontFamily: '"JetBrains Mono", monospace',
                    letterSpacing: '.08em', textTransform: 'uppercase', textDecoration: 'none',
                    color: '#252d62', background: 'rgba(37,45,98,0.08)',
                    padding: '5px 10px', borderRadius: 999,
                    border: '1px solid rgba(37,45,98,0.15)',
                  }}
                >
                  Commencer
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
