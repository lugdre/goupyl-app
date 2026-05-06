const express = require('express');
const router = express.Router();
const sessionReportController = require('../controllers/sessionReport.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/role.middleware');
const validate = require('../middlewares/validate.middleware');
const { createSessionReportSchema } = require('../validators/sessionReport.validator');

router.use(authenticate);

router.post('/', authorize('INTERVENANT'), validate(createSessionReportSchema), sessionReportController.create);
router.get('/appointment/:appointmentId', sessionReportController.getByAppointment);
router.put('/:id', authorize('INTERVENANT'), sessionReportController.update);

module.exports = router;
