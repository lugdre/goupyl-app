const coachServiceService = require('../services/coachService.service');

const getByIntervenant = async (req, res, next) => {
  try {
    res.status(200).json(await coachServiceService.getByIntervenant(parseInt(req.params.intervenantId)));
  } catch (e) { next(e); }
};

const getMine = async (req, res, next) => {
  try {
    res.status(200).json(await coachServiceService.getMine(req.user.userId));
  } catch (e) { next(e); }
};

const create = async (req, res, next) => {
  try {
    res.status(201).json(await coachServiceService.create(req.user.userId, req.body));
  } catch (e) { next(e); }
};

const update = async (req, res, next) => {
  try {
    res.status(200).json(await coachServiceService.update(parseInt(req.params.id), req.user.userId, req.body));
  } catch (e) { next(e); }
};

const remove = async (req, res, next) => {
  try {
    res.status(200).json(await coachServiceService.remove(parseInt(req.params.id), req.user.userId));
  } catch (e) { next(e); }
};

module.exports = { getByIntervenant, getMine, create, update, remove };
