const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const prisma = require('../config/database');
const redis = require('../config/redis');
const resend = require('../config/email');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../config/jwt');
const ApiError = require('../utils/apiError');
const { verificationEmail, specificNeedEmail } = require('../utils/emailTemplates');

const REFRESH_TTL = 7 * 24 * 60 * 60;

const generateJoinCode = () => crypto.randomBytes(4).toString('hex').toUpperCase();

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Réponse utilisateur + émission des tokens, partagée par login/googleAuth
const issueSession = async (user) => {
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
    console.error('Erreur stockage refresh token:', err.message);
  }
  return { user: userResponse, accessToken, refreshToken };
};

const register = async ({ email, password, firstName, lastName, role, companyName, siret, joinCode, acceptedTerms, level, sportType, objectives, specificNeed }) => {
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
      // Questionnaire d'onboarding (objectifs, niveau, sport, besoin spécifique) → Profile
      ...(role === 'CLIENT' && (level || sportType || objectives?.length || specificNeed) && {
        profile: {
          create: {
            ...(level && { level }),
            ...(sportType && { sportType }),
            ...(objectives?.length && { objectives }),
            ...(specificNeed && { specificNeed }),
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

  // Notification à l'admin dédié pour les clients PRO / ELITE avec besoin spécifique
  if (role === 'CLIENT' && ['PRO', 'ELITE'].includes(level) && specificNeed) {
    try {
      const adminEmail = process.env.SPECIFIC_NEEDS_ADMIN_EMAIL
        || (await prisma.user.findFirst({ where: { role: 'ADMIN' }, select: { email: true } }))?.email;
      if (adminEmail) {
        const { subject, html } = specificNeedEmail(
          { firstName, lastName, email: user.email, level, sportType, specificNeed }
        );
        await resend.emails.send({
          from: 'Goupyl Sport <onboarding@resend.dev>',
          to: adminEmail,
          subject,
          html,
        });
      } else {
        console.warn('Aucun email admin pour notifier un besoin spécifique (définir SPECIFIC_NEEDS_ADMIN_EMAIL)');
      }
    } catch (err) {
      console.error('Erreur envoi email besoin spécifique:', err.message);
    }
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
  // Compte créé via Google : pas de mot de passe défini
  if (!user.passwordHash) {
    throw ApiError.badRequest('Ce compte utilise la connexion Google. Cliquez sur « Continuer avec Google ».', 'GOOGLE_ACCOUNT');
  }

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

// Connexion / inscription via Google (Google Identity Services — ID token vérifié côté serveur)
const googleAuth = async ({ credential, joinCode }) => {
  if (!process.env.GOOGLE_CLIENT_ID) {
    throw ApiError.badRequest('Connexion Google non configurée sur le serveur.', 'GOOGLE_NOT_CONFIGURED');
  }

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch {
    throw ApiError.unauthorized('Jeton Google invalide ou expiré.');
  }

  const email = payload?.email?.toLowerCase();
  if (!email || !payload.email_verified) {
    throw ApiError.badRequest('Adresse Google non vérifiée.', 'GOOGLE_EMAIL_UNVERIFIED');
  }

  let user = await prisma.user.findUnique({ where: { email } });

  if (user) {
    if (!user.isActive) throw ApiError.forbidden('Ce compte a ete desactive.');
    // Rattacher l'identité Google si le compte existait (créé par mot de passe)
    if (!user.googleId) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { googleId: payload.sub, emailVerifiedAt: user.emailVerifiedAt || new Date() },
      });
    }
  } else {
    // Nouvelle inscription via Google → toujours un CLIENT (particulier ou salarié).
    // Les rôles INTERVENANT/ENTREPRISE passent par le formulaire (documents / SIRET requis).
    const name = payload.name || '';
    const firstName = payload.given_name || name.split(' ')[0] || 'Utilisateur';
    const lastName = payload.family_name || name.split(' ').slice(1).join(' ') || 'Google';

    // Résolution éventuelle du joinCode (salarié)
    let employerCompanyId = null;
    if (joinCode) {
      const invite = await prisma.companyInvite.findUnique({ where: { token: joinCode } });
      if (invite && !invite.usedAt && invite.expiresAt > new Date()) {
        employerCompanyId = invite.companyId;
      } else {
        const company = await prisma.user.findUnique({ where: { joinCode } });
        if (company && company.role === 'ENTREPRISE') employerCompanyId = company.id;
      }
    }

    user = await prisma.user.create({
      data: {
        email,
        passwordHash: null,
        googleId: payload.sub,
        firstName,
        lastName,
        role: 'CLIENT',
        verificationStatus: 'VERIFIED',
        emailVerifiedAt: new Date(),
        acceptedTermsAt: new Date(),
        ...(employerCompanyId && { employerCompanyId }),
      },
    });

    if (joinCode && employerCompanyId) {
      const invite = await prisma.companyInvite.findUnique({ where: { token: joinCode } });
      if (invite && !invite.usedAt) {
        await prisma.companyInvite.update({ where: { token: joinCode }, data: { usedAt: new Date() } });
      }
    }
  }

  return issueSession(user);
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

module.exports = { register, login, googleAuth, refresh, logout, verifyEmail };
