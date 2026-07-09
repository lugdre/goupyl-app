const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/role.middleware');
const validate = require('../middlewares/validate.middleware');
const { updateProfileSchema } = require('../validators/user.validator');
const avatarUpload = require('../middlewares/avatar-upload.middleware');

// Public routes
router.get('/intervenants', userController.getIntervenants);
router.get('/intervenants/:id', userController.getIntervenantById);
// Public : l'avatar est chargé par une balise <img> (pas de header Authorization)
router.get('/:id/avatar', userController.getAvatar);

router.use(authenticate);

router.get('/me', userController.getMe);
router.put('/me', validate(updateProfileSchema), userController.updateMe);
router.post('/me/avatar', (req, res, next) => {
  avatarUpload.single('avatar')(req, res, (err) => {
    if (err) return res.status(400).json({ message: err.message || 'Fichier invalide.' });
    next();
  });
}, userController.uploadAvatar);
router.delete('/me', userController.deleteMe);
router.get('/', authorize('ADMIN'), userController.getAllUsers);
router.patch('/:id/deactivate', authorize('ADMIN'), userController.deactivateUser);
router.patch('/:id/activate', authorize('ADMIN'), userController.activateUser);
router.get('/verifications/pending', authorize('ADMIN'), userController.getPendingVerifications);
router.patch('/:id/verify', authorize('ADMIN'), userController.verifyUser);

module.exports = router;
