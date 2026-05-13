import { useState } from 'react';
import { X, AlertTriangle, ShieldCheck, Stethoscope, Lock } from 'lucide-react';
import Button from '../ui/Button';
import { parqApi } from '../../services/parq.api';
import toast from 'react-hot-toast';

// The 7 PARQ questions in the exact order expected by the backend validator.
// `key` matches the schema in `backend/src/validators/parq.validator.js`.
const QUESTIONS = [
  {
    key: 'heartCondition',
    label: "Votre médecin vous a-t-il dit que vous souffrez d'un problème cardiaque ?",
  },
  {
    key: 'chestPain',
    label: 'Ressentez-vous des douleurs thoraciques à l\'effort ?',
  },
  {
    key: 'dizziness',
    label: "Avez-vous eu des étourdissements, pertes d'équilibre ou de connaissance récemment ?",
  },
  {
    key: 'jointProblems',
    label: "Souffrez-vous d'un problème osseux ou articulaire susceptible d'être aggravé par l'activité physique ?",
  },
  {
    key: 'bloodPressureMeds',
    label: 'Prenez-vous des médicaments pour la tension artérielle ou pour le cœur ?',
  },
  {
    key: 'otherMedicalReason',
    label: "Y a-t-il d'autres raisons médicales pour lesquelles vous ne devriez pas faire d'activité physique ?",
  },
  {
    key: 'pregnancy',
    label: 'Êtes-vous enceinte ou avez-vous accouché dans les 3 derniers mois ?',
  },
];

/**
 * PARQ (Physical Activity Readiness Questionnaire) modal.
 * Displayed before the first appointment booking (and on annual renewal).
 *
 * - All answers "no" → success state, then `onComplete({ canBook: true })`
 * - Any answer "yes" → warning state with recommendation to consult a doctor.
 *   The user may still submit (`coachCleared` defaults to false, the coach
 *   must validate participation before the booking is allowed).
 *
 * Props:
 *  - onClose: () => void — dismiss without completing
 *  - onComplete: ({ canBook, hasRisk }) => void — fired after a successful submit
 */
export default function PARQModal({ onClose, onComplete }) {
  const [answers, setAnswers] = useState({});
  const [step, setStep] = useState('form'); // 'form' | 'warning' | 'success'
  const [submitting, setSubmitting] = useState(false);

  const allAnswered = QUESTIONS.every((q) => typeof answers[q.key] === 'boolean');
  const hasRisk = QUESTIONS.some((q) => answers[q.key] === true);

  const setAnswer = (key, value) =>
    setAnswers((prev) => ({ ...prev, [key]: value }));

  const handleReview = (e) => {
    e.preventDefault();
    if (!allAnswered) {
      toast.error('Merci de répondre à toutes les questions.');
      return;
    }
    setStep(hasRisk ? 'warning' : 'success');
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await parqApi.submit(answers);
      // canBook = true only if no risk was declared. If risk → coach must clear.
      onComplete?.({ canBook: !hasRisk, hasRisk });
      if (hasRisk) {
        toast.success('Questionnaire enregistré. Votre coach doit valider votre participation.');
      } else {
        toast.success('Questionnaire validé. Vous pouvez réserver votre séance.');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Erreur lors de l'envoi du questionnaire");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div
        className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-surface rounded-2xl border border-surface-border overflow-hidden"
        style={{ boxShadow: 'var(--shadow-modal)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-surface-border shrink-0">
          <div className="flex items-center gap-2.5">
            <Stethoscope className="w-5 h-5 text-primary-600" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Questionnaire santé (PAR-Q)
              </h2>
              <p className="text-xs text-gray-500">
                Avant votre première séance — renouvellement annuel
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/[0.05] transition-colors"
            aria-label="Fermer"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {step === 'form' && (
            <form id="parq-form" onSubmit={handleReview} className="p-5 space-y-4">
              <div className="flex items-start gap-3 p-4 bg-primary-50 border border-primary-100 rounded-xl text-sm text-primary-700">
                <Lock className="w-4 h-4 shrink-0 mt-0.5" />
                <p>
                  Vos réponses sont <strong>chiffrées</strong> et confidentielles.
                  Elles ne sont jamais transmises à votre employeur ou aux RH.
                </p>
              </div>

              <ul className="space-y-3">
                {QUESTIONS.map((q, idx) => (
                  <li
                    key={q.key}
                    className="p-4 rounded-xl border border-gray-200 bg-white/[0.02]"
                  >
                    <p className="text-sm font-medium text-gray-900 mb-3">
                      <span className="text-gray-500 mr-2">{idx + 1}.</span>
                      {q.label}
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setAnswer(q.key, true)}
                        className={`flex-1 h-10 rounded-lg text-sm font-medium border-2 transition-all ${
                          answers[q.key] === true
                            ? 'border-amber-400 bg-amber-50 text-amber-700'
                            : 'border-gray-200 text-gray-500 hover:border-gray-300'
                        }`}
                      >
                        Oui
                      </button>
                      <button
                        type="button"
                        onClick={() => setAnswer(q.key, false)}
                        className={`flex-1 h-10 rounded-lg text-sm font-medium border-2 transition-all ${
                          answers[q.key] === false
                            ? 'border-primary-500 bg-primary-50 text-primary-700'
                            : 'border-gray-200 text-gray-500 hover:border-gray-300'
                        }`}
                      >
                        Non
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </form>
          )}

          {step === 'warning' && (
            <div className="p-5 space-y-4">
              <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-700">
                    Recommandation médicale
                  </p>
                  <p className="text-xs text-amber-700 mt-1">
                    Nous vous recommandons de consulter votre médecin avant de débuter
                    une activité physique. Votre coach devra valider votre participation
                    avant que vous puissiez réserver votre première séance.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-gray-200 bg-white/[0.03]">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Récapitulatif
                </p>
                <ul className="space-y-1.5">
                  {QUESTIONS.filter((q) => answers[q.key] === true).map((q) => (
                    <li key={q.key} className="text-xs text-gray-700 flex gap-2">
                      <span className="text-amber-500">•</span>
                      <span>{q.label}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <p className="text-xs text-gray-500">
                En continuant, vos réponses seront enregistrées de manière
                chiffrée. Votre coach recevra une notification pour valider votre
                participation.
              </p>
            </div>
          )}

          {step === 'success' && (
            <div className="p-5 space-y-4">
              <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
                <ShieldCheck className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-green-700">
                    Aucun risque identifié
                  </p>
                  <p className="text-xs text-green-700 mt-1">
                    Vos réponses indiquent qu'il n'y a pas de contre-indication à
                    la pratique d'une activité physique. Vous pouvez procéder à
                    votre réservation.
                  </p>
                </div>
              </div>
              <p className="text-xs text-gray-500">
                Ce questionnaire est valable un an. Vous serez invité à le
                renouveler à son expiration.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-5 border-t border-surface-border shrink-0">
          {step === 'form' && (
            <>
              <Button variant="secondary" className="flex-1" onClick={onClose}>
                Annuler
              </Button>
              <Button
                type="submit"
                form="parq-form"
                className="flex-1"
                disabled={!allAnswered}
              >
                Continuer
              </Button>
            </>
          )}

          {step === 'warning' && (
            <>
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setStep('form')}
                disabled={submitting}
              >
                Modifier mes réponses
              </Button>
              <Button
                variant="primary"
                className="flex-1"
                onClick={handleSubmit}
                loading={submitting}
              >
                Enregistrer et continuer
              </Button>
            </>
          )}

          {step === 'success' && (
            <>
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setStep('form')}
                disabled={submitting}
              >
                Revenir
              </Button>
              <Button
                variant="primary"
                className="flex-1"
                onClick={handleSubmit}
                loading={submitting}
              >
                Valider et réserver
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
