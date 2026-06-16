require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Debut du seeding...');

  // Nettoyage dans l'ordre des dependances
  await prisma.sessionReport.deleteMany();
  await prisma.review.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.document.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.service.deleteMany();
  await prisma.resource.deleteMany();
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
        },
      },
    },
  });

  // --- Coachs supplementaires (partout en France) ---
  const extraCoaches = await Promise.all([
    // Paris & Île-de-France
    prisma.user.create({ data: { email: 'emma.rousseau@email.com', passwordHash, firstName: 'Emma', lastName: 'Rousseau', role: 'INTERVENANT', verificationStatus: 'VERIFIED', profile: { create: { bio: 'Coach fitness et yoga certifiée RYT-200, spécialisée dans la remise en forme post-grossesse et le yoga thérapeutique.', city: 'Paris', specialties: ['yoga', 'pilates', 'remise en forme'], diplomas: ['RYT-200 Yoga Alliance', 'BPJEPS AF'], level: 'AVANCE', experience: 7, hourlyRate: 65 } } } }),
    prisma.user.create({ data: { email: 'thomas.klein@email.com', passwordHash, firstName: 'Thomas', lastName: 'Klein', role: 'INTERVENANT', verificationStatus: 'VERIFIED', profile: { create: { bio: 'Préparateur physique ex-professionnel, ancien staff technique Ligue 1. Spécialiste haute performance et réathlétisation.', city: 'Paris', specialties: ['preparation physique', 'reathletisation', 'musculation'], diplomas: ['DE JEPS', 'Master STAPS'], level: 'ELITE', experience: 18, hourlyRate: 90 } } } }),
    prisma.user.create({ data: { email: 'amandine.petit@email.com', passwordHash, firstName: 'Amandine', lastName: 'Petit', role: 'INTERVENANT', verificationStatus: 'VERIFIED', profile: { create: { bio: 'Nutritionniste et micronutritionniste, consultations en cabinet et à domicile. Approche fonctionnelle et personnalisée.', city: 'Boulogne-Billancourt', specialties: ['micronutrition', 'nutrition fonctionnelle', 'perte de poids'], diplomas: ['DU Micronutrition', 'BTS Dietetique'], level: 'AVANCE', experience: 9, hourlyRate: 75 } } } }),
    prisma.user.create({ data: { email: 'kevin.moreau@email.com', passwordHash, firstName: 'Kévin', lastName: 'Moreau', role: 'INTERVENANT', verificationStatus: 'VERIFIED', profile: { create: { bio: 'Coach CrossFit certifié L2 et coach running. Préparation aux trails et compétitions d\'endurance.', city: 'Vincennes', specialties: ['crossfit', 'running', 'trail'], diplomas: ['CrossFit L2', 'BPJEPS AGFF'], level: 'ELITE', experience: 11, hourlyRate: 70 } } } }),

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

  // --- Ressources (articles + vidéos) ---
  await prisma.resource.createMany({
    data: [
      // ── ARTICLES ESSENTIEL (accès tous plans) ──────────────────────────────────
      {
        title: '5 étirements indispensables après une journée de travail',
        description: 'Réduisez les tensions musculaires accumulées au bureau avec cette routine de 10 minutes.',
        content: `## Pourquoi s'étirer après le travail ?

La sédentarité prolongée raccourcit les muscles fléchisseurs de hanche, raidit le dos et crée des déséquilibres posturaux. Quelques minutes d'étirements suffisent à inverser ces effets.

## Les 5 étirements clés

### 1. Étirement du psoas (fléchisseur de hanche)
Position : un genou à terre, pied arrière au sol. Avancez le bassin en gardant le dos droit. Tenez 30 secondes de chaque côté.

### 2. Étirement des ischio-jambiers
Assis au sol, jambes tendues, penchez-vous en avant en gardant le dos droit. Tenez 30 secondes.

### 3. Rotation thoracique
Assis en tailleur, placez une main derrière la tête. Rotatez le tronc côté droit puis gauche. 10 rotations de chaque côté.

### 4. Étirement du trapèze
Inclinez doucement la tête vers l'épaule droite, maintenez l'épaule gauche basse. 20 secondes de chaque côté.

### 5. Étirement pectoral contre le mur
Placez l'avant-bras contre le montant d'une porte, pivotez doucement le corps. Tenez 30 secondes.

## Conseils pratiques
- Respirez lentement et profondément pendant chaque étirement
- Ne forcez jamais jusqu'à la douleur
- Pratiquez cette routine tous les soirs pour des résultats visibles en 2 semaines`,
        type: 'ARTICLE',
        category: 'BIENETRE',
        access: 'ESSENTIEL',
        published: true,
      },
      {
        title: 'Bien dormir pour mieux performer : les bases de l\'hygiène du sommeil',
        description: 'Le sommeil est le premier facteur de récupération. Découvrez comment optimiser vos nuits.',
        content: `## Le sommeil, pilier de la performance

Un adulte a besoin de 7 à 9 heures de sommeil par nuit. La privation chronique de sommeil affecte la concentration, l'humeur, le système immunitaire et les performances physiques.

## Les règles d'or

### Régularité des horaires
Couchez-vous et levez-vous à la même heure, même le week-end. Votre horloge biologique (rythme circadien) est votre meilleure alliée.

### La chambre : un sanctuaire du sommeil
- Température idéale : 16-18°C
- Obscurité totale (masque si nécessaire)
- Silence ou bruit blanc
- Réservez le lit au sommeil et à l'intimité

### Préparer le sommeil
- Pas d'écrans 1h avant le coucher (la lumière bleue bloque la mélatonine)
- Pas d'alcool : il perturbe les cycles de sommeil profond
- Pas de sport intense après 20h
- Une routine relaxante : lecture, méditation, bain chaud

### Alimentation et sommeil
- Dîner léger et 2h avant de dormir
- Évitez la caféine après 14h
- La mélatonine naturelle est stimulée par le tryptophane (banane, noix, dinde)

## Outil pratique
Calculez votre heure de coucher idéale : si vous devez vous lever à 7h et avez besoin de 8h de sommeil, couchez-vous avant 23h (comptez 15 minutes d'endormissement).`,
        type: 'ARTICLE',
        category: 'BIENETRE',
        access: 'ESSENTIEL',
        published: true,
      },
      {
        title: 'Reprendre le sport à 30, 40 ou 50 ans : le guide complet',
        description: 'Comment reprendre une activité physique en toute sécurité après une longue pause.',
        content: `## Il n'est jamais trop tard

La sédentarité est le vrai ennemi. Reprendre le sport à tout âge apporte des bénéfices mesurables sur la santé cardiovasculaire, la densité osseuse, l'humeur et la longévité.

## Avant de commencer

### Bilan médical
Consultez votre médecin si vous avez plus de 40 ans ou si vous n'avez pas fait de sport depuis plus de 3 ans. Un électrocardiogramme d'effort peut être conseillé.

### Évaluation de votre niveau
- Test des 6 minutes de marche
- Nombre de pompes réalisables
- Flexibilité (pouvez-vous toucher vos pieds ?)

## Le plan de reprise progressif

### Semaines 1-4 : Phase d'éveil musculaire
- 3 sessions de 30 min par semaine
- Marche rapide, natation, vélo à faible intensité
- Priorité aux exercices de mobilité et de gainage léger

### Mois 2-3 : Phase de construction
- Augmentez à 4 sessions par semaine
- Introduisez la musculation avec des charges légères
- Ajoutez 10 minutes de cardio à chaque session

### Mois 4+ : Phase de consolidation
- Diversifiez les activités pour éviter la monotonie
- Fixez-vous des objectifs concrets (5km, cours collectifs...)

## Les erreurs à éviter
❌ Vouloir retrouver son niveau d'il y a 10 ans en 2 semaines
❌ Négliger l'échauffement et les étirements
❌ S'entraîner malgré la douleur
❌ Sous-estimer l'importance de la récupération`,
        type: 'ARTICLE',
        category: 'SPORT',
        access: 'ESSENTIEL',
        published: true,
      },

      // ── ARTICLES BOOST (plans Boost et Ultra) ──────────────────────────
      {
        title: 'Nutrition au travail : comment bien manger malgré un emploi du temps chargé',
        description: 'Stratégies concrètes pour maintenir une alimentation équilibrée même en période de rush.',
        content: `## Le défi de l'alimentation au bureau

Entre les réunions, les déjeuners d'affaires et le stress, l'alimentation est souvent la première victime d'un emploi du temps chargé. Voici comment reprendre le contrôle.

## Meal prep : cuisiner une fois, manger sainement toute la semaine

### La méthode en 3 étapes
1. **Planifiez** : le dimanche soir, décidez de vos repas de la semaine
2. **Cuisinez en batch** : préparez vos protéines (poulet, légumineuses, œufs durs), vos féculents (riz complet, quinoa, patate douce) et vos légumes en une seule session de 1h
3. **Assemblez** : chaque matin, composez votre boîte en 5 minutes

### Formule gagnante pour le déjeuner
- 1/2 assiette de légumes (crus ou cuits)
- 1/4 de protéines (150g de viande, 200g de légumineuses, 3 œufs)
- 1/4 de féculents complets

## Gérer les fringales

### Collations stratégiques
- Poignée de noix + 1 fruit
- Yaourt grec + quelques baies
- Carotte + houmous
- 1 carré de chocolat noir (>70%)

### Identifier les vraies fringales
Demandez-vous : est-ce de la faim physique (estomac vide) ou émotionnelle (stress, ennui) ? Boire un grand verre d'eau et attendre 10 minutes règle souvent la question.

## Le piège de la cantine d'entreprise

**Bonnes options :** entrées de légumes, viande grillée, fish & chips (pas frits), fromage blanc
**À limiter :** plats en sauce, pain blanc, desserts sucrés, sodas

## Hydratation : l'oublié de la performance

Une déshydratation de seulement 2% diminue les capacités cognitives. Objectif : 1,5 à 2L d'eau par jour. Astuce : posez une gourde sur votre bureau et finissez-la avant de partir.`,
        type: 'ARTICLE',
        category: 'NUTRITION',
        access: 'BOOST',
        published: true,
      },
      {
        title: 'Gestion du stress au travail : techniques validées par la science',
        description: 'Cohérence cardiaque, méditation, pauses actives : des outils concrets et prouvés.',
        content: `## Comprendre le stress pour mieux le gérer

Le stress n'est pas mauvais en soi : c'est une réponse adaptative. C'est le stress chronique qui pose problème. Il élève durablement le cortisol, affectant l'immunité, la mémoire et la santé cardiovasculaire.

## La cohérence cardiaque (technique 365)

**Le protocole :** 3 fois par jour, 6 respirations par minute, pendant 5 minutes.
- Inspirez 5 secondes
- Expirez 5 secondes
- Répétez

**Effets mesurés :** réduction du cortisol, amélioration de la variabilité cardiaque, baisse de l'anxiété. Les effets durent 6 heures après chaque session.

## La méditation de pleine conscience au bureau

Pas besoin de 30 minutes : 5 minutes suffisent pour un effet notable.

**Exercice de l'ancrage (STOP) :**
- **S**top : arrêtez ce que vous faites
- **T**ake a breath : respirez profondément 3 fois
- **O**bserve : observez vos sensations sans jugement
- **P**roceed : reprenez votre activité avec plus de clarté

## Pauses actives : la solution anti-stress sous-estimée

Une pause active de 5-10 minutes toutes les 90 minutes améliore la concentration et réduit le stress.
- Tour du bâtiment
- Exercices de respiration dans un couloir
- Quelques étirements à votre bureau

## La règle des 3 cerveaux

Distinguez ce qui est :
- **Urgent ET important** : traitez immédiatement
- **Important mais pas urgent** : planifiez
- **Ni urgent ni important** : déléguez ou supprimez

Cette clarté cognitive réduit le sentiment d'être dépassé de 60%.`,
        type: 'ARTICLE',
        category: 'MENTAL',
        access: 'BOOST',
        published: true,
      },
      {
        title: 'Les macronutriments expliqués : protéines, glucides, lipides',
        description: 'Comprendre les bases de la nutrition pour faire les bons choix alimentaires au quotidien.',
        content: `## Les 3 macronutriments essentiels

### Protéines (4 kcal/g)
**Rôle :** construction et réparation musculaire, enzymes, hormones, immunité
**Besoin :** 1,2 à 2g par kg de poids corporel pour une personne active
**Sources de qualité :**
- Animales : viande, poisson, œufs, produits laitiers
- Végétales : légumineuses, tofu, tempeh, edamame (associer avec des céréales pour les acides aminés complets)

### Glucides (4 kcal/g)
**Rôle :** carburant principal du cerveau et des muscles
**Pas tous égaux !** Préférez les glucides complexes à index glycémique bas.
- Bons : riz complet, patate douce, quinoa, légumineuses, fruits, légumes
- À limiter : pain blanc, sucre raffiné, sodas, jus industriels

**Fibre :** partie non digestible des glucides, indispensable pour le microbiote et la satiété. Objectif : 25-30g par jour.

### Lipides (9 kcal/g)
**Rôle :** hormones, absorption des vitamines liposolubles (A, D, E, K), santé cérébrale
**Les bons gras :**
- Oméga-3 : saumon, sardines, noix, graines de lin (anti-inflammatoires)
- Oméga-9 : huile d'olive, avocat
**À réduire :** graisses saturées (charcuterie, fromages gras) et graisses trans (produits industriels)

## La règle de l'assiette équilibrée

½ légumes | ¼ protéines | ¼ féculents complets + une bonne source de gras (avocat, huile d'olive, noix)

## Mythes à déconstruire

❌ "Les graisses font grossir" → C'est l'excès calorique global qui fait grossir
❌ "Il faut éviter les glucides le soir" → L'heure importe peu, ce sont les quantités qui comptent
❌ "Le sport compense tout" → On ne peut pas outrunner a bad diet`,
        type: 'ARTICLE',
        category: 'NUTRITION',
        access: 'BOOST',
        published: true,
      },

      // ── ARTICLE ULTRA ──────────────────────────────────────────────────
      {
        title: 'Performance mentale : le mental des champions appliqué au quotidien',
        description: 'Visualisation, dialogue intérieur positif, routines : les outils des sportifs d\'élite pour vous.',
        content: `## Le mental, 50% de la performance

Les meilleurs sportifs ne sont pas seulement les plus forts physiquement. Ils maîtrisent leur état mental. Ces techniques fonctionnent aussi bien dans le sport que dans la vie professionnelle.

## La visualisation mentale

**Principe :** votre cerveau ne distingue pas clairement un événement réel d'un événement imaginé de manière vivide. En visualisant une performance réussie, vous créez des schémas neuronaux qui facilitent l'action réelle.

**Protocole :**
1. Fermez les yeux dans un endroit calme
2. Respirez profondément 3 fois
3. Visualisez en détail la situation : les sensations, les sons, les émotions
4. Voyez-vous réussir
5. Ressentez la satisfaction associée

**Durée :** 5-10 minutes avant une situation importante (présentation, entretien, compétition).

## Le dialogue intérieur positif

Les self-talks négatifs ("je vais rater", "je suis nul") sabotent la performance. Remplacez-les par des instructions neutres ou positives.

- ❌ "Je vais me planter" → ✅ "Je me concentre sur mes points forts"
- ❌ "Je suis stressé" → ✅ "Je suis activé, prêt à performer"
- ❌ "C'est trop difficile" → ✅ "C'est un défi, je prends une étape à la fois"

## Les routines de performance

Les routines pré-performance réduisent l'anxiété en créant un sentiment de contrôle et d'automatisation.

**Exemple de routine matinale (20 min) :**
1. 5 min de cohérence cardiaque
2. 5 min de visualisation de la journée
3. 5 min de journaling (3 gratitudes, 1 intention)
4. 5 min d'activation physique (étirements, quelques squats)

## La gestion de l'échec

L'échec est une donnée, pas une identité. Après un résultat décevant :
1. **Analysez** (pas de rumination) : qu'est-ce qui n'a pas fonctionné ?
2. **Apprenez** : qu'est-ce que je vais faire différemment ?
3. **Repositionnez** : revenez au processus, pas au résultat

Les champions ne tombent pas moins que les autres. Ils se relèvent plus vite.`,
        type: 'ARTICLE',
        category: 'MENTAL',
        access: 'ULTRA',
        published: true,
      },

      // ── VIDÉOS ESSENTIEL ─────────────────────────────────────────────────────
      {
        title: 'Yoga du matin : routine 15 minutes pour bien démarrer la journée',
        description: 'Une séquence de yoga douce pour réveiller le corps et l\'esprit avant de commencer à travailler.',
        videoUrl: 'https://www.youtube.com/embed/VaoV1PrYft4',
        type: 'VIDEO',
        category: 'BIENETRE',
        access: 'ESSENTIEL',
        published: true,
      },
      {
        title: 'Renforcement musculaire sans matériel : 20 minutes full body',
        description: 'Une séance efficace de renforcement musculaire au poids de corps, réalisable partout.',
        videoUrl: 'https://www.youtube.com/embed/UItWltVZZmE',
        type: 'VIDEO',
        category: 'SPORT',
        access: 'ESSENTIEL',
        published: true,
      },
      {
        title: 'Méditation guidée anti-stress : 10 minutes pour décompresser',
        description: 'Une méditation guidée en français pour relâcher les tensions et retrouver le calme.',
        videoUrl: 'https://www.youtube.com/embed/O-6f5wQXSu8',
        type: 'VIDEO',
        category: 'MENTAL',
        access: 'ESSENTIEL',
        published: true,
      },

      // ── VIDÉOS BOOST ────────────────────────────────────────────────────
      {
        title: 'Comment construire une assiette équilibrée : guide visuel',
        description: 'Comprendre la méthode de l\'assiette pour manger sainement sans se prendre la tête.',
        videoUrl: 'https://www.youtube.com/embed/fqhYBTg73fw',
        type: 'VIDEO',
        category: 'NUTRITION',
        access: 'BOOST',
        published: true,
      },
      {
        title: 'Cohérence cardiaque : technique 365 expliquée et guidée',
        description: 'Apprenez et pratiquez la cohérence cardiaque, l\'outil anti-stress le plus efficace.',
        videoUrl: 'https://www.youtube.com/embed/vMHHEPFNfZ0',
        type: 'VIDEO',
        category: 'MENTAL',
        access: 'BOOST',
        published: true,
      },

      // ── VIDÉO ULTRA ─────────────────────────────────────────────────────
      {
        title: 'Préparation mentale : les techniques des champions olympiques',
        description: 'Découvrez comment les sportifs de haut niveau utilisent la visualisation et le self-talk.',
        videoUrl: 'https://www.youtube.com/embed/X6aUREVWsRY',
        type: 'VIDEO',
        category: 'MENTAL',
        access: 'ULTRA',
        published: true,
      },
    ],
  });

  console.log('Ressources creees');
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
