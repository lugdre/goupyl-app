const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const prisma = require('../config/database');
const redis = require('../config/redis');
const resend = require('../config/email');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../config/jwt');
const ApiError = require('../utils/apiError');
const { verificationEmail } = require('../utils/emailTemplates');

const REFRESH_TTL = 7 * 24 * 60 * 60;

const generateJoinCode = () => crypto.randomBytes(4).toString('hex').toUpperCase();

const register = async ({ email, password, firstName, lastName, role, companyName, siret, joinCode, acceptedTerms }) => {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw ApiError.conflict('Un compte existe deja avec cet email.', 'EMAIL_ALREADY_EXISTS');

  // ENTREPRISE auto-vérifié dès qu'un SIRET valide est fourni (vérification Pappers à venir)
  // CLIENT et ADMIN toujours VERIFIED
  // INTERVENANT en PENDING jusqu'à validation admin des documents
  const verificationStatus = (role === 'ENTREPRISE' && siret) || ['CLIENT', 'ADMIN'].includes(role)
    ? 'VERIFIED'
    : 'PENDING';

  // Résolution du joinCode pour les salariés (CLIENT avec code)
  let employerCompanyId = null;
  if (role === 'CLIENT' && joinCode) {
    // Chercher d'abord une invitation par token
    const invite = await prisma.companyInvite.findUnique({ where: { token: joinCode } });
    if (invite && !invite.usedAt && invite.expiresAt > new Date()) {
      employerCompanyId = invite.companyId;
      // L'invitation sera marquée utilisée après la création du user
    } else {
      // Chercher une entreprise par son code permanent
      const company = await prisma.user.findUnique({ where: { joinCode } });
      if (!company || company.role !== 'ENTREPRISE') {
        throw ApiError.badRequest("Code d'entreprise invalide ou expiré.", 'INVALID_JOIN_CODE');
      }
      employerCompanyId = company.id;
    }
  }

  // Générer un code unique pour les entreprises
  let companyJoinCode = null;
  if (role === 'ENTREPRISE') {
    let code;
    let exists = true;
    while (exists) {
      code = generateJoinCode();
      exists = !!(await prisma.user.findUnique({ where: { joinCode: code } }));
    }
    companyJoinCode = code;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      firstName,
      lastName,
      role,
      verificationStatus,
      ...(companyName && { companyName }),
      ...(siret && { siret }),
      ...(companyJoinCode && { joinCode: companyJoinCode }),
      ...(employerCompanyId && { employerCompanyId }),
      ...(acceptedTerms && { acceptedTermsAt: new Date() }),
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      isActive: true,
      verificationStatus: true,
      employerCompanyId: true,
      joinCode: true,
      createdAt: true,
    },
  });

  // Envoi de l'email de vérification
  try {
    const token = crypto.randomBytes(32).toString('hex');
    await redis.set('email_verify:' + token, user.id, 'EX', 86400);
    const verifyUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
    const { subject, html } = verificationEmail(firstName, verifyUrl);
    await resend.emails.send({
      from: 'Goupyl Sport <onboarding@resend.dev>',
      to: user.email,
      subject,
      html,
    });
  } catch (err) {
    console.error('Erreur envoi email de vérification:', err.message);
  }

  // Marquer l'invitation comme utilisée si applicable
  if (role === 'CLIENT' && joinCode) {
    const invite = await prisma.companyInvite.findUnique({ where: { token: joinCode } });
    if (invite && !invite.usedAt) {
      await prisma.companyInvite.update({ where: { token: joinCode }, data: { usedAt: new Date() } });
    }
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  // Un hoquet Redis ne doit pas faire échouer une inscription déjà créée en base.
  try {
    await redis.set(`refresh_token:${user.id}`, refreshToken, 'EX', REFRESH_TTL);
  } catch (err) {
    console.error('Erreur stockage refresh token (register):', err.message);
  }

  return { user, accessToken, refreshToken };
};

const login = async ({ email, password }) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw ApiError.unauthorized('Email ou mot de passe incorrect.');
  if (!user.isActive) throw ApiError.forbidden('Ce compte a ete desactive.');

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw ApiError.unauthorized('Email ou mot de passe incorrect.');

  const userResponse = {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    isActive: user.isActive,
    verificationStatus: user.verificationStatus,
    verificationNote: user.verificationNote,
    employerCompanyId: user.employerCompanyId,
    joinCode: user.joinCode,
    createdAt: user.createdAt,
  };

  const accessToken = generateAccessToken(userResponse);
  const refreshToken = generateRefreshToken(userResponse);
  try {
    await redis.set(`refresh_token:${user.id}`, refreshToken, 'EX', REFRESH_TTL);
  } catch (err) {
    console.error('Erreur stockage refresh token (login):', err.message);
  }

  return { user: userResponse, accessToken, refreshToken };
};

const refresh = async (refreshToken) => {
  const decoded = verifyRefreshToken(refreshToken);
  const stored = await redis.get(`refresh_token:${decoded.userId}`);
  if (!stored || stored !== refreshToken) throw ApiError.unauthorized('Refresh token invalide ou revoque.');

  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
    select: { id: true, email: true, role: true, isActive: true },
  });
  if (!user || !user.isActive) throw ApiError.unauthorized('Utilisateur non trouve ou desactive.');

  const newAccessToken = generateAccessToken(user);
  return { accessToken: newAccessToken };
};

const logout = async (userId) => {
  await redis.del(`refresh_token:${userId}`);
};

const verifyEmail = async (token) => {
  const userId = await redis.get('email_verify:' + token);
  if (!userId) throw ApiError.badRequest('Lien de vérification invalide ou expiré.', 'INVALID_VERIFY_TOKEN');

  await prisma.user.update({
    where: { id: parseInt(userId) },
    data: { emailVerifiedAt: new Date() },
  });

  await redis.del('email_verify:' + token);
  return { success: true };
};

module.exports = { register, login, refresh, logout, verifyEmail };
