const prisma = require('../config/database');
const redis = require('../config/redis');
const ApiError = require('../utils/apiError');

const getMe = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      phone: true,
      companyName: true,
      avatarUrl: true,
      gender: true,
      isActive: true,
      verificationStatus: true,
      verificationNote: true,
      stripeAccountStatus: true,
      siret: true,
      employerCompanyId: true,
      createdAt: true,
      profile: true,
    },
  });
  if (!user) throw ApiError.notFound('Utilisateur non trouve.');
  return user;
};

const updateMe = async (userId, data) => {
  const { profile, ...userFields } = data;

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      ...userFields,
      ...(profile && {
        profile: {
          upsert: {
            create: profile,
            update: profile,
          },
        },
      }),
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      phone: true,
      companyName: true,
      avatarUrl: true,
      gender: true,
      isActive: true,
      profile: true,
    },
  });
  return updated;
};

const getIntervenants = async ({ city, courseLocation, maxRate, page = 1, limit = 20 }) => {
  const where = { role: 'INTERVENANT', isActive: true, verificationStatus: 'VERIFIED' };
  const profileFilter = {};
  if (city) profileFilter.city = { contains: city, mode: 'insensitive' };
  if (courseLocation) profileFilter.courseLocations = { has: courseLocation };
  if (maxRate && !Number.isNaN(Number(maxRate))) profileFilter.hourlyRate = { lte: Number(maxRate) };
  if (Object.keys(profileFilter).length) where.profile = profileFilter;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        gender: true,
        profile: {
          select: {
            bio: true,
            specialties: true,
            city: true,
            experience: true,
            hourlyRate: true,
            level: true,
            courseLocations: true,
          },
        },
      },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit),
    }),
    prisma.user.count({ where }),
  ]);

  // Enrich with real review stats
  const userIds = users.map((u) => u.id);
  const [reviewStats, sessionCounts] = await Promise.all([
    prisma.review.groupBy({
      by: ['intervenantId'],
      where: { intervenantId: { in: userIds } },
      _avg: { rating: true },
      _count: { id: true },
    }),
    prisma.appointment.groupBy({
      by: ['intervenantId'],
      where: { intervenantId: { in: userIds }, status: 'DONE' },
      _count: { id: true },
    }),
  ]);

  const reviewMap = {};
  for (const r of reviewStats) {
    reviewMap[r.intervenantId] = {
      averageRating: Math.round(r._avg.rating * 10) / 10,
      reviewCount: r._count.id,
    };
  }
  const sessionMap = {};
  for (const s of sessionCounts) {
    sessionMap[s.intervenantId] = s._count.id;
  }

  const enrichedUsers = users.map((u) => ({
    ...u,
    averageRating: reviewMap[u.id]?.averageRating || null,
    reviewCount: reviewMap[u.id]?.reviewCount || 0,
    sessionsDone: sessionMap[u.id] || 0,
  }));

  return {
    intervenants: enrichedUsers,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
    },
  };
};

const getIntervenantById = async (id) => {
  const user = await prisma.user.findFirst({
    where: { id, role: 'INTERVENANT', isActive: true },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      avatarUrl: true,
      gender: true,
      profile: true,
    },
  });
  if (!user) throw ApiError.notFound('Intervenant non trouve.');

  const [reviewAgg, sessionsDone] = await Promise.all([
    prisma.review.aggregate({
      where: { intervenantId: id },
      _avg: { rating: true },
      _count: { id: true },
    }),
    prisma.appointment.count({
      where: { intervenantId: id, status: 'DONE' },
    }),
  ]);

  return {
    ...user,
    averageRating: reviewAgg._avg.rating ? Math.round(reviewAgg._avg.rating * 10) / 10 : null,
    reviewCount: reviewAgg._count.id,
    sessionsDone,
  };
};

const getAllUsers = async ({ page = 1, limit = 20, role }) => {
  const where = role ? { role } : {};
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count({ where }),
  ]);
  return {
    users,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
    },
  };
};

const toggleUserActive = async (id, isActive) => {
  return prisma.user.update({
    where: { id },
    data: { isActive },
    select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true },
  });
};

const getPendingVerifications = async () => {
  return prisma.user.findMany({
    where: { verificationStatus: 'PENDING', role: 'INTERVENANT' },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      companyName: true,
      siret: true,
      createdAt: true,
      documents: {
        select: { id: true, type: true, originalName: true, mimeType: true, sizeBytes: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      },
    },
    orderBy: { createdAt: 'asc' },
  });
};

const verifyUser = async (id, status, note) => {
  if (!['VERIFIED', 'REJECTED'].includes(status)) {
    throw ApiError.badRequest('Statut invalide.');
  }

  // Un INTERVENANT ne peut être validé qu'avec un dossier complet :
  // pièce d'identité + au moins un diplôme (exigence du cahier des charges)
  if (status === 'VERIFIED') {
    const user = await prisma.user.findUnique({ where: { id }, select: { role: true } });
    if (user?.role === 'INTERVENANT') {
      const docs = await prisma.document.findMany({
        where: { userId: id, status: { not: 'REJECTED' } },
        select: { type: true },
      });
      const types = new Set(docs.map((d) => d.type));
      if (!types.has('ID_CARD') || !types.has('DIPLOMA')) {
        throw ApiError.badRequest(
          "Dossier incomplet : une pièce d'identité et au moins un diplôme sont requis pour valider un professionnel.",
          'INCOMPLETE_VERIFICATION_FILE'
        );
      }
    }
  }

  return prisma.user.update({
    where: { id },
    data: { verificationStatus: status, ...(note !== undefined && { verificationNote: note }) },
    select: { id: true, email: true, firstName: true, lastName: true, verificationStatus: true, verificationNote: true },
  });
};

const deleteMe = async (userId) => {
  // Révoquer le refresh token
  await redis.del('refresh_token:' + userId);

  // Suppression en ordre pour respecter les FK (documents et avatars vivent
  // en base : rien à nettoyer sur disque)
  await prisma.$transaction([
    prisma.review.deleteMany({ where: { OR: [{ clientId: userId }, { intervenantId: userId }] } }),
    prisma.payment.deleteMany({ where: { appointment: { OR: [{ clientId: userId }, { intervenantId: userId }] } } }),
    prisma.sessionReport.deleteMany({ where: { OR: [{ intervenantId: userId }, { appointment: { clientId: userId } }] } }),
    prisma.appointment.deleteMany({ where: { OR: [{ clientId: userId }, { intervenantId: userId }] } }),
    prisma.document.deleteMany({ where: { userId } }),
    prisma.subscription.deleteMany({ where: { userId } }),
    prisma.companyInvite.deleteMany({ where: { companyId: userId } }),
    prisma.coachService.deleteMany({ where: { intervenantId: userId } }),
    prisma.profile.deleteMany({ where: { userId } }),
    prisma.user.delete({ where: { id: userId } }),
  ]);

  return { success: true };
};

// L'image est stockée en base (bytea) et servie par GET /api/users/:id/avatar.
// Le paramètre ?v= (timestamp d'upload) invalide le cache navigateur à chaque
// changement de photo.
const uploadAvatar = async (userId, file) => {
  return prisma.user.update({
    where: { id: userId },
    data: {
      avatarData: file.buffer,
      avatarMimeType: file.mimetype,
      avatarUrl: `/api/users/${userId}/avatar?v=${Date.now()}`,
    },
    select: { id: true, email: true, firstName: true, lastName: true, role: true, avatarUrl: true },
  });
};

const getAvatar = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { avatarData: true, avatarMimeType: true },
  });
  if (!user?.avatarData) throw ApiError.notFound('Aucun avatar pour cet utilisateur.');
  return { data: user.avatarData, mimeType: user.avatarMimeType || 'image/jpeg' };
};

// ── Galerie photos coach (séances, matériel, lieux…) ─────────────────────

const MAX_GALLERY_PHOTOS = 12;

const listPhotos = async (intervenantId) => {
  const photos = await prisma.coachPhoto.findMany({
    where: { intervenantId },
    select: { id: true, createdAt: true }, // jamais les octets dans un listing
    orderBy: { createdAt: 'asc' },
  });
  return photos.map((p) => ({
    id: p.id,
    url: `/api/users/${intervenantId}/photos/${p.id}`,
    createdAt: p.createdAt,
  }));
};

const addPhoto = async (userId, file) => {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (user?.role !== 'INTERVENANT') throw ApiError.forbidden('Réservé aux professionnels.');

  const count = await prisma.coachPhoto.count({ where: { intervenantId: userId } });
  if (count >= MAX_GALLERY_PHOTOS) {
    throw ApiError.badRequest(`Galerie pleine (${MAX_GALLERY_PHOTOS} photos maximum). Supprimez une photo avant d'en ajouter.`, 'GALLERY_FULL');
  }

  const photo = await prisma.coachPhoto.create({
    data: { intervenantId: userId, data: file.buffer, mimeType: file.mimetype },
    select: { id: true, createdAt: true },
  });
  return { id: photo.id, url: `/api/users/${userId}/photos/${photo.id}`, createdAt: photo.createdAt };
};

const getPhoto = async (intervenantId, photoId) => {
  const photo = await prisma.coachPhoto.findUnique({ where: { id: photoId } });
  if (!photo || photo.intervenantId !== intervenantId) throw ApiError.notFound('Photo non trouvée.');
  return { data: photo.data, mimeType: photo.mimeType };
};

const deletePhoto = async (userId, photoId) => {
  const photo = await prisma.coachPhoto.findUnique({ where: { id: photoId }, select: { id: true, intervenantId: true } });
  if (!photo) throw ApiError.notFound('Photo non trouvée.');
  if (photo.intervenantId !== userId) throw ApiError.forbidden('Accès refusé.');
  await prisma.coachPhoto.delete({ where: { id: photoId } });
};

module.exports = { getMe, updateMe, getIntervenants, getIntervenantById, getAllUsers, toggleUserActive, getPendingVerifications, verifyUser, deleteMe, uploadAvatar, getAvatar, listPhotos, addPhoto, getPhoto, deletePhoto };
