const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} = require('@simplewebauthn/server');
const prisma = require('../config/database');
const redis = require('../config/redis');
const { generateAccessToken, generateRefreshToken } = require('../config/jwt');
const ApiError = require('../utils/apiError');

const RP_NAME = 'Goupyl Sport';
const RP_ID = process.env.PASSKEY_RP_ID || 'localhost';
const ORIGIN = process.env.PASSKEY_ORIGIN || 'http://localhost:5173';
const CHALLENGE_TTL = 300; // 5 min
const REFRESH_TTL = 7 * 24 * 60 * 60;

const challengeKey = (scope, id) => `passkey_challenge:${scope}:${id}`;

// ---- Registration (user already authenticated) ----

const beginRegistration = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { passkeys: true },
  });
  if (!user) throw ApiError.notFound('Utilisateur introuvable.');

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
    userID: Buffer.from(String(user.id)),
    userName: user.email,
    userDisplayName: `${user.firstName} ${user.lastName}`,
    attestationType: 'none',
    excludeCredentials: user.passkeys.map((pk) => ({
      id: pk.credentialId,
      transports: pk.transports ? pk.transports.split(',') : undefined,
    })),
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
    },
  });

  await redis.set(challengeKey('reg', user.id), options.challenge, 'EX', CHALLENGE_TTL);
  return options;
};

const finishRegistration = async (userId, response, nickname) => {
  const expectedChallenge = await redis.get(challengeKey('reg', userId));
  if (!expectedChallenge) throw ApiError.badRequest('Challenge expiré, réessayez.', 'CHALLENGE_EXPIRED');

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      requireUserVerification: false,
    });
  } catch (err) {
    throw ApiError.badRequest(`Vérification échouée: ${err.message}`, 'PASSKEY_VERIFY_FAILED');
  }

  if (!verification.verified || !verification.registrationInfo) {
    throw ApiError.badRequest('Enregistrement passkey invalide.', 'PASSKEY_INVALID');
  }

  const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;

  await prisma.passkey.create({
    data: {
      userId,
      credentialId: credential.id,
      publicKey: Buffer.from(credential.publicKey),
      counter: BigInt(credential.counter || 0),
      transports: response.response?.transports?.join(',') || null,
      deviceType: credentialDeviceType,
      backedUp: credentialBackedUp,
      nickname: nickname || null,
    },
  });

  await redis.del(challengeKey('reg', userId));
  return { success: true };
};

// ---- Authentication (usernameless discoverable) ----

const beginAuthentication = async (email) => {
  const options = await generateAuthenticationOptions({
    rpID: RP_ID,
    userVerification: 'preferred',
    // Empty allowCredentials lets the browser show any passkey for this RP (discoverable flow)
  });

  // Store challenge under the email (if provided) or a temporary id
  const scopeId = email ? email.toLowerCase() : options.challenge;
  await redis.set(challengeKey('auth', scopeId), options.challenge, 'EX', CHALLENGE_TTL);

  return { ...options, _scopeId: scopeId };
};

const finishAuthentication = async (scopeId, response) => {
  const expectedChallenge = await redis.get(challengeKey('auth', scopeId));
  if (!expectedChallenge) throw ApiError.badRequest('Challenge expiré, réessayez.', 'CHALLENGE_EXPIRED');

  const passkey = await prisma.passkey.findUnique({
    where: { credentialId: response.id },
    include: { user: true },
  });
  if (!passkey) throw ApiError.unauthorized('Passkey inconnue.');
  if (!passkey.user.isActive) throw ApiError.forbidden('Ce compte a été désactivé.');

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      credential: {
        id: passkey.credentialId,
        publicKey: passkey.publicKey,
        counter: Number(passkey.counter),
        transports: passkey.transports ? passkey.transports.split(',') : undefined,
      },
      requireUserVerification: false,
    });
  } catch (err) {
    throw ApiError.unauthorized(`Vérification échouée: ${err.message}`);
  }

  if (!verification.verified) throw ApiError.unauthorized('Authentification passkey invalide.');

  await prisma.passkey.update({
    where: { id: passkey.id },
    data: {
      counter: BigInt(verification.authenticationInfo.newCounter),
      lastUsedAt: new Date(),
    },
  });

  await redis.del(challengeKey('auth', scopeId));

  const user = passkey.user;
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
  await redis.set(`refresh_token:${user.id}`, refreshToken, 'EX', REFRESH_TTL);

  return { user: userResponse, accessToken, refreshToken };
};

// ---- Management ----

const list = async (userId) => {
  const passkeys = await prisma.passkey.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      nickname: true,
      deviceType: true,
      backedUp: true,
      lastUsedAt: true,
      createdAt: true,
    },
  });
  return passkeys;
};

const remove = async (userId, passkeyId) => {
  const pk = await prisma.passkey.findUnique({ where: { id: passkeyId } });
  if (!pk || pk.userId !== userId) throw ApiError.notFound('Passkey introuvable.');
  await prisma.passkey.delete({ where: { id: passkeyId } });
  return { success: true };
};

module.exports = {
  beginRegistration,
  finishRegistration,
  beginAuthentication,
  finishAuthentication,
  list,
  remove,
};
