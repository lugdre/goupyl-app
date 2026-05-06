const resourceService = require('../services/resource.service');

const getAll = async (req, res, next) => {
  try {
    const { category, type } = req.query;
    // Le plan est extrait de l'abonnement actif de l'user (passé via req.activePlan si middleware)
    const plan = req.activePlan || null;
    const resources = await resourceService.getAll({ category, type, plan });
    res.json(resources);
  } catch (e) { next(e); }
};

const getById = async (req, res, next) => {
  try {
    const resource = await resourceService.getById(parseInt(req.params.id));
    res.json(resource);
  } catch (e) { next(e); }
};

const create = async (req, res, next) => {
  try {
    const resource = await resourceService.create(req.body);
    res.status(201).json(resource);
  } catch (e) { next(e); }
};

const update = async (req, res, next) => {
  try {
    const resource = await resourceService.update(parseInt(req.params.id), req.body);
    res.json(resource);
  } catch (e) { next(e); }
};

const remove = async (req, res, next) => {
  try {
    await resourceService.remove(parseInt(req.params.id));
    res.json({ success: true });
  } catch (e) { next(e); }
};

module.exports = { getAll, getById, create, update, remove };
