const { randomUUID } = require('crypto');
const prisma = require('../config/database');
const ApiError = require('../utils/apiError');

const ALLOWED_TYPES = ['ID_CARD', 'DIPLOMA', 'RC_PRO', 'OTHER'];

const DOC_SELECT = {
  id: true,
  type: true,
  originalName: true,
  mimeType: true,
  sizeBytes: true,
  status: true,
  adminNote: true,
  expiresAt: true,
  createdAt: true,
  updatedAt: true,
};

const saveDocument = async (userId, type, file) => {
  if (!ALLOWED_TYPES.includes(type)) {
    throw ApiError.badRequest('Type de document invalide.');
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (user && user.verificationStatus === 'REJECTED') {
    await prisma.user.update({
      where: { id: userId },
      data: { verificationStatus: 'PENDING', verificationNote: null },
    });
  }

  // Le contenu est stocké en base (bytea) — le disque de Render est éphémère.
  return prisma.document.create({
    data: {
      userId,
      type,
      storedName: randomUUID(),
      originalName: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      data: file.buffer,
      status: 'PENDING',
    },
    select: DOC_SELECT,
  });
};

const getMyDocuments = async (userId) => {
  const now = new Date();
  const docs = await prisma.document.findMany({
    where: { userId },
    select: DOC_SELECT,
    orderBy: { createdAt: 'desc' },
  });

  // Auto-expire documents past their expiresAt
  const expired = docs.filter((d) => d.expiresAt && d.expiresAt < now && d.status !== 'EXPIRED');
  if (expired.length > 0) {
    await prisma.document.updateMany({
      where: { id: { in: expired.map((d) => d.id) } },
      data: { status: 'EXPIRED' },
    });
    expired.forEach((d) => { d.status = 'EXPIRED'; });
  }

  return docs;
};

const getDocumentFile = async (documentId) => {
  const doc = await prisma.document.findUnique({ where: { id: documentId } });
  if (!doc) throw ApiError.notFound('Document non trouvé.');
  if (!doc.data) {
    // Document d'avant la migration : le fichier vivait sur le disque (perdu)
    throw ApiError.notFound('Fichier indisponible — demandez un nouvel envoi du document.');
  }
  return doc;
};

const deleteDocument = async (userId, documentId) => {
  const doc = await prisma.document.findUnique({ where: { id: documentId }, select: { id: true, userId: true, status: true } });
  if (!doc) throw ApiError.notFound('Document non trouvé.');
  if (doc.userId !== userId) throw ApiError.forbidden('Accès refusé.');
  // Un document validé par l'admin fait partie du dossier de vérification :
  // il ne peut plus être retiré par le professionnel.
  if (doc.status === 'VALIDATED') {
    throw ApiError.forbidden('Un document validé ne peut plus être supprimé.', 'DOCUMENT_LOCKED');
  }
  await prisma.document.delete({ where: { id: documentId } });
};

// Admin: update per-document status with optional note and expiry
const updateDocumentStatus = async (documentId, { status, adminNote, expiresAt }) => {
  const allowed = ['PENDING', 'VALIDATED', 'REJECTED', 'EXPIRED'];
  if (!allowed.includes(status)) throw ApiError.badRequest('Statut invalide.');

  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    include: { user: { select: { id: true } } },
  });
  if (!doc) throw ApiError.notFound('Document non trouvé.');

  const updated = await prisma.document.update({
    where: { id: documentId },
    data: {
      status,
      ...(adminNote !== undefined && { adminNote }),
      ...(expiresAt !== undefined && { expiresAt: expiresAt ? new Date(expiresAt) : null }),
    },
    select: DOC_SELECT,
  });

  return updated;
};

// Admin: get all documents for a given user
const getDocumentsForUser = async (userId) => {
  return prisma.document.findMany({
    where: { userId },
    select: DOC_SELECT,
    orderBy: { createdAt: 'desc' },
  });
};

module.exports = {
  saveDocument,
  getMyDocuments,
  getDocumentFile,
  deleteDocument,
  updateDocumentStatus,
  getDocumentsForUser,
};
