import PublicNavbar from '../../components/layout/PublicNavbar';

const sections = [
  {
    title: '1. Responsable du traitement',
    content:
      "Le responsable du traitement des données personnelles collectées sur la plateforme Goupyl Sport est la société Goupyl Sport, dont le siège social est situé en France. Pour toute question relative à vos données personnelles, vous pouvez nous contacter à l'adresse : dpo@goupylsport.fr.",
  },
  {
    title: '2. Données collectées',
    content:
      "Dans le cadre de l'utilisation de la plateforme, nous collectons les données suivantes : données d'identification (nom, prénom, adresse email, numéro de téléphone), données professionnelles pour les intervenants (diplômes, spécialités, expérience), données de santé fournies volontairement par les clients (contraintes physiques, objectifs sportifs), données de connexion et de navigation, données de paiement (traitées par notre prestataire Stripe).",
  },
  {
    title: '3. Finalités du traitement',
    content:
      "Les données personnelles sont traitées pour les finalités suivantes : gestion des comptes utilisateurs et authentification, mise en relation entre intervenants et clients, gestion des rendez-vous et suivi des séances, traitement des paiements et facturation, amélioration de nos services et personnalisation de l'expérience utilisateur, envoi de communications relatives au service (confirmations, rappels), respect de nos obligations légales et réglementaires.",
  },
  {
    title: '4. Base légale (RGPD)',
    content:
      "Le traitement de vos données repose sur les bases légales suivantes : l'exécution du contrat (article 6.1.b du RGPD) pour la fourniture de nos services, votre consentement (article 6.1.a) pour les communications marketing et le traitement de données de santé, notre intérêt légitime (article 6.1.f) pour l'amélioration de nos services et la prévention de la fraude, le respect d'une obligation légale (article 6.1.c) pour la conservation des données de facturation.",
  },
  {
    title: '5. Conservation des données',
    content:
      "Les données personnelles sont conservées pendant la durée de votre inscription sur la plateforme, puis pendant une durée de 3 ans après la dernière activité sur votre compte. Les données de facturation sont conservées pendant 10 ans conformément aux obligations comptables. Vous pouvez demander la suppression de votre compte et de vos données à tout moment.",
  },
  {
    title: '6. Droits des personnes',
    content:
      "Conformément au RGPD, vous disposez des droits suivants sur vos données personnelles : droit d'accès — obtenir la confirmation que vos données sont traitées et en recevoir une copie, droit de rectification — demander la correction de données inexactes ou incomplètes, droit à l'effacement — demander la suppression de vos données (droit à l'oubli), droit à la portabilité — recevoir vos données dans un format structuré et lisible, droit d'opposition — vous opposer au traitement de vos données pour des motifs légitimes, droit à la limitation — demander la limitation du traitement dans certains cas. Pour exercer ces droits, contactez-nous à dpo@goupylsport.fr ou utilisez la fonctionnalité de suppression de compte dans vos paramètres.",
  },
  {
    title: '7. Contact DPO',
    content:
      "Pour toute question concernant la protection de vos données personnelles ou pour exercer vos droits, vous pouvez contacter notre Délégué à la Protection des Données (DPO) : par email à dpo@goupylsport.fr, par courrier à l'adresse du siège social de Goupyl Sport. Vous avez également le droit d'introduire une réclamation auprès de la CNIL (Commission Nationale de l'Informatique et des Libertés) si vous estimez que le traitement de vos données n'est pas conforme à la réglementation.",
  },
  {
    title: '8. Cookies',
    content:
      "La plateforme Goupyl Sport utilise des cookies strictement nécessaires au fonctionnement du service (authentification, préférences de session). Aucun cookie publicitaire ou de suivi tiers n'est utilisé. Les cookies de session sont supprimés à la fermeture du navigateur. Les tokens d'authentification sont stockés dans le localStorage du navigateur et sont nécessaires au bon fonctionnement de la plateforme.",
  },
];

export default function Confidentialite() {
  return (
    <div className="min-h-screen bg-page">
      <PublicNavbar transparent={false} />

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 py-10" style={{ paddingTop: 96 }}>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Politique de Confidentialité</h1>
        <p className="text-sm text-gray-400 mb-10">Dernière mise à jour : avril 2025</p>

        <div className="space-y-8">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">{section.title}</h2>
              <p className="text-sm text-gray-600 leading-relaxed">{section.content}</p>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
