export const CATEGORY_LABELS = {
  SPORT: 'Coaching sportif',
  NUTRITION: 'Nutrition',
  MENTAL: 'Santé mentale',
  BIENETRE: 'Bien-être',
};

export const STATUS_LABELS = {
  PENDING: 'En attente',
  CONFIRMED: 'Confirmé',
  DONE: 'Terminé',
  CANCELLED: 'Annulé',
};

export const PLAN_LABELS = {
  ESSENTIEL_ENTREPRISE: 'Essentiel',
  BOOST_ENTREPRISE: 'Boost',
  ULTRA_ENTREPRISE: 'Ultra',
};

export const BILLING_CYCLE_LABELS = {
  MONTHLY: 'Mensuel',
  YEARLY: 'Annuel',
};

export const LEVEL_LABELS = {
  DEBUTANT: 'Débutant',
  INTERMEDIAIRE: 'Intermédiaire',
  AVANCE: 'Avancé',
  PRO: 'Pro',
  ELITE: 'Élite',
};

export const DAY_LABELS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

export const ATTENDANCE_LABELS = {
  PRESENT: 'Présent',
  ABSENT: 'Absent',
};

export const DISPUTE_STATUS_LABELS = {
  OPEN: 'Litige en cours',
  REJECTED: 'Litige rejeté',
  RESOLVED_CLIENT: 'Litige résolu — remboursé',
};

export const ORDER_STATUS_LABELS = {
  PENDING: 'En attente',
  PAID: 'Payée',
  CANCELLED: 'Annulée',
};

// Valeurs exactes attendues par le filtre backend (profile.courseLocations has)
export const COURSE_LOCATION_OPTIONS = ['A domicile', 'En salle', "A l'exterieur", 'En entreprise'];

// ─── Coordonnées publiques ────────────────────────────────────────────
// Source unique pour le footer, les CTA « nous contacter » et les mentions
// légales. Ce sont des informations publiques : aucune raison de les sortir
// dans une variable d'env (les VITE_* sont de toute façon inlinées dans le
// bundle au build, donc lisibles par tous).
// `phoneHref` doit rester au format E.164 (indicatif, sans espace) pour que
// tel: fonctionne à l'étranger ; `phone` est la version affichée.
export const CONTACT = {
  phone: '06 77 12 12 12',
  phoneHref: '+33677121212',
  email: 'ayvon@gryngroup.com',
  emailSupport: 'support@goupylsport.fr',
  emailEntreprises: 'entreprises@goupylsport.fr',
  emailDpo: 'dpo@goupylsport.fr',
  addressLines: ['10A rue prémartine', '72000 Le Mans, France'],
};

// Lien carte : ouvre l'app Maps sur mobile, la version web sinon
export const CONTACT_MAP_URL =
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(CONTACT.addressLines.join(' '))}`;
