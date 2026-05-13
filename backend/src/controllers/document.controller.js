const documentService = require('../services/document.service');

const uploadDocument = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Aucun fichier reçu.' });
    }
    const type = req.body.type || 'OTHER';
    const doc = await documentService.saveDocument(req.user.userId, type, req.file);
    res.status(201).json(doc);
  } catch (e) {
    next(e);
  }
};

const getMyDocuments = async (req, res, next) => {
  try {
    res.status(200).json(await documentService.getMyDocuments(req.user.userId));
  } catch (e) {
    next(e);
  }
};

const downloadDocument = async (req, res, next) => {
  try {
    const { doc, filePath } = await documentService.getDocumentFile(parseInt(req.params.id));
    res.setHeader('Content-Type', doc.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${doc.originalName}"`);
    res.sendFile(filePath);
  } catch (e) {
    next(e);
  }
};

const deleteDocument = async (req, res, next) => {
  try {
    await documentService.deleteDocument(req.user.userId, parseInt(req.params.id));
    res.status(204).end();
  } catch (e) {
    next(e);
  }
};

const updateDocumentStatus = async (req, res, next) => {
  try {
    const { status, adminNote, expiresAt } = req.body;
    const doc = await documentService.updateDocumentStatus(parseInt(req.params.id), { status, adminNote, expiresAt });
    res.status(200).json(doc);
  } catch (e) {
    next(e);
  }
};

const getDocumentsForUser = async (req, res, next) => {
  try {
    const docs = await documentService.getDocumentsForUser(parseInt(req.params.userId));
    res.status(200).json(docs);
  } catch (e) {
    next(e);
  }
};

module.exports = {
  uploadDocument,
  getMyDocuments,
  downloadDocument,
  deleteDocument,
  updateDocumentStatus,
  getDocumentsForUser,
};
