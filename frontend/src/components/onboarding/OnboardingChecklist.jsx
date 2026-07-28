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
      background: '#fff',
      border: '1px solid #E4E2DC',
      borderRadius: 16,
      overflow: 'hidden',
      fontFamily: '"Inter", system-ui, sans-serif',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px 0' }}>
        <div>
          <p style={{ fontWeight: 700, fontSize: 15.5, letterSpacing: '-.01em', color: '#171614', margin: 0 }}>{title}</p>
          <p style={{ fontSize: 13, color: '#8a8781', marginTop: 3 }}>{subtitle}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#8a8781' }}>
            {completedCount}/{steps.length}
          </span>
          <button
            onClick={() => setCollapsed(c => !c)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 999, border: '1px solid #E4E2DC', background: '#fff', cursor: 'pointer', color: '#8a8781' }}
          >
            {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 4, background: '#F0EFEB', borderRadius: 999, margin: '14px 22px 6px', overflow: 'hidden' }}>
        <div style={{ height: '100%', background: '#F4530F', borderRadius: 999, width: `${progress}%`, transition: 'width .5s ease' }} />
      </div>
      <p style={{ fontSize: 11.5, fontWeight: 600, color: '#8a8781', letterSpacing: '.08em', textTransform: 'uppercase', padding: '0 22px 14px', margin: 0 }}>
        {allDone ? 'Tout est configuré' : `${progress}% complété`}
      </p>

      {/* Steps */}
      {!collapsed && (
        <div style={{ padding: '0 22px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {steps.map((step, i) => (
            <div
              key={step.id}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 12, padding: '13px 16px',
                background: step.done ? '#EAF3EC' : '#FAF9F7',
                border: step.done ? '1px solid #CDE4D3' : '1px solid #E4E2DC',
                borderRadius: 12,
              }}
            >
              <div style={{ flexShrink: 0, marginTop: 1 }}>
                {step.done ? (
                  <CheckCircle style={{ width: 16, height: 16, color: '#2F7A47' }} />
                ) : (
                  <div style={{
                    width: 18, height: 18, borderRadius: '50%',
                    border: '1.5px solid #c9c7c1',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#8a8781' }}>{i + 1}</span>
                  </div>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  fontSize: 13.5, fontWeight: 600, margin: 0, color: step.done ? '#2F7A47' : '#171614',
                  textDecoration: step.done ? 'line-through' : 'none',
                }}>
                  {step.label}
                </p>
                {!step.done && step.description && (
                  <p style={{ fontSize: 12.5, color: '#8a8781', marginTop: 3 }}>{step.description}</p>
                )}
              </div>
              {!step.done && step.to && (
                <Link
                  to={step.to}
                  style={{
                    flexShrink: 0, fontSize: 12.5, fontWeight: 600,
                    textDecoration: 'none',
                    color: '#fff', background: '#F4530F',
                    padding: '7px 15px', borderRadius: 999,
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
