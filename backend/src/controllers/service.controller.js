const serviceService = require('../services/service.service');

const getAll = async (req, res, next) => {
  try { res.status(200).json(await serviceService.getAll(req.query)); }
  catch (e) { next(e); }
};

const getById = async (req, res, next) => {
  try { res.status(200).json(await serviceService.getById(parseInt(req.params.id))); }
  catch (e) { next(e); }
};

const create = async (req, res, next) => {
  try { res.status(201).json(await serviceService.create(req.body)); }
  catch (e) { next(e); }
};

const update = async (req, res, next) => {
  try { res.status(200).json(await serviceService.update(parseInt(req.params.id), req.body)); }
  catch (e) { next(e); }
};

const remove = async (req, res, next) => {
  try { res.status(200).json(await serviceService.remove(parseInt(req.params.id))); }
  catch (e) { next(e); }
};

module.exports = { getAll, getById, create, update, remove };
