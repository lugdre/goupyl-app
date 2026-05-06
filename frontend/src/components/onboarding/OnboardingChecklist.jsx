import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, Circle, ChevronDown, ChevronUp, X, Sparkles } from 'lucide-react';

/**
 * steps: Array<{ id, label, description, to, done }>
 * storageKey: string — localStorage key to remember dismissal
 * title: string
 * subtitle: string
 */
export default function OnboardingChecklist({ steps, storageKey, title, subtitle }) {
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(storageKey) === 'true'
  );
  const [collapsed, setCollapsed] = useState(false);

  const completedCount = steps.filter((s) => s.done).length;
  const allDone = completedCount === steps.length;

  const handleDismiss = () => {
    localStorage.setItem(storageKey, 'true');
    setDismissed(true);
  };

  if (dismissed) return null;

  const progress = Math.round((completedCount / steps.length) * 100);

  return (
    <div className="rounded-2xl border border-primary-500/20 bg-gradient-to-br from-primary-600/10 to-[#14152A] overflow-hidden mb-6">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary-500/15 rounded-xl flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-primary-400" />
          </div>
          <div>
            <p className="font-semibold text-white">{title}</p>
            <p className="text-sm text-gray-500">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-primary-300 hidden sm:block">
            {completedCount}/{steps.length} étapes
          </span>
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="p-1.5 rounded-lg hover:bg-white/[0.05] text-gray-500 transition-colors"
          >
            {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
          <button
            onClick={handleDismiss}
            className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-colors"
            title="Masquer ce guide"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-white/[0.05] mx-5 rounded-full overflow-hidden mb-1">
        <div
          className="h-full bg-primary-500 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-xs text-primary-400 font-medium px-5 pb-3">
        {allDone ? 'Tout est configuré !' : `${progress}% complété`}
      </p>

      {/* Steps */}
      {!collapsed && (
        <div className="px-5 pb-5 space-y-2">
          {steps.map((step, i) => (
            <div
              key={step.id}
              className={`flex items-start gap-3 p-3 rounded-xl transition-colors ${
                step.done ? 'bg-green-500/5' : 'bg-white/[0.03] border border-white/[0.07] hover:border-primary-500/30'
              }`}
            >
              <div className="shrink-0 mt-0.5">
                {step.done ? (
                  <CheckCircle className="w-5 h-5 text-green-400" />
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-gray-500 flex items-center justify-center">
                    <span className="text-[10px] font-bold text-gray-500">{i + 1}</span>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${step.done ? 'text-green-400 line-through' : 'text-white'}`}>
                  {step.label}
                </p>
                {!step.done && step.description && (
                  <p className="text-xs text-gray-500 mt-0.5">{step.description}</p>
                )}
              </div>
              {!step.done && step.to && (
                <Link
                  to={step.to}
                  className="shrink-0 text-xs font-semibold text-primary-400 hover:text-primary-300 bg-primary-500/10 hover:bg-primary-500/15 px-3 py-1.5 rounded-lg transition-colors"
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
