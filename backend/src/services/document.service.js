const path = require('path');
const fs = require('fs');
const prisma = require('../config/database');
const ApiError = require('../utils/apiError');

const UPLOAD_DIR = path.join(__dirname, '../../uploads/documents');

const ALLOWED_TYPES = ['ID_CARD', 'DIPLOMA', 'OTHER'];

const saveDocument = async (userId, type, file) => {
  if (!ALLOWED_TYPES.includes(type)) {
    throw ApiError.badRequest('Type de document invalide.');
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (user && user.verificationStatus === 'REJECTED') {
    await prisma.user.update({
      where: { id: userId },
      data: { verificationStatus: 'PENDING', verificationNote: null }
    });
  }

  return prisma.document.create({
    data: {
      userId,
      type,
      storedName: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
    },
    select: { id: true, type: true, originalName: true, mimeType: true, sizeBytes: true, createdAt: true },
  });
};

const getMyDocuments = async (userId) => {
  return prisma.document.findMany({
    where: { userId },
    select: { id: true, type: true, originalName: true, mimeType: true, sizeBytes: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
};

const getDocumentFile = async (documentId) => {
  const doc = await prisma.document.findUnique({ where: { id: documentId } });
  if (!doc) throw ApiError.notFound('Document non trouvé.');
  const filePath = path.join(UPLOAD_DIR, doc.storedName);
  if (!fs.existsSync(filePath)) throw ApiError.notFound('Fichier introuvable sur le serveur.');
  return { doc, filePath };
};

const deleteDocument = async (userId, documentId) => {
  const doc = await prisma.document.findUnique({ where: { id: documentId } });
  if (!doc) throw ApiError.notFound('Document non trouvé.');
  if (doc.userId !== userId) throw ApiError.forbidden('Accès refusé.');
  const filePath = path.join(UPLOAD_DIR, doc.storedName);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  await prisma.document.delete({ where: { id: documentId } });
};

module.exports = { saveDocument, getMyDocuments, getDocumentFile, deleteDocument };
