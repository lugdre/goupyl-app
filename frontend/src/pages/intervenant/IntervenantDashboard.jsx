import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { appointmentApi } from '../../services/appointment.api';
import { userApi } from '../../services/user.api';
import { coachServiceApi } from '../../services/coachService.api';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import OnboardingChecklist from '../../components/onboarding/OnboardingChecklist';
import { Calendar, Clock } from 'lucide-react';
import { STATUS_LABELS } from '../../utils/constants';
import toast from 'react-hot-toast';

export default function IntervenantDashboard() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [hasServices, setHasServices] = useState(false);

  const fetchData = () => {
    Promise.all([
      appointmentApi.getMyAppointments({ page: 1, limit: 10, status: 'PENDING' }),
      userApi.getMe(),
      coachServiceApi.getMine(),
    ])
      .then(([{ data: appts }, { data: me }, { data: services }]) => {
        setAppointments(appts.appointments);
        setProfile(me);
        setHasServices(Array.isArray(services) ? services.filter(s => s.active).length > 0 : false);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(fetchData, []);

  const handleConfirm = async (id) => {
    try {
      await appointmentApi.updateStatus(id, 'CONFIRMED');
      toast.success('Séance confirmée');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur');
    }
  };

  const handleRefuse = async (id) => {
    try {
      await appointmentApi.updateStatus(id, 'CANCELLED');
      toast.success('Séance refusée');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur');
    }
  };

  const handleComplete = async (id) => {
    try {
      await appointmentApi.updateStatus(id, 'DONE');
      toast.success('RDV marque comme termine');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur');
    }
  };

  if (loading) return <Spinner />;

  const onboardingSteps = [
    {
      id: 'profile',
      label: 'Compléter votre profil',
      description: 'Ajoutez votre bio, ville et tarif pour attirer des clients.',
      to: '/dashboard/intervenant/profile',
      done: !!(profile?.profile?.bio && profile?.profile?.city),
    },
    {
      id: 'services',
      label: 'Créer vos services',
      description: 'Définissez vos prestations, durées et prix pour que les clients puissent réserver.',
      to: '/dashboard/intervenant/profile',
      done: hasServices,
    },
    {
      id: 'documents',
      label: 'Envoyer vos documents',
      description: "Diplômes et pièce d'identité requis pour activer votre profil.",
      to: '/dashboard/intervenant/documents',
      done: profile?.verificationStatus === 'VERIFIED',
    },
    {
      id: 'payments',
      label: 'Configurer les paiements',
      description: 'Connectez votre compte bancaire via Stripe pour recevoir vos paiements.',
      to: '/dashboard/intervenant/payments',
      done: profile?.stripeAccountStatus === 'active',
    },
  ];

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          Bonjour {user.firstName} !
        </h1>
        <p className="text-gray-500 mt-1">Vos rendez-vous en attente de confirmation</p>
      </div>

      <OnboardingChecklist
        storageKey={`onboarding-intervenant-${user.id}`}
        title="Bienvenue sur Goupyl Sport !"
        subtitle="Suivez ces étapes pour démarrer et recevoir vos premières réservations."
        steps={onboardingSteps}
      />

      {appointments.length === 0 ? (
        <Card>
          <div className="text-center py-8">
            <Calendar className="w-10 h-10 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">Aucun RDV en attente</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {appointments.map((rdv) => (
            <Card key={rdv.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-amber-50 rounded-lg shrink-0 mt-0.5">
                    <Clock className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{rdv.coachService?.name || rdv.service?.name}</p>
                    <p className="text-sm text-gray-500 flex items-center gap-2">
                      Client : {rdv.client.firstName} {rdv.client.lastName}
                      {rdv.client.employerCompanyId && (
                        <span className="text-xs font-semibold px-1.5 py-0.5 bg-primary-500/15 text-primary-400 rounded-md">
                          {rdv.client.employerCompany?.companyName || 'Entreprise'}
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(rdv.scheduledAt).toLocaleDateString('fr-FR', {
                        weekday: 'long', day: 'numeric', month: 'long',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                    {rdv.notes && (
                      <p className="text-xs text-gray-400 mt-1 italic">"{rdv.notes}"</p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <Badge variant={rdv.status}>{STATUS_LABELS[rdv.status]}</Badge>
                  {rdv.status === 'PENDING' && (
                    <div className="flex gap-1">
                      <Button size="sm" variant="success" onClick={() => handleConfirm(rdv.id)}>
                        Accepter
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => handleRefuse(rdv.id)}>
                        Refuser
                      </Button>
                    </div>
                  )}
                  {rdv.status === 'CONFIRMED' && (
                    <div className="flex flex-col items-end gap-1">
                      <Button
                        size="sm"
                        onClick={() => handleComplete(rdv.id)}
                        disabled={rdv.paymentStatus !== 'paid' && !rdv.client.employerCompanyId}
                        title={rdv.paymentStatus !== 'paid' && !rdv.client.employerCompanyId ? 'Le client doit payer avant de clôturer' : ''}
                      >
                        Terminer
                      </Button>
                      {rdv.paymentStatus !== 'paid' && !rdv.client.employerCompanyId && (
                        <span className="text-xs text-amber-600 font-medium">En attente de paiement</span>
                      )}
                      {rdv.client.employerCompanyId && (
                        <span className="text-xs text-primary-400 font-medium">Paiement via Goupyl Sport</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
