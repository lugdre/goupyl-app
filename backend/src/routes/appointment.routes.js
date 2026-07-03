const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointment.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/role.middleware');
const validate = require('../middlewares/validate.middleware');
const { createAppointmentSchema, updateStatusSchema, validateQrSchema, disputeSchema, resolveDisputeSchema } = require('../validators/appointment.validator');

// Public — returns busy intervals so the booking UI can compute free slots
router.get('/busy/:intervenantId', appointmentController.getBusySlots);

router.use(authenticate);

router.post('/', authorize('CLIENT'), validate(createAppointmentSchema), appointmentController.create);
router.get('/me/busy-slots', authorize('CLIENT'), appointmentController.getMyBusySlots);
router.get('/me', authorize('CLIENT', 'INTERVENANT'), appointmentController.getMyAppointments);
router.get('/', authorize('ADMIN'), appointmentController.getAll);
router.post('/validate-qr', authorize('INTERVENANT'), validate(validateQrSchema), appointmentController.validateQr);
router.get('/disputes', authorize('ADMIN'), appointmentController.listDisputes);
router.patch('/:id/status', authorize('CLIENT', 'INTERVENANT', 'ADMIN'), validate(updateStatusSchema), appointmentController.updateStatus);
router.post('/:id/cancel', authorize('CLIENT'), appointmentController.cancelAppointment);
router.post('/:id/absent', authorize('INTERVENANT'), appointmentController.markAbsent);
router.post('/:id/dispute', authorize('CLIENT'), validate(disputeSchema), appointmentController.openDispute);
router.patch('/:id/dispute', authorize('ADMIN'), validate(resolveDisputeSchema), appointmentController.resolveDispute);

module.exports = router;
