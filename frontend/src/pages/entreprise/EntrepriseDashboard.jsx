import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { subscriptionApi } from '../../services/subscription.api';
import Spinner from '../../components/ui/Spinner';
import { CreditCard, Search, ArrowRight, Phone, CheckCircle, BarChart2, Users } from 'lucide-react';
import OnboardingChecklist from '../../components/onboarding/OnboardingChecklist';
import { userApi } from '../../services/user.api';
import { companyApi } from '../../services/company.api';
import { PLAN_LABELS, BILLING_CYCLE_LABELS, CONTACT } from '../../utils/constants';

const PLAN_FEATURES = {
  ESSENTIEL_ENTREPRISE: { employees: '10',  sessions: '4/mois', domains: 'Sport + Bien-être' },
  BOOST_ENTREPRISE:     { employees: '50',  sessions: '8/mois', domains: 'Tous les domaines' },
  ULTRA_ENTREPRISE:     { employees: '200', sessions: '16/mois', domains: 'Tous les domaines' },
};

const ED_CSS = `
  .ed-hero{background:#191917;border-radius:20px;padding:26px 28px;color:#fff}
  .ed-hero-top{display:flex;align-items:center;gap:22px;flex-wrap:wrap}
  .ed-hero-icon{width:56px;height:56px;border-radius:16px;background:rgba(244,83,15,.18);border:1px solid rgba(244,83,15,.35);display:flex;align-items:center;justify-content:center;color:#FF9C6B;flex-shrink:0}
  .ed-hero-body{flex:1;min-width:220px}
  .ed-hero-eyebrow{font-size:11.5px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:#FF9C6B}
  .ed-hero-title{font-size:24px;font-weight:700;letter-spacing:-.02em;margin-top:6px;line-height:1.15}
  .ed-hero-sub{font-size:13.5px;color:rgba(255,255,255,.75);margin-top:6px}
  .ed-hero-cta{display:inline-flex;align-items:center;gap:10px;height:44px;padding:0 20px;border-radius:999px;background:#F4530F;color:#fff;font-size:13.5px;font-weight:600;text-decoration:none;white-space:nowrap;transition:transform .15s ease}
  .ed-hero-cta:hover{transform:translateY(-1px)}
  .ed-hero-badge{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:600;padding:7px 14px;border-radius:999px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.25);color:#fff}
  .ed-hero-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:22px;padding-top:20px;border-top:1px solid rgba(255,255,255,.2)}
  @media(max-width:640px){.ed-hero-stats{grid-template-columns:1fr}}
  .ed-hero-stat{text-align:center}
  .ed-hero-stat-val{font-size:24px;font-weight:700;letter-spacing:-.02em;color:#FF9C6B;line-height:1}
  .ed-hero-stat-label{font-size:12px;color:rgba(255,255,255,.7);margin-top:6px}

  .ed-links{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
  @media(max-width:900px){.ed-links{grid-template-columns:1fr}}
  .ed-link{border:1px solid var(--line);border-radius:16px;padding:20px 22px;display:flex;align-items:center;gap:16px;text-decoration:none;color:inherit;background:#fff;transition:border-color .2s,transform .15s ease,box-shadow .2s}
  .ed-link:hover{border-color:#c9c7c1;transform:translateY(-2px);box-shadow:0 6px 18px rgba(23,22,20,.06)}
  .ed-link-icon{width:46px;height:46px;border-radius:14px;background:var(--orange-soft);color:var(--orange);display:flex;align-items:center;justify-content:center;flex-shrink:0}
  .ed-link-title{font-size:14.5px;font-weight:600;color:var(--ink)}
  .ed-link-sub{font-size:12.5px;color:var(--ink-3);margin-top:2px}
  .ed-link svg.ed-link-arrow{margin-left:auto;color:var(--ink-3);flex-shrink:0}

  .ed-services{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  @media(max-width:640px){.ed-services{grid-template-columns:1fr}}
  .ed-service{display:flex;align-items:center;gap:10px;font-size:13.5px;color:var(--ink-2);border:1px solid var(--line);border-radius:12px;padding:12px 15px;background:#fff}
  .ed-service svg{color:#2F7A47;flex-shrink:0}

  .ed-contact{display:flex;align-items:center;gap:16px;flex-wrap:wrap}
  .ed-contact-icon{width:46px;height:46px;border-radius:14px;background:#FAF9F7;border:1px solid var(--line);color:var(--ink-3);display:flex;align-items:center;justify-content:center;flex-shrink:0}
`;

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
    <div className="dsh-page">
      <style>{ED_CSS}</style>

      <OnboardingChecklist
        storageKey={`onboarding-entreprise-${user.id}`}
        title="Bienvenue sur Goupyl Sport Entreprise !"
        subtitle="Configurez votre espace en quelques étapes pour offrir le bien-être à vos équipes."
        steps={[
          {
            id: 'subscription',
            label: 'Souscrire à une formule',
            description: 'Choisissez le plan adapté à la taille de votre équipe (Essentiel, Boost ou Ultra).',
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
        ]}
      />

      {/* ── Abonnement ── */}
      {subscription ? (
        <section className="ed-hero">
          <div className="ed-hero-top">
            <div className="ed-hero-icon"><CreditCard size={24} /></div>
            <div className="ed-hero-body">
              <div className="ed-hero-eyebrow">Abonnement actif</div>
              <h2 className="ed-hero-title">Formule {PLAN_LABELS[subscription.plan]}</h2>
              <p className="ed-hero-sub">
                {BILLING_CYCLE_LABELS[subscription.billingCycle]} · Valable jusqu'au{' '}
                {new Date(subscription.endDate).toLocaleDateString('fr-FR', {
                  day: 'numeric', month: 'long', year: 'numeric',
                })}
                {' · '}{employeeCount} collaborateur{employeeCount > 1 ? 's' : ''} rattaché{employeeCount > 1 ? 's' : ''}
              </p>
            </div>
            <Link to="/dashboard/entreprise/subscription" className="ed-hero-cta">
              Gérer <ArrowRight size={15} />
            </Link>
          </div>

          {planInfo && (
            <div className="ed-hero-stats">
              <div className="ed-hero-stat">
                <p className="ed-hero-stat-val">{planInfo.employees}</p>
                <p className="ed-hero-stat-label">Collaborateurs couverts</p>
              </div>
              <div className="ed-hero-stat">
                <p className="ed-hero-stat-val">{planInfo.sessions}</p>
                <p className="ed-hero-stat-label">Séances par collaborateur</p>
              </div>
              <div className="ed-hero-stat">
                <p className="ed-hero-stat-val" style={{ fontSize: 17, paddingTop: 4 }}>{planInfo.domains}</p>
                <p className="ed-hero-stat-label">Domaines inclus</p>
              </div>
            </div>
          )}
        </section>
      ) : (
        <section className="ed-hero">
          <div className="ed-hero-top">
            <div className="ed-hero-icon"><CreditCard size={24} /></div>
            <div className="ed-hero-body">
              <div className="ed-hero-eyebrow">Abonnement</div>
              <h2 className="ed-hero-title">Aucun abonnement actif</h2>
              <p className="ed-hero-sub">Choisissez une formule adaptée à la taille de votre équipe.</p>
            </div>
            <Link to="/dashboard/entreprise/subscription" className="ed-hero-cta">
              Choisir une formule <ArrowRight size={15} />
            </Link>
          </div>
        </section>
      )}

      {/* ── Actions rapides ── */}
      <section className="ed-links">
        <Link to="/dashboard/entreprise/employees" className="ed-link">
          <div className="ed-link-icon"><Users size={20} /></div>
          <div>
            <div className="ed-link-title">Collaborateurs</div>
            <div className="ed-link-sub">Invitations et code entreprise</div>
          </div>
          <ArrowRight size={18} className="ed-link-arrow" />
        </Link>
        <Link to="/dashboard/entreprise/search" className="ed-link">
          <div className="ed-link-icon"><Search size={20} /></div>
          <div>
            <div className="ed-link-title">Trouver un coach</div>
            <div className="ed-link-sub">Réserver pour vos collaborateurs</div>
          </div>
          <ArrowRight size={18} className="ed-link-arrow" />
        </Link>
        <Link to="/dashboard/entreprise/analytics" className="ed-link">
          <div className="ed-link-icon"><BarChart2 size={20} /></div>
          <div>
            <div className="ed-link-title">Statistiques</div>
            <div className="ed-link-sub">Activité de votre équipe</div>
          </div>
          <ArrowRight size={18} className="ed-link-arrow" />
        </Link>
      </section>

      {/* ── Services inclus ── */}
      {subscription && (
        <div className="dsh-card">
          <h2 className="dsh-card-title" style={{ marginBottom: 16 }}>Services inclus dans votre formule</h2>
          <div className="ed-services">
            {[
              'Coaching sportif individuel',
              'Coaching sportif en duo',
              ...(subscription.plan !== 'ESSENTIEL_ENTREPRISE' ? ['Bilan nutritionnel', 'Coaching nutrition entreprise'] : []),
              ...(subscription.plan === 'ULTRA_ENTREPRISE' ? ['Préparation mentale'] : []),
              'Séance de yoga',
              'Atelier bien-être collectif',
            ].map((service) => (
              <div key={service} className="ed-service">
                <CheckCircle size={15} />
                {service}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Account manager ── */}
      <div className="dsh-card">
        <div className="ed-contact">
          <div className="ed-contact-icon"><Phone size={20} /></div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <h2 className="dsh-card-title">Votre account manager</h2>
            <p className="dsh-card-sub">Une question ? Besoin d'ajuster votre formule ? Contactez-nous.</p>
          </div>
          <a href={`mailto:${CONTACT.emailEntreprises}`} className="dsh-btn dsh-btn--ghost dsh-btn--sm">
            Nous écrire
          </a>
        </div>
      </div>
    </div>
  );
}
