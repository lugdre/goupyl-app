import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { subscriptionApi } from '../../services/subscription.api';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import { CreditCard, Search, ArrowRight, Phone, CheckCircle, BarChart2, BookOpen } from 'lucide-react';
import OnboardingChecklist from '../../components/onboarding/OnboardingChecklist';
import { userApi } from '../../services/user.api';
import { companyApi } from '../../services/company.api';
import { PLAN_LABELS, BILLING_CYCLE_LABELS } from '../../utils/constants';

const PLAN_FEATURES = {
  ZEN_ENTREPRISE:   { employees: '10',  sessions: '1/semaine', domains: 'Sport + Bien-être' },
  PULSE_ENTREPRISE: { employees: '50',  sessions: '2/semaine', domains: 'Tous les domaines' },
  BOOST_ENTREPRISE: { employees: '200', sessions: '4/semaine', domains: 'Tous les domaines' },
};

export default function EntrepriseDashboard() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [freshProfile, setFreshProfile] = useState(null);
  const [employeeCount, setEmployeeCount] = useState(0);

  useEffect(() => {
    Promise.all([
      subscriptionApi.getMine(),
      userApi.getMe(),
      companyApi.getEmployees(),
    ])
      .then(([{ data: sub }, { data: me }, { data: employees }]) => {
        setSubscription(sub.active);
        setFreshProfile(me);
        setEmployeeCount(Array.isArray(employees) ? employees.length : 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  const planInfo = subscription ? PLAN_FEATURES[subscription.plan] : null;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-semibold text-gray-900">
              {user.companyName || `${user.firstName} ${user.lastName}`}
            </h1>
            <Badge variant="ENTREPRISE">Entreprise</Badge>
          </div>
          <p className="text-gray-500">Espace bien-être entreprise · Goupyl Sport</p>
        </div>
      </div>

      <OnboardingChecklist
        storageKey={`onboarding-entreprise-${user.id}`}
        title="Bienvenue sur Goupyl Sport Entreprise !"
        subtitle="Configurez votre espace en quelques étapes pour offrir le bien-être à vos équipes."
        steps={[
          {
            id: 'subscription',
            label: 'Souscrire à une formule',
            description: 'Choisissez le plan adapté à la taille de votre équipe (Zen, Pulse ou Boost).',
            to: '/dashboard/entreprise/subscription',
            done: !!subscription,
          },
          {
            id: 'profile',
            label: 'Compléter le profil entreprise',
            description: 'Renseignez le nom de votre entreprise et vos coordonnées.',
            to: '/dashboard/entreprise/profile',
            done: !!(freshProfile?.companyName && freshProfile?.siret),
          },
          {
            id: 'employees',
            label: 'Inviter vos collaborateurs',
            description: "Ajoutez vos collaborateurs pour qu'ils puissent accéder à la plateforme.",
            to: '/dashboard/entreprise/employees',
            done: employeeCount > 0,
          },
          {
            id: 'search',
            label: 'Explorer nos professionnels',
            description: 'Découvrez nos coachs sportifs, nutritionnistes et praticiens bien-être.',
            to: '/dashboard/entreprise/search',
            done: false,
          },
          {
            id: 'resources',
            label: 'Accéder au centre de ressources',
            description: 'Articles et vidéos bien-être inclus dans votre formule.',
            to: '/dashboard/entreprise/resources',
            done: false,
          },
        ]}
      />

      {/* Abonnement actif */}
      {subscription ? (
        <Card className="border-violet-500/20 bg-violet-500/[0.07]">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-violet-500/15 rounded-lg shrink-0">
                <CreditCard className="w-6 h-6 text-violet-400" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Formule {PLAN_LABELS[subscription.plan]}</p>
                <p className="text-sm text-gray-400 mt-0.5">
                  {BILLING_CYCLE_LABELS[subscription.billingCycle]} · Valable jusqu'au{' '}
                  {new Date(subscription.endDate).toLocaleDateString('fr-FR', {
                    day: 'numeric', month: 'long', year: 'numeric',
                  })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="ACTIVE">Actif</Badge>
              <Link to="/dashboard/entreprise/subscription">
                <Button variant="ghost" size="sm">Gérer</Button>
              </Link>
            </div>
          </div>

          {planInfo && (
            <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-violet-500/20">
              <div className="text-center">
                <p className="text-2xl font-bold text-violet-400">{planInfo.employees}</p>
                <p className="text-xs text-gray-400 mt-0.5">Collaborateurs couverts</p>
              </div>
              <div className="text-center border-x border-violet-500/20">
                <p className="text-2xl font-bold text-violet-400">{planInfo.sessions}</p>
                <p className="text-xs text-gray-400 mt-0.5">Séances/semaine</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-violet-400">{planInfo.domains}</p>
                <p className="text-xs text-gray-400 mt-0.5">Domaines inclus</p>
              </div>
            </div>
          )}
        </Card>
      ) : (
        <Card className="border-dashed border-violet-500/30">
          <div className="text-center py-4">
            <CreditCard className="w-10 h-10 text-violet-500/40 mx-auto mb-3" />
            <p className="font-medium text-gray-400">Aucun abonnement actif</p>
            <p className="text-sm text-gray-500 mt-1">Choisissez une formule adaptée à votre équipe</p>
            <Link to="/dashboard/entreprise/subscription">
              <Button variant="primary" size="sm" className="mt-4">Choisir une formule</Button>
            </Link>
          </div>
        </Card>
      )}

      {/* Actions rapides */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Actions rapides</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link to="/dashboard/entreprise/search">
            <Card className="hover:border-violet-500/40 transition-colors cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-violet-500/15 rounded-lg shrink-0">
                  <Search className="w-6 h-6 text-violet-400" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-gray-900">Trouver un coach</p>
                  <p className="text-sm text-gray-500">Réserver pour vos collaborateurs</p>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-500 ml-auto shrink-0" />
              </div>
            </Card>
          </Link>
          <Link to="/dashboard/entreprise/analytics">
            <Card className="hover:border-violet-500/40 transition-colors cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-violet-500/15 rounded-lg shrink-0">
                  <BarChart2 className="w-6 h-6 text-violet-400" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-gray-900">Statistiques</p>
                  <p className="text-sm text-gray-500">Suivi de l'activité de votre équipe</p>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-500 ml-auto shrink-0" />
              </div>
            </Card>
          </Link>
          <Link to="/dashboard/entreprise/resources">
            <Card className="hover:border-violet-500/40 transition-colors cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-violet-500/15 rounded-lg shrink-0">
                  <BookOpen className="w-6 h-6 text-violet-400" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-gray-900">Centre de ressources</p>
                  <p className="text-sm text-gray-500">Articles & vidéos bien-être</p>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-500 ml-auto shrink-0" />
              </div>
            </Card>
          </Link>
          <Link to="/dashboard/entreprise/subscription">
            <Card className="hover:border-violet-500/40 transition-colors cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-violet-500/15 rounded-lg shrink-0">
                  <CreditCard className="w-6 h-6 text-violet-400" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-gray-900">Gérer l'abonnement</p>
                  <p className="text-sm text-gray-500">Changer ou renouveler votre formule</p>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-500 ml-auto shrink-0" />
              </div>
            </Card>
          </Link>
        </div>
      </div>

      {/* Services inclus */}
      {subscription && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Services inclus dans votre formule</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              'Coaching sportif individuel',
              'Coaching sportif en duo',
              ...(subscription.plan !== 'ZEN_ENTREPRISE' ? ['Bilan nutritionnel', 'Coaching nutrition entreprise'] : []),
              ...(subscription.plan === 'BOOST_ENTREPRISE' ? ['Préparation mentale'] : []),
              'Séance de yoga',
              'Atelier bien-être collectif',
            ].map((service) => (
              <div key={service} className="flex items-center gap-2 text-sm text-gray-400">
                <CheckCircle className="w-4 h-4 text-violet-400 shrink-0" />
                {service}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contact account manager */}
      <Card>
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white/[0.05] border border-white/[0.08] rounded-lg shrink-0">
            <Phone className="w-6 h-6 text-gray-400" />
          </div>
          <div>
            <p className="font-medium text-gray-900">Votre account manager</p>
            <p className="text-sm text-gray-500">Une question ? Besoin d'ajuster votre formule ? Contactez-nous.</p>
          </div>
          <a href="mailto:entreprises@goupylsport.fr" className="ml-auto shrink-0">
            <Button variant="secondary" size="sm">
              Nous écrire
            </Button>
          </a>
        </div>
      </Card>
    </div>
  );
}
