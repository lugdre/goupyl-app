import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { appointmentApi } from '../../services/appointment.api';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import PaymentModal from '../../components/payment/PaymentModal';
import OnboardingChecklist from '../../components/onboarding/OnboardingChecklist';
import { userApi } from '../../services/user.api';
import { Calendar, Search, Clock, ArrowRight, CreditCard, CheckCircle } from 'lucide-react';
import { STATUS_LABELS } from '../../utils/constants';

export default function ClientDashboard() {
  const { user } = useAuth();
  const [upcomingRdv, setUpcomingRdv] = useState([]);
  const [loading, setLoading] = useState(true);
  const [payingRdv, setPayingRdv] = useState(null);
  const [freshProfile, setFreshProfile] = useState(null);
  const [hasEverBooked, setHasEverBooked] = useState(false);

  const fetchRdv = () => {
    Promise.all([
      appointmentApi.getMyAppointments({ page: 1, limit: 5, status: 'CONFIRMED' }),
      userApi.getMe(),
      appointmentApi.getMyAppointments({ page: 1, limit: 1 }),
    ])
      .then(([{ data: appts }, { data: me }, { data: any }]) => {
        setUpcomingRdv(appts.appointments);
        setFreshProfile(me);
        setHasEverBooked((any.appointments?.length || 0) > 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchRdv(); }, []);

  if (loading) return <Spinner />;

  const isSalarie = !!user.employerCompanyId;
  const hasPhone = !!(freshProfile?.phone);

  const onboardingSteps = isSalarie ? [
    {
      id: 'profile',
      label: 'Compléter votre profil',
      description: 'Ajoutez votre prénom, nom et téléphone.',
      to: '/dashboard/client/profile',
      done: hasPhone,
    },
    {
      id: 'plan',
      label: 'Consulter votre forfait entreprise',
      description: 'Découvrez votre quota mensuel de séances prises en charge.',
      to: '/dashboard/client/employer-plan',
      done: false,
    },
    {
      id: 'search',
      label: 'Trouver un professionnel',
      description: 'Explorez nos coachs sportifs, nutritionnistes et praticiens bien-être.',
      to: '/dashboard/client/search',
      done: hasEverBooked,
    },
  ] : [
    {
      id: 'profile',
      label: 'Compléter votre profil',
      description: 'Ajoutez votre prénom, nom et téléphone.',
      to: '/dashboard/client/profile',
      done: hasPhone,
    },
    {
      id: 'search',
      label: 'Trouver un professionnel',
      description: 'Parcourez nos coachs et choisissez celui qui vous correspond.',
      to: '/dashboard/client/search',
      done: hasEverBooked,
    },
    {
      id: 'book',
      label: 'Réserver votre première séance',
      description: 'Choisissez un service, une date et payez en ligne.',
      to: '/dashboard/client/search',
      done: hasEverBooked,
    },
  ];

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          Bonjour {user.firstName} !
        </h1>
        <p className="text-gray-500 mt-1">Voici un resume de votre activite.</p>
      </div>

      <OnboardingChecklist
        storageKey={`onboarding-client-${user.id}`}
        title="Bienvenue sur Goupyl Sport !"
        subtitle="Suivez ces étapes pour réserver votre première séance."
        steps={onboardingSteps}
      />

      {/* Actions rapides */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link to="/dashboard/client/search">
          <Card className="hover:border-brand-400 transition-colors cursor-pointer">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-brand-50 rounded-lg shrink-0">
                <Search className="w-6 h-6 text-brand-800" />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-gray-900">Trouver un professionnel</p>
                <p className="text-sm text-gray-500">Sport, nutrition, mental, bien-etre</p>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400 ml-auto shrink-0" />
            </div>
          </Card>
        </Link>
        <Link to="/dashboard/client/appointments">
          <Card className="hover:border-brand-400 transition-colors cursor-pointer">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-nature-50 rounded-lg shrink-0">
                <Calendar className="w-6 h-6 text-nature-700" />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-gray-900">Mes rendez-vous</p>
                <p className="text-sm text-gray-500">Historique et a venir</p>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400 ml-auto shrink-0" />
            </div>
          </Card>
        </Link>
      </div>

      {/* Prochains RDV */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Prochains rendez-vous</h2>
        {upcomingRdv.length === 0 ? (
          <Card>
            <div className="text-center py-6">
              <Calendar className="w-10 h-10 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">Aucun rendez-vous à venir</p>
              <Link to="/dashboard/client/search">
                <Button variant="secondary" size="sm" className="mt-3">
                  Réserver une séance
                </Button>
              </Link>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {upcomingRdv.map((rdv) => (
              <Card key={rdv.id}>
                <div className="flex items-start sm:items-center justify-between gap-3">
                  <div className="flex items-start sm:items-center gap-4">
                    <div className="p-2 bg-brand-50 rounded-lg shrink-0">
                      <Clock className="w-5 h-5 text-brand-800" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{rdv.coachService?.name || rdv.service?.name}</p>
                      <p className="text-sm text-gray-500">
                        Avec {rdv.intervenant.firstName} {rdv.intervenant.lastName}
                      </p>
                      <p className="text-sm text-gray-500">
                        {new Date(rdv.scheduledAt).toLocaleDateString('fr-FR', {
                          weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={rdv.status}>{STATUS_LABELS[rdv.status]}</Badge>
                    {rdv.paymentStatus === 'paid' ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2 py-1 rounded-lg">
                        <CreditCard className="w-3 h-3" /> Payé
                      </span>
                    ) : rdv.client?.employerCompanyId ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-primary-400">
                        <CheckCircle className="w-3 h-3" /> Couvert par forfait
                      </span>
                    ) : rdv.status === 'CONFIRMED' ? (
                      <Button size="sm" onClick={() => setPayingRdv(rdv)}>
                        <CreditCard className="w-3 h-3 mr-1" /> Payer
                      </Button>
                    ) : null}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {payingRdv && (
        <PaymentModal
          appointment={payingRdv}
          onClose={() => setPayingRdv(null)}
          onSuccess={() => { setPayingRdv(null); fetchRdv(); }}
        />
      )}
    </div>
  );
}
