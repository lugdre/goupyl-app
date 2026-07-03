const companyService = require('../services/company.service');

const getEmployees = async (req, res, next) => {
  try { res.json(await companyService.getEmployees(req.user.userId)); }
  catch (e) { next(e); }
};

const getJoinCode = async (req, res, next) => {
  try { res.json(await companyService.getJoinCode(req.user.userId)); }
  catch (e) { next(e); }
};

const regenerateJoinCode = async (req, res, next) => {
  try { res.json(await companyService.regenerateJoinCode(req.user.userId)); }
  catch (e) { next(e); }
};

const createInvite = async (req, res, next) => {
  try { res.status(201).json(await companyService.createInvite(req.user.userId, req.body.email)); }
  catch (e) { next(e); }
};

const getInvites = async (req, res, next) => {
  try { res.json(await companyService.getInvites(req.user.userId)); }
  catch (e) { next(e); }
};

const deleteInvite = async (req, res, next) => {
  try {
    await companyService.deleteInvite(req.user.userId, parseInt(req.params.inviteId));
    res.status(204).send();
  } catch (e) { next(e); }
};

const removeEmployee = async (req, res, next) => {
  try {
    await companyService.removeEmployee(req.user.userId, parseInt(req.params.employeeId));
    res.status(204).send();
  } catch (e) { next(e); }
};

const getEmployerPlan = async (req, res, next) => {
  try { res.json(await companyService.getEmployerSubscription(req.user.userId)); }
  catch (e) { next(e); }
};

const getUsageStats = async (req, res, next) => {
  try { res.json(await companyService.getUsageStats(req.user.userId)); }
  catch (e) { next(e); }
};

const getEmployeeStats = async (req, res, next) => {
  try { res.json(await companyService.getEmployeeStats(req.user.userId)); }
  catch (e) { next(e); }
};

const getMyQuota = async (req, res, next) => {
  try { res.json(await companyService.getMyQuota(req.user.userId)); }
  catch (e) { next(e); }
};

const getEmployeesUsage = async (req, res, next) => {
  try { res.json(await companyService.getEmployeesUsage(req.user.userId)); }
  catch (e) { next(e); }
};

module.exports = { getEmployees, getJoinCode, regenerateJoinCode, createInvite, getInvites, deleteInvite, removeEmployee, getEmployerPlan, getUsageStats, getEmployeeStats, getMyQuota, getEmployeesUsage };
