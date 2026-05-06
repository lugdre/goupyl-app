import PublicNavbar from '../../components/layout/PublicNavbar';

const sections = [
  {
    title: '1. Objet',
    content:
      "Les présentes Conditions Générales d'Utilisation (CGU) ont pour objet de définir les modalités et conditions d'utilisation de la plateforme Goupyl Sport, accessible à l'adresse goupylsport.fr, ainsi que les droits et obligations des utilisateurs.",
  },
  {
    title: "2. Accès à la plateforme",
    content:
      "La plateforme Goupyl Sport est accessible gratuitement à tout utilisateur disposant d'un accès à Internet. L'ensemble des frais liés à l'accès au service (matériel informatique, connexion Internet, etc.) sont à la charge de l'utilisateur. L'accès à certaines fonctionnalités peut nécessiter la souscription d'un abonnement payant.",
  },
  {
    title: '3. Compte utilisateur',
    content:
      "L'utilisation de la plateforme nécessite la création d'un compte. L'utilisateur s'engage à fournir des informations exactes et à jour lors de son inscription. Il est responsable de la confidentialité de ses identifiants de connexion. Toute utilisation du compte est réputée faite par le titulaire du compte.",
  },
  {
    title: '4. Services proposés',
    content:
      "Goupyl Sport met en relation des professionnels du sport et du bien-être (intervenants) avec des clients (particuliers et entreprises). La plateforme permet la recherche d'intervenants, la prise de rendez-vous, le suivi des séances et la gestion des abonnements. Goupyl Sport agit en qualité d'intermédiaire et n'est pas partie aux contrats conclus entre les intervenants et les clients.",
  },
  {
    title: '5. Paiements et facturation',
    content:
      "Les paiements sont effectués via la plateforme par l'intermédiaire de notre prestataire de paiement sécurisé (Stripe). Les tarifs des prestations sont fixés librement par les intervenants. Goupyl Sport prélève une commission sur chaque transaction. Les conditions de remboursement sont définies dans la politique d'annulation applicable à chaque prestation.",
  },
  {
    title: '6. Responsabilités',
    content:
      "Goupyl Sport s'engage à fournir un service de qualité et à assurer la disponibilité de la plateforme. Toutefois, Goupyl Sport ne saurait être tenu responsable des interruptions temporaires du service pour maintenance ou mise à jour. Les intervenants sont seuls responsables de la qualité de leurs prestations et de leur conformité avec la réglementation en vigueur.",
  },
  {
    title: '7. Données personnelles',
    content:
      "La collecte et le traitement des données personnelles sont effectués conformément au Règlement Général sur la Protection des Données (RGPD) et à la loi Informatique et Libertés. Pour plus d'informations, consultez notre Politique de Confidentialité.",
    link: { to: '/confidentialite', label: 'Consulter la politique de confidentialité' },
  },
  {
    title: '8. Droit applicable',
    content:
      "Les présentes CGU sont soumises au droit français. En cas de litige, les parties s'engagent à rechercher une solution amiable avant de saisir les tribunaux compétents. À défaut d'accord amiable, les tribunaux de Paris seront seuls compétents.",
  },
];

export default function CGU() {
  return (
    <div className="min-h-screen bg-page">
      <PublicNavbar transparent={false} />

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 py-10" style={{ paddingTop: 96 }}>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Conditions Générales d'Utilisation
        </h1>
        <p className="text-sm text-gray-400 mb-10">Dernière mise à jour : avril 2025</p>

        <div className="space-y-8">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">{section.title}</h2>
              <p className="text-sm text-gray-600 leading-relaxed">{section.content}</p>
              {section.link && (
                <Link
                  to={section.link.to}
                  className="inline-block mt-2 text-sm text-brand-800 hover:underline"
                >
                  {section.link.label}
                </Link>
              )}
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
