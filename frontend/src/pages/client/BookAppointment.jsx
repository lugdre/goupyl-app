import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { userApi } from '../../services/user.api';
import { coachServiceApi } from '../../services/coachService.api';
import { appointmentApi } from '../../services/appointment.api';
import { parqApi } from '../../services/parq.api';
import { companyApi } from '../../services/company.api';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import SlotPicker from '../../components/booking/SlotPicker';
import PARQModal from '../../components/booking/PARQModal';
import { MapPin, ArrowLeft, Building2, Clock, Zap, Leaf, Heart, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import { CATEGORY_LABELS } from '../../utils/constants';

const CATEGORY_ICONS = {
  SPORT: Zap,
  NUTRITION: Leaf,
  MENTAL: Heart,
  BIENETRE: Heart,
};

const CATEGORY_BADGE_COLORS = {
  SPORT: 'bg-primary-50 text-primary-700',
  NUTRITION: 'bg-green-50 text-green-700',
  MENTAL: 'bg-purple-50 text-purple-700',
  BIENETRE: 'bg-orange-50 text-orange-700',
};

export default function BookAppointment() {
  const { intervenantId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [intervenant, setIntervenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);

  const isSalarie = !!user?.employerCompanyId;

  // Quota mensuel de séances couvertes par l'entreprise (salariés). Le canal
  // de réservation est le même pour tous (prestations du coach) : s'il reste
  // du quota la séance est prise en charge, sinon elle est à la charge du client.
  const [quota, setQuota] = useState(null);

  const [coachServices, setCoachServices] = useState([]);
  const [selectedCoachServiceId, setSelectedCoachServiceId] = useState(null);

  const [scheduledAt, setScheduledAt] = useState('');
  const [notes, setNotes] = useState('');

  // PARQ (health questionnaire) gating state.
  // `parqStatus` is null while loading; afterwards it is the API response.
  // `showParq` controls modal visibility.
  const [parqStatus, setParqStatus] = useState(null);
  const [showParq, setShowParq] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [{ data: iv }, { data: parq }, { data: svcs }] = await Promise.all([
          userApi.getIntervenantById(intervenantId),
          parqApi.getStatus(),
          coachServiceApi.getByIntervenant(intervenantId),
        ]);
        setIntervenant(iv);
        setParqStatus(parq);
        setCoachServices(svcs);

        if (isSalarie) {
          try {
            setQuota((await companyApi.getMyQuota()).data);
          } catch {
            // pas d'abonnement employeur actif → séances à la charge du client
          }
        }
      } catch {
        toast.error('Erreur de chargement');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [intervenantId, isSalarie]);

  const selectedCoachService = coachServices.find((s) => s.id === selectedCoachServiceId);

  // La séance sera-t-elle prise en charge par l'entreprise ? (le serveur
  // reste la source de vérité au moment de la création)
  const willBeCovered = isSalarie && quota?.quota != null && quota.remaining > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!scheduledAt) { toast.error('Choisissez une date'); return; }
    if (!selectedCoachServiceId) {
      toast.error('Sélectionnez un service');
      return;
    }

    // PARQ gate: questionnaire must be completed (and not expired) before any
    // booking. If risk was declared, the coach must clear participation first.
    if (!parqStatus || !parqStatus.completed || parqStatus.expired) {
      setShowParq(true);
      return;
    }
    if (parqStatus.hasRisk && !parqStatus.coachCleared) {
      toast.error(
        "Votre coach doit valider votre participation avant que vous puissiez réserver."
      );
      return;
    }

    setBooking(true);
    try {
      const { data: created } = await appointmentApi.create({
        intervenantId: parseInt(intervenantId),
        coachServiceId: selectedCoachServiceId,
        scheduledAt: new Date(scheduledAt).toISOString(),
        notes: notes || undefined,
      });

      toast.success(
        created.coveredByCompany
          ? 'Rendez-vous réservé — séance prise en charge par votre entreprise !'
          : 'Rendez-vous réservé !'
      );
      navigate('/dashboard/client/appointments');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de la réservation');
    } finally {
      setBooking(false);
    }
  };

  if (loading) return <Spinner />;
  if (!intervenant) return <div className="text-gray-500">Professionnel non trouvé.</div>;

  const durationMinutes = selectedCoachService?.durationMinutes || 60;

  return (
    <div className="space-y-6 max-w-2xl">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="w-4 h-4" />
        Retour
      </button>

      <h1 className="text-2xl font-semibold text-gray-900">Réserver une séance</h1>

      {/* Profil intervenant */}
      <Card>
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-brand-50 rounded-full flex items-center justify-center shrink-0 text-brand-800 font-bold">
            {intervenant.firstName[0]}{intervenant.lastName[0]}
          </div>
          <div className="flex-1">
            <p className="font-semibold text-gray-900">{intervenant.firstName} {intervenant.lastName}</p>
            {intervenant.profile?.city && (
              <p className="text-sm text-gray-500 flex items-center gap-1">
                <MapPin className="w-3 h-3" />{intervenant.profile.city}
              </p>
            )}
            {intervenant.profile?.bio && (
              <p className="text-sm text-gray-600 mt-1">{intervenant.profile.bio}</p>
            )}
          </div>
        </div>
      </Card>

      {/* Prise en charge entreprise (salariés) — même canal de réservation */}
      {willBeCovered && (
        <div className="bg-primary-50 border border-primary-100 rounded-xl px-4 py-3 text-sm text-primary-700 space-y-1">
          <div className="flex items-center gap-3">
            <Building2 className="w-4 h-4 shrink-0" />
            <span>Cette séance sera prise en charge par le forfait de votre entreprise</span>
          </div>
          <p className="font-medium pl-7">
            Séances couvertes restantes ce mois : {quota.remaining} / {quota.quota}
          </p>
        </div>
      )}

      {/* Quota épuisé : la séance est à la charge du salarié */}
      {isSalarie && !willBeCovered && quota?.quota != null && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
          <Building2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            Votre quota mensuel de séances couvertes est atteint ({quota.used} / {quota.quota}).
            Cette séance sera à votre charge.
          </span>
        </div>
      )}

      {/* Prestations du coach */}
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-3">Choisissez un service</label>
          {coachServices.length === 0 ? (
            <Card>
              <p className="text-sm text-gray-500 text-center py-4">
                Ce professionnel n'a pas encore configuré ses services.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {coachServices.map((svc) => {
                const isSelected = selectedCoachServiceId === svc.id;
                const Icon = CATEGORY_ICONS[svc.category] || Zap;
                const badgeColor = CATEGORY_BADGE_COLORS[svc.category] || 'bg-gray-50 text-gray-700';
                return (
                  <button
                    key={svc.id}
                    type="button"
                    onClick={() => { setSelectedCoachServiceId(svc.id); setScheduledAt(''); }}
                    className={`text-left p-4 rounded-xl border-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-primary-600 bg-primary-50 shadow-md ring-2 ring-primary-200'
                        : 'border-gray-200 hover:border-primary-300 hover:shadow-sm'
                    }`}
                  >
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${badgeColor}`}>
                      <Icon className="w-3 h-3" />
                      {CATEGORY_LABELS[svc.category] || svc.category}
                    </span>
                    <p className="font-semibold text-lg text-gray-900 mt-2">{svc.name}</p>
                    {svc.description && (
                      <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{svc.description}</p>
                    )}
                    <div className="flex items-center justify-between mt-3">
                      <span className="flex items-center gap-1 text-sm text-gray-500">
                        <Clock className="w-4 h-4" />
                        {svc.durationMinutes} min
                      </span>
                      <span className="text-xl font-bold text-gray-900">{Number(svc.price).toFixed(2)} €</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
      </div>

      {/* Slot picker — shown once a service is chosen */}
      {selectedCoachServiceId && (
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Choisissez un créneau
          </label>
          <SlotPicker
            intervenantId={parseInt(intervenantId)}
            durationMinutes={durationMinutes}
            selectedSlot={scheduledAt}
            onSelect={setScheduledAt}
            fetchClientBusy
          />
          {scheduledAt && (
            <p className="text-xs text-gray-500 mt-2">
              Créneau sélectionné :{' '}
              <span className="font-medium text-gray-900">
                {new Date(scheduledAt).toLocaleDateString('fr-FR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </p>
          )}
        </div>
      )}

      {/* Confirmation form — shown once a slot is picked */}
      {scheduledAt && (
        <Card>
          <form onSubmit={handleSubmit} className="space-y-4">
            {selectedCoachService && (
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-900">{selectedCoachService.name}</p>
                {willBeCovered ? (
                  <p className="text-sm font-semibold text-primary-600">Couvert par votre entreprise</p>
                ) : (
                  <p className="text-sm font-semibold text-gray-900">
                    {Number(selectedCoachService.price).toFixed(2)} €
                  </p>
                )}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Notes (optionnel)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Informations utiles pour votre séance..."
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none"
                rows={3}
              />
            </div>

            {/* PARQ status banner — informs the client what will happen on submit */}
            {parqStatus && (!parqStatus.completed || parqStatus.expired) && (
              <div className="flex items-start gap-3 p-3 rounded-xl bg-primary-50 border border-primary-100 text-xs text-primary-700">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <p>
                  Un court questionnaire santé (PAR-Q) vous sera proposé avant
                  la confirmation de cette première réservation.
                </p>
              </div>
            )}
            {parqStatus?.completed && !parqStatus.expired && parqStatus.hasRisk && !parqStatus.coachCleared && (
              <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-700">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <p>
                  Votre questionnaire santé indique un risque potentiel. La
                  réservation sera possible une fois que votre coach aura validé
                  votre participation.
                </p>
              </div>
            )}

            <Button type="submit" loading={booking} className="w-full">
              Confirmer la réservation
            </Button>
          </form>
        </Card>
      )}

      {showParq && (
        <PARQModal
          onClose={() => setShowParq(false)}
          onComplete={({ canBook, hasRisk }) => {
            // Refresh local PARQ status with what the user just submitted so we
            // don't need a second round-trip. The backend record is the source
            // of truth — but for UX we mirror it client-side.
            setParqStatus({
              completed: true,
              expired: false,
              hasRisk,
              coachCleared: false,
              canBook,
            });
            setShowParq(false);
          }}
        />
      )}
    </div>
  );
}
