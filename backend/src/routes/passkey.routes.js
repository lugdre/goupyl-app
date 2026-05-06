const express = require('express');
const router = express.Router();
const passkeyController = require('../controllers/passkey.controller');
const authenticate = require('../middlewares/auth.middleware');

// Public — passkey login
router.post('/auth/begin', passkeyController.beginAuthentication);
router.post('/auth/finish', passkeyController.finishAuthentication);

// Authenticated — manage own passkeys
router.post('/register/begin', authenticate, passkeyController.beginRegistration);
router.post('/register/finish', authenticate, passkeyController.finishRegistration);
router.get('/', authenticate, passkeyController.list);
router.delete('/:id', authenticate, passkeyController.remove);

module.exports = router;
