const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/role.middleware');
const validate = require('../middlewares/validate.middleware');
const { updateProfileSchema } = require('../validators/user.validator');
const avatarUpload = require('../middlewares/avatar-upload.middleware');
const photoUpload = require('../middlewares/photo-upload.middleware');

// Public routes
router.get('/intervenants', userController.getIntervenants);
router.get('/intervenants/:id', userController.getIntervenantById);
// Public : avatar et galerie sont chargés par des balises <img> (pas de header Authorization)
router.get('/:id/avatar', userController.getAvatar);
router.get('/:id/photos', userController.listPhotos);
router.get('/:id/photos/:photoId', userController.getPhoto);

router.use(authenticate);

router.get('/me', userController.getMe);
router.put('/me', validate(updateProfileSchema), userController.updateMe);
router.post('/me/avatar', (req, res, next) => {
  avatarUpload.single('avatar')(req, res, (err) => {
    if (err) return res.status(400).json({ message: err.message || 'Fichier invalide.' });
    next();
  });
}, userController.uploadAvatar);
router.post('/me/photos', authorize('INTERVENANT'), (req, res, next) => {
  photoUpload.single('photo')(req, res, (err) => {
    if (err) return res.status(400).json({ message: err.message || 'Fichier invalide.' });
    next();
  });
}, userController.addPhoto);
router.delete('/me/photos/:photoId', authorize('INTERVENANT'), userController.deletePhoto);
router.delete('/me', userController.deleteMe);
router.get('/', authorize('ADMIN'), userController.getAllUsers);
router.patch('/:id/deactivate', authorize('ADMIN'), userController.deactivateUser);
router.patch('/:id/activate', authorize('ADMIN'), userController.activateUser);
router.get('/verifications/pending', authorize('ADMIN'), userController.getPendingVerifications);
router.patch('/:id/verify', authorize('ADMIN'), userController.verifyUser);

module.exports = router;
