require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const prisma = new PrismaClient();

async function main() {
  console.log('Debut du seeding...');

  // Nettoyage dans l'ordre des dependances
  await prisma.sessionReport.deleteMany();
  await prisma.review.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.appointmentStatusHistory.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.productOrder.deleteMany();
  await prisma.product.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.document.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.service.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash('Password1!', 12);

  // --- Admin ---
  await prisma.user.create({
    data: {
      email: 'admin@goupylsport.fr',
      passwordHash,
      firstName: 'Nadia',
      lastName: 'Goupyl',
      role: 'ADMIN',
      verificationStatus: 'VERIFIED',
    },
  });

  // --- Intervenants ---
  const coach = await prisma.user.create({
    data: {
      email: 'marc.leroy@email.com',
      passwordHash,
      firstName: 'Marc',
      lastName: 'Leroy',
      role: 'INTERVENANT',
      verificationStatus: 'VERIFIED',
      profile: {
        create: {
          bio: 'Coach sportif diplome BPJEPS, 15 ans d\'experience en preparation physique.',
          city: 'Angers',
          specialties: ['musculation', 'running', 'remise en forme'],
          diplomas: ['BPJEPS', 'DE JEPS'],
          level: 'ELITE',
          experience: 15,
          hourlyRate: 60,
          courseLocations: ['A domicile', 'En salle', 'En entreprise'],
        },
      },
    },
  });

  const nutritionist = await prisma.user.create({
    data: {
      email: 'sophie.martin@email.com',
      passwordHash,
      firstName: 'Sophie',
      lastName: 'Martin',
      role: 'INTERVENANT',
      verificationStatus: 'VERIFIED',
      profile: {
        create: {
          bio: 'Dieteticienne-nutritionniste specialisee en nutrition sportive.',
          city: 'Angers',
          specialties: ['nutrition sportive', 'equilibre alimentaire', 'perte de poids'],
          diplomas: ['BTS Dietetique', 'DU Nutrition du sport'],
          level: 'AVANCE',
          experience: 8,
          hourlyRate: 70,
          courseLocations: ['En entreprise', 'A domicile'],
        },
      },
    },
  });

  const psycho = await prisma.user.create({
    data: {
      email: 'julien.blanc@email.com',
      passwordHash,
      firstName: 'Julien',
      lastName: 'Blanc',
      role: 'INTERVENANT',
      verificationStatus: 'VERIFIED',
      profile: {
        create: {
          bio: 'Psychologue du sport, accompagnement mental des athletes.',
          city: 'Paris',
          specialties: ['gestion du stress', 'preparation mentale', 'sophrologie'],
          diplomas: ['Master Psychologie du sport'],
          level: 'AVANCE',
          experience: 10,
          hourlyRate: 80,
          courseLocations: ['En entreprise', "A l'exterieur"],
        },
      },
    },
  });

  // --- Coachs supplementaires (partout en France) ---
  const extraCoaches = await Promise.all([
    // Paris & Île-de-France
    prisma.user.create({ data: { email: 'emma.rousseau@email.com', passwordHash, firstName: 'Emma', lastName: 'Rousseau', role: 'INTERVENANT', verificationStatus: 'VERIFIED', profile: { create: { bio: 'Coach fitness et yoga certifiée RYT-200, spécialisée dans la remise en forme post-grossesse et le yoga thérapeutique.', city: 'Paris', specialties: ['yoga', 'pilates', 'remise en forme'], diplomas: ['RYT-200 Yoga Alliance', 'BPJEPS AF'], level: 'AVANCE', experience: 7, hourlyRate: 65, courseLocations: ['A domicile', 'En salle'] } } } }),
    prisma.user.create({ data: { email: 'thomas.klein@email.com', passwordHash, firstName: 'Thomas', lastName: 'Klein', role: 'INTERVENANT', verificationStatus: 'VERIFIED', profile: { create: { bio: 'Préparateur physique ex-professionnel, ancien staff technique Ligue 1. Spécialiste haute performance et réathlétisation.', city: 'Paris', specialties: ['preparation physique', 'reathletisation', 'musculation'], diplomas: ['DE JEPS', 'Master STAPS'], level: 'ELITE', experience: 18, hourlyRate: 90 } } } }),
    prisma.user.create({ data: { email: 'amandine.petit@email.com', passwordHash, firstName: 'Amandine', lastName: 'Petit', role: 'INTERVENANT', verificationStatus: 'VERIFIED', profile: { create: { bio: 'Nutritionniste et micronutritionniste, consultations en cabinet et à domicile. Approche fonctionnelle et personnalisée.', city: 'Boulogne-Billancourt', specialties: ['micronutrition', 'nutrition fonctionnelle', 'perte de poids'], diplomas: ['DU Micronutrition', 'BTS Dietetique'], level: 'AVANCE', experience: 9, hourlyRate: 75 } } } }),
    prisma.user.create({ data: { email: 'kevin.moreau@email.com', passwordHash, firstName: 'Kévin', lastName: 'Moreau', role: 'INTERVENANT', verificationStatus: 'VERIFIED', profile: { create: { bio: 'Coach CrossFit certifié L2 et coach running. Préparation aux trails et compétitions d\'endurance.', city: 'Vincennes', specialties: ['crossfit', 'running', 'trail'], diplomas: ['CrossFit L2', 'BPJEPS AGFF'], level: 'ELITE', experience: 11, hourlyRate: 70, courseLocations: ['En salle', "A l'exterieur"] } } } }),

    // Lyon & Rhône-Alpes
    prisma.user.create({ data: { email: 'claire.dubois@email.com', passwordHash, firstName: 'Claire', lastName: 'Dubois', role: 'INTERVENANT', verificationStatus: 'VERIFIED', profile: { create: { bio: 'Coach bien-être et sophrologie caycédienne. Accompagnement des entreprises dans la gestion du stress et la qualité de vie au travail.', city: 'Lyon', specialties: ['sophrologie', 'meditation', 'gestion du stress'], diplomas: ['Titre RNCP Sophrologue', 'DU Qualite de vie au travail'], level: 'AVANCE', experience: 12, hourlyRate: 68 } } } }),
    prisma.user.create({ data: { email: 'lucas.perrin@email.com', passwordHash, firstName: 'Lucas', lastName: 'Perrin', role: 'INTERVENANT', verificationStatus: 'VERIFIED', profile: { create: { bio: 'Coach sportif diplômé, spécialiste renforcement musculaire et sport-santé. Accompagnement des seniors actifs et personnes avec pathologies.', city: 'Lyon', specialties: ['sport-sante', 'seniors', 'renforcement musculaire'], diplomas: ['BPJEPS AF', 'CQP SIAP Sport Sante'], level: 'INTERMEDIAIRE', experience: 5, hourlyRate: 55 } } } }),
    prisma.user.create({ data: { email: 'marie.fontaine@email.com', passwordHash, firstName: 'Marie', lastName: 'Fontaine', role: 'INTERVENANT', verificationStatus: 'VERIFIED', profile: { create: { bio: 'Diététicienne sportive et coach nutrition végétarienne. Consultations pour sportifs et entreprises souhaitant intégrer une alimentation durable.', city: 'Grenoble', specialties: ['nutrition vegetarienne', 'nutrition sportive', 'bilan alimentaire'], diplomas: ['BTS Dietetique', 'DU Nutrition du sport'], level: 'AVANCE', experience: 6, hourlyRate: 65 } } } }),

    // Marseille & PACA
    prisma.user.create({ data: { email: 'rafael.costa@email.com', passwordHash, firstName: 'Rafael', lastName: 'Costa', role: 'INTERVENANT', verificationStatus: 'VERIFIED', profile: { create: { bio: 'Entraîneur de boxe française et coach fitness. Champion régional 2015. Cours collectifs et accompagnements individuels.', city: 'Marseille', specialties: ['boxe francaise', 'fitness', 'cardio-training'], diplomas: ['Brevet Federal Boxe Francaise', 'BPJEPS AGFF'], level: 'ELITE', experience: 14, hourlyRate: 58 } } } }),
    prisma.user.create({ data: { email: 'lea.simon@email.com', passwordHash, firstName: 'Léa', lastName: 'Simon', role: 'INTERVENANT', verificationStatus: 'VERIFIED', profile: { create: { bio: 'Professeure de yoga Iyengar et instructrice de méditation pleine conscience. Ateliers bien-être en entreprise depuis 2017.', city: 'Aix-en-Provence', specialties: ['yoga iyengar', 'meditation pleine conscience', 'bien-etre entreprise'], diplomas: ['Certification Iyengar Yoga', 'MBSR Mindfulness'], level: 'AVANCE', experience: 9, hourlyRate: 62 } } } }),
    prisma.user.create({ data: { email: 'pierre.garcia@email.com', passwordHash, firstName: 'Pierre', lastName: 'Garcia', role: 'INTERVENANT', verificationStatus: 'VERIFIED', profile: { create: { bio: 'Kinésiologue et coach sportif. Approche globale corps-esprit, spécialisé dans la récupération sportive et la prévention des blessures.', city: 'Toulon', specialties: ['kinesologie', 'recuperation sportive', 'prevention blessures'], diplomas: ['Kinesiologue certifie', 'DE JEPS'], level: 'AVANCE', experience: 13, hourlyRate: 72 } } } }),

    // Bordeaux & Nouvelle-Aquitaine
    prisma.user.create({ data: { email: 'sarah.lopez@email.com', passwordHash, firstName: 'Sarah', lastName: 'Lopez', role: 'INTERVENANT', verificationStatus: 'VERIFIED', profile: { create: { bio: 'Coach running et triathlon, ancienne athlète nationale. Préparation physique spécifique et plans d\'entraînement personnalisés.', city: 'Bordeaux', specialties: ['running', 'triathlon', 'cyclisme'], diplomas: ['BPJEPS APT', 'Diplome Federal FFA'], level: 'ELITE', experience: 16, hourlyRate: 75 } } } }),
    prisma.user.create({ data: { email: 'nicolas.martin@email.com', passwordHash, firstName: 'Nicolas', lastName: 'Martin', role: 'INTERVENANT', verificationStatus: 'VERIFIED', profile: { create: { bio: 'Ostéopathe et coach en mobilité. Séances alliant travail postural, étirements profonds et rééducation fonctionnelle.', city: 'Bordeaux', specialties: ['mobilite', 'posturologie', 'etirements therapeutiques'], diplomas: ['Diplome Osteopathie', 'Certifie FRC Mobility'], level: 'AVANCE', experience: 8, hourlyRate: 80 } } } }),

    // Toulouse & Occitanie
    prisma.user.create({ data: { email: 'isabelle.durand@email.com', passwordHash, firstName: 'Isabelle', lastName: 'Durand', role: 'INTERVENANT', verificationStatus: 'VERIFIED', profile: { create: { bio: 'Psychologue du travail et coach en gestion du stress. Interventions en entreprises pour prévenir les risques psychosociaux.', city: 'Toulouse', specialties: ['psychologie du travail', 'prevention RPS', 'gestion du stress'], diplomas: ['Master Psychologie du Travail', 'Coach certifie ICF'], level: 'AVANCE', experience: 15, hourlyRate: 85 } } } }),
    prisma.user.create({ data: { email: 'arnaud.thomas@email.com', passwordHash, firstName: 'Arnaud', lastName: 'Thomas', role: 'INTERVENANT', verificationStatus: 'VERIFIED', profile: { create: { bio: 'Coach Pilates et rééducation posturale. Méthode Pilates traditionnelle et contemporaine, cours en groupe ou suivi individuel.', city: 'Montpellier', specialties: ['pilates', 'reeducation posturale', 'gainage'], diplomas: ['BPJEPS AF', 'Certification Pilates STOTT'], level: 'AVANCE', experience: 7, hourlyRate: 58 } } } }),

    // Nantes & Pays de la Loire
    prisma.user.create({ data: { email: 'camille.henry@email.com', passwordHash, firstName: 'Camille', lastName: 'Henry', role: 'INTERVENANT', verificationStatus: 'VERIFIED', profile: { create: { bio: 'Coach bien-être holistique, formatrice en nutrition et naturopathie. Accompagnement global pour une hygiène de vie saine et durable.', city: 'Nantes', specialties: ['naturopathie', 'nutrition holistique', 'gestion du poids'], diplomas: ['Praticien Naturopathe', 'Diplome Nutrition'], level: 'INTERMEDIAIRE', experience: 4, hourlyRate: 52 } } } }),
    prisma.user.create({ data: { email: 'florian.bernard@email.com', passwordHash, firstName: 'Florian', lastName: 'Bernard', role: 'INTERVENANT', verificationStatus: 'VERIFIED', profile: { create: { bio: 'Préparateur physique spécialisé sports collectifs. Travail de vitesse, agilité, coordination. Coach certifié UEFA dans l\'encadrement sportif.', city: 'Saint-Nazaire', specialties: ['sports collectifs', 'vitesse', 'agilite'], diplomas: ['DE JEPS', 'Preparateur physique certifie'], level: 'ELITE', experience: 12, hourlyRate: 65 } } } }),

    // Strasbourg & Grand Est
    prisma.user.create({ data: { email: 'alice.weber@email.com', passwordHash, firstName: 'Alice', lastName: 'Weber', role: 'INTERVENANT', verificationStatus: 'VERIFIED', profile: { create: { bio: 'Diététicienne clinique et sportive, spécialisée dans les troubles du comportement alimentaire et la nutrition de performance.', city: 'Strasbourg', specialties: ['troubles alimentaires', 'nutrition performance', 'alimentation intuitive'], diplomas: ['DUT Genie Biologique', 'DU TCA', 'BTS Dietetique'], level: 'AVANCE', experience: 10, hourlyRate: 70 } } } }),
    prisma.user.create({ data: { email: 'romain.muller@email.com', passwordHash, firstName: 'Romain', lastName: 'Muller', role: 'INTERVENANT', verificationStatus: 'VERIFIED', profile: { create: { bio: 'Coach natation et aquafitness. Ancien nageur de compétition nationale. Cours adultes débutants à confirmés, rééducation aquatique.', city: 'Mulhouse', specialties: ['natation', 'aquafitness', 'reeducation aquatique'], diplomas: ['Maître Nageur Sauveteur', 'BPJEPS AAN'], level: 'ELITE', experience: 13, hourlyRate: 55 } } } }),

    // Lille & Hauts-de-France
    prisma.user.create({ data: { email: 'maxime.lecomte@email.com', passwordHash, firstName: 'Maxime', lastName: 'Lecomte', role: 'INTERVENANT', verificationStatus: 'VERIFIED', profile: { create: { bio: 'Coach musculation et nutrition sportive. Accompagnement prise de masse, sèche et remise en forme. Suivi en salle ou à domicile.', city: 'Lille', specialties: ['musculation', 'seche', 'prise de masse'], diplomas: ['BTS STAPS', 'Nutritionniste sportif certifie'], level: 'AVANCE', experience: 6, hourlyRate: 50 } } } }),
    prisma.user.create({ data: { email: 'pauline.lefebvre@email.com', passwordHash, firstName: 'Pauline', lastName: 'Lefebvre', role: 'INTERVENANT', verificationStatus: 'VERIFIED', profile: { create: { bio: 'Professeure de danse et coach fitness. Zumba, step, danse contemporaine. Animations séances collectives festives et dynamiques.', city: 'Roubaix', specialties: ['zumba', 'danse fitness', 'step'], diplomas: ['Professeure de danse DE', 'BPJEPS AF'], level: 'INTERMEDIAIRE', experience: 5, hourlyRate: 48 } } } }),

    // Rennes & Bretagne
    prisma.user.create({ data: { email: 'yann.le-gall@email.com', passwordHash, firstName: 'Yann', lastName: 'Le Gall', role: 'INTERVENANT', verificationStatus: 'VERIFIED', profile: { create: { bio: 'Coach outdoor et survivaliste. Randonnée, trail, sports de pleine nature. Ateliers team-building nature pour entreprises.', city: 'Rennes', specialties: ['outdoor', 'trail', 'team-building nature'], diplomas: ['BPJEPS Activites de Randonnee', 'Guide de montagne stagiaire'], level: 'AVANCE', experience: 9, hourlyRate: 60 } } } }),
    prisma.user.create({ data: { email: 'marine.guichard@email.com', passwordHash, firstName: 'Marine', lastName: 'Guichard', role: 'INTERVENANT', verificationStatus: 'VERIFIED', profile: { create: { bio: 'Coach en nutrition végétale et spécialiste de l\'alimentation anti-inflammatoire. Consultations individuelles et ateliers cuisine santé.', city: 'Brest', specialties: ['alimentation vegetale', 'anti-inflammatoire', 'ateliers cuisine'], diplomas: ['Nutritionniste certifiee', 'DU Phytotherapie Nutrition'], level: 'INTERMEDIAIRE', experience: 3, hourlyRate: 52 } } } }),

    // Nice & Côte d'Azur
    prisma.user.create({ data: { email: 'giovanni.ferrari@email.com', passwordHash, firstName: 'Giovanni', lastName: 'Ferrari', role: 'INTERVENANT', verificationStatus: 'VERIFIED', profile: { create: { bio: 'Coach tennis et padel. Ancien joueur ATP. Cours tous niveaux, perfectionnement technique et préparation aux compétitions amateurs.', city: 'Nice', specialties: ['tennis', 'padel', 'preparation competition'], diplomas: ['DE Tennis', 'Moniteur Padel'], level: 'ELITE', experience: 20, hourlyRate: 85 } } } }),
    prisma.user.create({ data: { email: 'stephanie.vidal@email.com', passwordHash, firstName: 'Stéphanie', lastName: 'Vidal', role: 'INTERVENANT', verificationStatus: 'VERIFIED', profile: { create: { bio: 'Coach en bienêtre et thérapie par le mouvement. Danse-thérapie, stretching profond, techniques de relaxation avancées.', city: 'Cannes', specialties: ['danse-therapie', 'stretching', 'relaxation'], diplomas: ['Diplome Danse-Therapie', 'Certification Yin Yoga'], level: 'AVANCE', experience: 11, hourlyRate: 68 } } } }),
  ]);

  // --- Entreprises ---
  const entreprise1 = await prisma.user.create({
    data: {
      email: 'rh@acmecorp.fr',
      passwordHash,
      firstName: 'Claire',
      lastName: 'Fontaine',
      role: 'ENTREPRISE',
      companyName: 'Acme Corp',
      siret: '12345678901234',
      verificationStatus: 'VERIFIED',
      joinCode: 'ACME-2026',
    },
  });

  const entreprise2 = await prisma.user.create({
    data: {
      email: 'wellness@techstart.fr',
      passwordHash,
      firstName: 'Thomas',
      lastName: 'Renard',
      role: 'ENTREPRISE',
      companyName: 'TechStart SAS',
      siret: '98765432109876',
      verificationStatus: 'VERIFIED',
      joinCode: 'TECH-2026',
    },
  });

  const entreprise3 = await prisma.user.create({
    data: {
      email: 'sport@industria.fr',
      passwordHash,
      firstName: 'Marie',
      lastName: 'Leblanc',
      role: 'ENTREPRISE',
      companyName: 'Industria SA',
      siret: '11223344556677',
      verificationStatus: 'VERIFIED',
      joinCode: 'INDU-2026',
    },
  });

  // --- Clients ---
  const client1 = await prisma.user.create({
    data: {
      email: 'marvin.dupont@email.com',
      passwordHash,
      firstName: 'marvin',
      lastName: 'Dupont',
      role: 'CLIENT',
      verificationStatus: 'VERIFIED',
      profile: {
        create: {
          level: 'DEBUTANT',
          objectives: ['remise en forme', 'perte de poids'],
          sportType: 'fitness',
          constraints: 'Mal de dos chronique',
          city: 'Angers',
        },
      },
    },
  });

  const client2 = await prisma.user.create({
    data: {
      email: 'sarah.benali@email.com',
      passwordHash,
      firstName: 'Sarah',
      lastName: 'Benali',
      role: 'CLIENT',
      verificationStatus: 'VERIFIED',
      profile: {
        create: {
          level: 'AVANCE',
          objectives: ['competition triathlon', 'optimisation performance'],
          sportType: 'triathlon',
          constraints: null,
          city: 'Paris',
        },
      },
    },
  });

  console.log('Utilisateurs crees');

  // --- Services ---
  const services = await Promise.all([
    prisma.service.create({
      data: {
        name: 'Coaching sportif individuel',
        category: 'SPORT',
        durationMinutes: 60,
        price: 55.0,
        description: 'Seance personnalisee avec un coach diplome.',
        availableInPlans: ['ESSENTIEL_ENTREPRISE', 'BOOST_ENTREPRISE', 'ULTRA_ENTREPRISE'],
      },
    }),
    prisma.service.create({
      data: {
        name: 'Coaching sportif duo',
        category: 'SPORT',
        durationMinutes: 60,
        price: 35.0,
        description: 'Seance en duo, ideal pour progresser a deux.',
        availableInPlans: ['ESSENTIEL_ENTREPRISE', 'BOOST_ENTREPRISE', 'ULTRA_ENTREPRISE'],
      },
    }),
    prisma.service.create({
      data: {
        name: 'Bilan nutritionnel',
        category: 'NUTRITION',
        durationMinutes: 90,
        price: 70.0,
        description: 'Analyse complete de vos habitudes alimentaires.',
        availableInPlans: ['ESSENTIEL_ENTREPRISE', 'BOOST_ENTREPRISE', 'ULTRA_ENTREPRISE'],
      },
    }),
    prisma.service.create({
      data: {
        name: 'Preparation mentale',
        category: 'MENTAL',
        durationMinutes: 60,
        price: 65.0,
        description: 'Travail sur la concentration et la gestion du stress.',
        availableInPlans: ['BOOST_ENTREPRISE', 'ULTRA_ENTREPRISE'],
      },
    }),
    prisma.service.create({
      data: {
        name: 'Seance de yoga',
        category: 'BIENETRE',
        durationMinutes: 75,
        price: 40.0,
        description: 'Yoga Vinyasa adapte a tous niveaux.',
        availableInPlans: ['ESSENTIEL_ENTREPRISE', 'BOOST_ENTREPRISE', 'ULTRA_ENTREPRISE'],
      },
    }),
    prisma.service.create({
      data: {
        name: 'Atelier bien-etre collectif',
        category: 'BIENETRE',
        durationMinutes: 90,
        price: 20.0,
        description: 'Atelier collectif meditation, respiration et gestion du stress pour equipes.',
        availableInPlans: ['ESSENTIEL_ENTREPRISE', 'BOOST_ENTREPRISE', 'ULTRA_ENTREPRISE'],
      },
    }),
    prisma.service.create({
      data: {
        name: 'Coaching nutrition entreprise',
        category: 'NUTRITION',
        durationMinutes: 60,
        price: 50.0,
        description: 'Accompagnement nutritionnel collectif adapte aux salaries.',
        availableInPlans: ['BOOST_ENTREPRISE', 'ULTRA_ENTREPRISE'],
      },
    }),
  ]);

  console.log('Services crees');

  // --- Services coach B2C (paiement direct via Stripe Connect) ---
  await prisma.coachService.createMany({
    data: [
      { intervenantId: coach.id, name: 'Séance coaching personnalisée', description: 'Séance individuelle sur mesure : renforcement, cardio ou remise en forme selon vos objectifs.', category: 'SPORT', durationMinutes: 60, price: 55.0, sessionType: 'SOLO' },
      { intervenantId: coach.id, name: 'Séance duo', description: 'Entraînez-vous à deux : motivation garantie et tarif partagé.', category: 'SPORT', durationMinutes: 60, price: 40.0, sessionType: 'DUO', maxParticipants: 2 },
      { intervenantId: coach.id, name: 'Programme running 45 min', description: 'Préparation course à pied : fractionné, allure, technique de foulée.', category: 'SPORT', durationMinutes: 45, price: 45.0, sessionType: 'SOLO' },
      { intervenantId: nutritionist.id, name: 'Consultation nutrition', description: 'Bilan alimentaire complet et plan personnalisé.', category: 'NUTRITION', durationMinutes: 60, price: 65.0, sessionType: 'SOLO' },
      { intervenantId: psycho.id, name: 'Séance préparation mentale', description: 'Gestion du stress et optimisation de la performance.', category: 'MENTAL', durationMinutes: 60, price: 75.0, sessionType: 'SOLO' },
    ],
  });

  console.log('Services coach B2C crees');

  // --- Abonnements entreprises ---
  const now = new Date();

  // Acme Corp - ESSENTIEL_ENTREPRISE annuel
  const endEssentiel = new Date(now);
  endEssentiel.setFullYear(endEssentiel.getFullYear() + 1);
  await prisma.subscription.create({
    data: { userId: entreprise1.id, plan: 'ESSENTIEL_ENTREPRISE', billingCycle: 'YEARLY', startDate: now, endDate: endEssentiel, status: 'ACTIVE' },
  });

  // TechStart - BOOST_ENTREPRISE mensuel
  const endBoost = new Date(now);
  endBoost.setMonth(endBoost.getMonth() + 1);
  await prisma.subscription.create({
    data: { userId: entreprise2.id, plan: 'BOOST_ENTREPRISE', billingCycle: 'MONTHLY', startDate: now, endDate: endBoost, status: 'ACTIVE' },
  });

  // Industria - ULTRA_ENTREPRISE annuel
  const endUltra = new Date(now);
  endUltra.setFullYear(endUltra.getFullYear() + 1);
  await prisma.subscription.create({
    data: { userId: entreprise3.id, plan: 'ULTRA_ENTREPRISE', billingCycle: 'YEARLY', startDate: now, endDate: endUltra, status: 'ACTIVE' },
  });

  console.log('Abonnements crees');

  // --- RDV confirme ---
  const rdvConfirmed = await prisma.appointment.create({
    data: {
      clientId: client1.id,
      intervenantId: coach.id,
      serviceId: services[0].id,
      scheduledAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // dans 7 jours
      durationMinutes: 60,
      status: 'CONFIRMED',
      notes: 'Premiere seance d\'evaluation',
      qrToken: crypto.randomUUID(),
    },
  });

  // --- RDV termine avec compte-rendu ---
  const rdvDone = await prisma.appointment.create({
    data: {
      clientId: client2.id,
      intervenantId: coach.id,
      serviceId: services[0].id,
      scheduledAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // il y a 7 jours
      durationMinutes: 60,
      status: 'DONE',
    },
  });

  await prisma.sessionReport.create({
    data: {
      appointmentId: rdvDone.id,
      intervenantId: coach.id,
      notes: 'Excellente seance. Sarah montre une progression remarquable sur les exercices de gainage. Intensite augmentee progressivement.',
      objectivesUpdate: 'Objectif court terme : maintenir 3 seances/semaine. Focus sur le travail de seuil.',
      rating: 5,
    },
  });

  console.log('RDV et comptes-rendus crees');

  // ============================================================
  // --- DEMO DATA HR DASHBOARD (Acme Corp / rh@acmecorp.fr) ----
  // ============================================================
  // Objectif : alimenter le dashboard DRH avec 6 mois d'historique
  // pour eviter les "0 / 0 / 0 / —" sur les ecrans Stats/Analytics.
  // 30 collaborateurs Acme Corp + ~200 RDV repartis sur les 4 categories.
  console.log('Seeding donnees demo DRH Acme Corp...');

  // Pool de prenoms / noms pour 30 collaborateurs realistes
  const demoFirstNames = [
    'Lucas', 'Emma', 'Hugo', 'Chloe', 'Louis', 'Manon', 'Gabriel', 'Lea',
    'Arthur', 'Camille', 'Raphael', 'Sarah', 'Jules', 'Ines', 'Adam', 'Lina',
    'Maxime', 'Anais', 'Antoine', 'Julie', 'Theo', 'Clara', 'Nathan', 'Mathilde',
    'Paul', 'Eva', 'Tom', 'Alice', 'Leo', 'Romane',
  ];
  const demoLastNames = [
    'Dubois', 'Lefevre', 'Moreau', 'Laurent', 'Simon', 'Michel', 'Garcia',
    'David', 'Bertrand', 'Roux', 'Vincent', 'Fournier', 'Morel', 'Girard',
    'Andre', 'Mercier', 'Boyer', 'Lambert', 'Bonnet', 'Francois', 'Martinez',
    'Legrand', 'Garnier', 'Faure', 'Rousseau', 'Blanc', 'Guerin', 'Muller',
    'Henry', 'Roussel',
  ];

  // Cree 30 comptes collaborateurs Acme Corp
  const demoEmployees = [];
  for (let i = 0; i < 30; i++) {
    const firstName = demoFirstNames[i];
    const lastName = demoLastNames[i];
    const objectivesPool = [
      ['remise en forme', 'perte de poids'],
      ['gestion du stress', 'mieux dormir'],
      ['equilibre alimentaire'],
      ['preparation marathon'],
      ['renforcement musculaire', 'tonification'],
      ['flexibilite', 'yoga'],
      ['bien-etre general'],
      ['nutrition sportive'],
    ];
    const sportTypePool = ['fitness', 'running', 'yoga', 'natation', 'cyclisme', 'crossfit', null];
    const levelPool = ['DEBUTANT', 'INTERMEDIAIRE', 'AVANCE'];
    const employee = await prisma.user.create({
      data: {
        email: `collaborateur${i + 1}@acmecorp.fr`,
        passwordHash,
        firstName,
        lastName,
        role: 'CLIENT',
        verificationStatus: 'VERIFIED',
        employerCompanyId: entreprise1.id,
        emailVerifiedAt: new Date(),
        acceptedTermsAt: new Date(),
        profile: {
          create: {
            level: levelPool[i % levelPool.length],
            objectives: objectivesPool[i % objectivesPool.length],
            sportType: sportTypePool[i % sportTypePool.length],
            city: 'Angers',
          },
        },
      },
    });
    demoEmployees.push(employee);
  }
  console.log(`  ${demoEmployees.length} collaborateurs Acme Corp crees`);

  // Categories et leur poids :
  //   SPORT 45%, BIENETRE 25%, NUTRITION 20%, MENTAL 10%
  // Mapping services[] (cf. plus haut) :
  //   services[0] SPORT individuel, services[1] SPORT duo
  //   services[2] NUTRITION bilan, services[6] NUTRITION coaching entreprise
  //   services[3] MENTAL preparation mentale
  //   services[4] BIENETRE yoga, services[5] BIENETRE atelier collectif
  const categoryPlan = [
    { service: services[0], category: 'SPORT', intervenant: coach, weight: 30 },
    { service: services[1], category: 'SPORT', intervenant: coach, weight: 15 },
    { service: services[4], category: 'BIENETRE', intervenant: psycho, weight: 15 },
    { service: services[5], category: 'BIENETRE', intervenant: coach, weight: 10 },
    { service: services[2], category: 'NUTRITION', intervenant: nutritionist, weight: 12 },
    { service: services[6], category: 'NUTRITION', intervenant: nutritionist, weight: 8 },
    { service: services[3], category: 'MENTAL', intervenant: psycho, weight: 10 },
  ];
  // Construit un tableau d'index pondere pour tirer une categorie
  const weightedPool = [];
  categoryPlan.forEach((entry, idx) => {
    for (let w = 0; w < entry.weight; w++) weightedPool.push(idx);
  });

  // Generateur pseudo-aleatoire deterministe pour reproductibilite des demos
  let seedState = 42;
  const rnd = () => {
    seedState = (seedState * 9301 + 49297) % 233280;
    return seedState / 233280;
  };
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  const pickInt = (min, max) => Math.floor(rnd() * (max - min + 1)) + min;

  // Notes types pour comptes-rendus
  const sessionNotesPool = {
    SPORT: [
      'Bonne energie aujourd\'hui, progression nette sur les squats. Charge augmentee de 5kg.',
      'Travail cardio sur tapis, intervalles 30/30. Frequence cardiaque bien controlee.',
      'Seance HIIT complete. Recuperation a travailler entre les series.',
      'Focus gainage et stabilite. Bonne execution des planches laterales.',
      'Course fractionnee. Sensations en amelioration constante.',
    ],
    BIENETRE: [
      'Seance yoga vinyasa. Respiration de plus en plus posee.',
      'Atelier collectif tres engageant, dynamique d\'equipe positive.',
      'Travail sur la posture assise au bureau, etirements cibles dos/nuque.',
      'Sequence yin yoga axee sur la detente du bassin et des hanches.',
      'Pratique meditative guidee, 15 min de pleine conscience.',
    ],
    NUTRITION: [
      'Bilan alimentaire complet. Ajustement protein/glucides discute.',
      'Plan repas semaine etabli. Focus sur le batch cooking du dimanche.',
      'Revue des collations bureau. Substitution barres industrielles par fruits secs.',
      'Hydratation insuffisante identifiee. Objectif 1,5L/jour mis en place.',
      'Atelier collectif sur les macronutriments, tres bonne participation.',
    ],
    MENTAL: [
      'Travail sur la coherence cardiaque, technique 365 maitrisee.',
      'Strategies de gestion du stress en reunion. Outils STOP introduits.',
      'Exercice de visualisation positive avant une echeance importante.',
      'Detection des pensees automatiques negatives, recadrage cognitif.',
      'Routine matinale mise en place pour ameliorer la concentration.',
    ],
  };
  const reviewCommentsPool = [
    'Tres bonne seance, coach a l\'ecoute et professionnel.',
    'Exactement ce qu\'il me fallait, je me sens deja mieux.',
    'Excellente experience, je recommande vivement.',
    'Cours bien structure, je sens deja les progres.',
    'Coach pedagogue, explications claires.',
    'Seance dynamique et adaptee a mon niveau.',
    'Tres satisfait du suivi personnalise.',
    'Bonne ambiance, format adapte aux collaborateurs.',
    null,
    null,
  ];

  // Construction des RDV : 6 mois passes + 1 mois futur
  // ~200 RDV au total => moyenne ~6-7 RDV/employe sur 6 mois
  const totalAppointments = 200;
  const sixMonthsMs = 6 * 30 * 24 * 60 * 60 * 1000;
  const oneMonthFutureMs = 30 * 24 * 60 * 60 * 1000;
  const nowTs = Date.now();

  const appointmentsToCreate = [];
  for (let i = 0; i < totalAppointments; i++) {
    // 85% passe, 15% futur (CONFIRMED)
    const isPast = rnd() < 0.85;
    const offsetMs = isPast
      ? -Math.floor(rnd() * sixMonthsMs) - 24 * 60 * 60 * 1000
      : Math.floor(rnd() * oneMonthFutureMs) + 24 * 60 * 60 * 1000;
    const scheduledAt = new Date(nowTs + offsetMs);
    // Heures realistes (entre 8h et 19h, sur des creneaux de 30 min)
    const hour = pickInt(8, 19);
    const minute = pick([0, 30]);
    scheduledAt.setHours(hour, minute, 0, 0);

    const plan = categoryPlan[pick(weightedPool)];
    const employee = pick(demoEmployees);
    const status = isPast ? 'DONE' : 'CONFIRMED';

    appointmentsToCreate.push({
      clientId: employee.id,
      intervenantId: plan.intervenant.id,
      serviceId: plan.service.id,
      scheduledAt,
      durationMinutes: plan.service.durationMinutes,
      status,
      category: plan.category,
    });
  }

  // Tri chronologique pour des ids coherents
  appointmentsToCreate.sort((a, b) => a.scheduledAt - b.scheduledAt);

  // Creation des appointments + (pour DONE) sessionReport + review
  let doneCount = 0;
  let confirmedCount = 0;
  for (const appt of appointmentsToCreate) {
    const created = await prisma.appointment.create({
      data: {
        clientId: appt.clientId,
        intervenantId: appt.intervenantId,
        serviceId: appt.serviceId,
        scheduledAt: appt.scheduledAt,
        durationMinutes: appt.durationMinutes,
        status: appt.status,
        paymentStatus: appt.status === 'DONE' ? 'paid' : 'unpaid',
        coveredByCompany: true,
        qrToken: appt.status === 'CONFIRMED' ? crypto.randomUUID() : null,
        attendanceStatus: appt.status === 'DONE' ? 'PRESENT' : null,
      },
    });

    if (appt.status === 'DONE') {
      doneCount++;
      // Session report
      await prisma.sessionReport.create({
        data: {
          appointmentId: created.id,
          intervenantId: appt.intervenantId,
          notes: pick(sessionNotesPool[appt.category]),
          rating: pickInt(4, 5),
        },
      });
      // Review : 80% des seances DONE recoivent un avis client
      if (rnd() < 0.8) {
        // Distribution des notes : 60% 5*, 30% 4*, 8% 3*, 2% 2*
        const r = rnd();
        let rating;
        if (r < 0.6) rating = 5;
        else if (r < 0.9) rating = 4;
        else if (r < 0.98) rating = 3;
        else rating = 2;
        await prisma.review.create({
          data: {
            appointmentId: created.id,
            clientId: appt.clientId,
            intervenantId: appt.intervenantId,
            rating,
            comment: pick(reviewCommentsPool),
          },
        });
      }
    } else {
      confirmedCount++;
    }
  }
  console.log(`  ${doneCount} RDV DONE + ${confirmedCount} RDV CONFIRMED crees (Acme Corp)`);
  console.log('Donnees demo DRH pretes');


  // --- Produits marketplace (dropshipping-lite) ---
  await prisma.product.createMany({
    data: [
      {
        name: 'Tapis de yoga premium antidérapant',
        description: 'Tapis 6 mm en TPE écologique, double face antidérapante, avec sangle de transport. Idéal yoga, pilates et étirements.',
        priceCents: 3990,
        brand: 'ZenFlow',
        category: 'Équipement',
        externalProviderUrl: 'https://partenaire.example.com/zenflow/tapis-premium',
      },
      {
        name: 'Kettlebell fonte 12 kg',
        description: 'Kettlebell en fonte revêtement néoprène, poignée large pour swings, squats et renforcement complet.',
        priceCents: 4490,
        brand: 'IronCore',
        category: 'Équipement',
        externalProviderUrl: 'https://partenaire.example.com/ironcore/kettlebell-12',
      },
      {
        name: 'Gourde isotherme 750 ml',
        description: 'Inox double paroi : garde vos boissons froides 24 h ou chaudes 12 h. Sans BPA.',
        priceCents: 2490,
        brand: 'HydraPro',
        category: 'Accessoires',
        externalProviderUrl: 'https://partenaire.example.com/hydrapro/gourde-750',
      },
      {
        name: 'Bandes élastiques de résistance (lot de 5)',
        description: 'Set de 5 bandes de résistances progressives (5 à 40 kg) avec pochette de rangement et guide d\'exercices.',
        priceCents: 1990,
        brand: 'FlexBand',
        category: 'Équipement',
        externalProviderUrl: 'https://partenaire.example.com/flexband/set-5',
      },
      {
        name: 'Protéine vegan chocolat 1 kg',
        description: 'Protéine végétale (pois, riz) 22 g de protéines par dose, sans sucres ajoutés, goût chocolat.',
        priceCents: 2990,
        brand: 'GreenFuel',
        category: 'Nutrition',
        externalProviderUrl: 'https://partenaire.example.com/greenfuel/vegan-choco',
      },
    ],
  });

  console.log('Produits marketplace crees');
  console.log('RDV et comptes-rendus crees');
  console.log('\nSeeding termine !');
  console.log('\nComptes de test :');
  console.log('  Admin       : admin@goupylsport.fr / Password1!');
  console.log('  Coach       : marc.leroy@email.com / Password1!');
  console.log('  Nutritio.   : sophie.martin@email.com / Password1!');
  console.log('  Psycho      : julien.blanc@email.com / Password1!');
  console.log('  Client 1    : marvin.dupont@email.com / Password1! (particulier)');
  console.log('  Client 2    : sarah.benali@email.com / Password1! (particulier)');
  console.log('  Entreprise 1: rh@acmecorp.fr / Password1! (ESSENTIEL_ENTREPRISE annuel)');
  console.log('  Entreprise 2: wellness@techstart.fr / Password1! (BOOST_ENTREPRISE mensuel)');
  console.log('  Entreprise 3: sport@industria.fr / Password1! (ULTRA_ENTREPRISE annuel)');
  console.log('');
  console.log('Demo DRH Acme Corp :');
  console.log('  Compte DRH       : rh@acmecorp.fr / Password1! (joinCode ACME-2026)');
  console.log('  Collaborateurs   : collaborateur1@acmecorp.fr ... collaborateur30@acmecorp.fr / Password1!');
  console.log('  Historique RDV   : ~200 seances sur 6 mois (Sport 45% / Bienetre 25% / Nutrition 20% / Mental 10%)');
}

main()
  .catch((e) => {
    console.error('Erreur de seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
