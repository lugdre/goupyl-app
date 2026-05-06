const sessionReportService = require('../services/sessionReport.service');

const create = async (req, res, next) => {
  try { res.status(201).json(await sessionReportService.create(req.user.userId, req.body)); }
  catch (e) { next(e); }
};

const getByAppointment = async (req, res, next) => {
  try {
    res.status(200).json(
      await sessionReportService.getByAppointment(
        parseInt(req.params.appointmentId),
        req.user.userId,
        req.user.role
      )
    );
  } catch (e) { next(e); }
};

const update = async (req, res, next) => {
  try { res.status(200).json(await sessionReportService.update(parseInt(req.params.id), req.user.userId, req.body)); }
  catch (e) { next(e); }
};

module.exports = { create, getByAppointment, update };
