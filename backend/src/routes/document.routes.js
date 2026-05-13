const express = require('express');
const router = express.Router();
const documentController = require('../controllers/document.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/role.middleware');
const upload = require('../middlewares/upload.middleware');

router.use(authenticate);

// Any authenticated user can upload/view/delete their own documents
router.post('/upload', upload.single('file'), documentController.uploadDocument);
router.get('/mine', documentController.getMyDocuments);
router.delete('/:id', documentController.deleteDocument);

// Admin only: download any document
router.get('/:id/file', authorize('ADMIN'), documentController.downloadDocument);
// Admin only: update per-document status (validate / reject / expire)
router.patch('/:id/status', authorize('ADMIN'), documentController.updateDocumentStatus);
// Admin only: get all documents for a user
router.get('/user/:userId', authorize('ADMIN'), documentController.getDocumentsForUser);

module.exports = router;
