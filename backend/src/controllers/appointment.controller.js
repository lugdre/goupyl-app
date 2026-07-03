const appointmentService = require('../services/appointment.service');

const create = async (req, res, next) => {
  try { res.status(201).json(await appointmentService.create(req.user.userId, req.body)); }
  catch (e) { next(e); }
};

const getMyAppointments = async (req, res, next) => {
  try {
    res.status(200).json(
      await appointmentService.getMyAppointments(req.user.userId, req.user.role, {
        page: req.query.page || 1,
        limit: req.query.limit || 10,
        status: req.query.status,
      })
    );
  } catch (e) { next(e); }
};

const getAll = async (req, res, next) => {
  try { res.status(200).json(await appointmentService.getAll(req.query)); }
  catch (e) { next(e); }
};

const updateStatus = async (req, res, next) => {
  try {
    res.status(200).json(
      await appointmentService.updateStatus(
        parseInt(req.params.id),
        req.user.userId,
        req.user.role,
        req.body.status,
        req.body.cancelReason
      )
    );
  } catch (e) { next(e); }
};

const getBusySlots = async (req, res, next) => {
  try {
    res.status(200).json(
      await appointmentService.getBusySlots(req.params.intervenantId, req.query.from, req.query.to)
    );
  } catch (e) { next(e); }
};

const cancelAppointment = async (req, res, next) => {
  try {
    res.json(await appointmentService.cancelAppointment(
      parseInt(req.params.id),
      req.user.userId,
      req.body.reason
    ));
  } catch (e) { next(e); }
};

const getMyBusySlots = async (req, res, next) => {
  try {
    res.status(200).json(
      await appointmentService.getMyBusySlots(req.user.userId, req.query.from, req.query.to)
    );
  } catch (e) { next(e); }
};

const validateQr = async (req, res, next) => {
  try { res.status(200).json(await appointmentService.validateQr(req.user.userId, req.body.code)); }
  catch (e) { next(e); }
};

const markAbsent = async (req, res, next) => {
  try { res.status(200).json(await appointmentService.markAbsent(parseInt(req.params.id), req.user.userId)); }
  catch (e) { next(e); }
};

const openDispute = async (req, res, next) => {
  try { res.status(200).json(await appointmentService.openDispute(parseInt(req.params.id), req.user.userId, req.body.reason)); }
  catch (e) { next(e); }
};

const listDisputes = async (req, res, next) => {
  try { res.status(200).json(await appointmentService.listDisputes({ status: req.query.status || 'OPEN' })); }
  catch (e) { next(e); }
};

const resolveDispute = async (req, res, next) => {
  try { res.status(200).json(await appointmentService.resolveDispute(parseInt(req.params.id), req.body.resolution)); }
  catch (e) { next(e); }
};

module.exports = { create, getMyAppointments, getAll, updateStatus, getBusySlots, getMyBusySlots, cancelAppointment, validateQr, markAbsent, openDispute, listDisputes, resolveDispute };
