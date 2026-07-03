const express = require('express');
const router = express.Router();
const companyController = require('../controllers/company.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/role.middleware');
const validate = require('../middlewares/validate.middleware');
const { inviteSchema } = require('../validators/company.validator');

// Route accessible aux salariés (CLIENT rattaché à une entreprise)
router.get('/employer-plan', authenticate, authorize('CLIENT'), companyController.getEmployerPlan);
router.get('/employee-stats', authenticate, authorize('CLIENT'), companyController.getEmployeeStats);
router.get('/my-quota', authenticate, authorize('CLIENT'), companyController.getMyQuota);

router.use(authenticate, authorize('ENTREPRISE'));

router.get('/usage', companyController.getUsageStats);
router.get('/employees/usage', companyController.getEmployeesUsage);

router.get('/employees', companyController.getEmployees);
router.delete('/employees/:employeeId', companyController.removeEmployee);

router.get('/join-code', companyController.getJoinCode);
router.post('/join-code/regenerate', companyController.regenerateJoinCode);

router.get('/invites', companyController.getInvites);
router.post('/invites', validate(inviteSchema), companyController.createInvite);
router.delete('/invites/:inviteId', companyController.deleteInvite);

module.exports = router;
