const subscriptionService = require('../services/subscription.service');

const subscribe = async (req, res, next) => {
  try { res.status(201).json(await subscriptionService.subscribe(req.user.userId, req.body.plan, req.body.billingCycle)); }
  catch (e) { next(e); }
};

const getMine = async (req, res, next) => {
  try { res.status(200).json(await subscriptionService.getMine(req.user.userId)); }
  catch (e) { next(e); }
};

const cancel = async (req, res, next) => {
  try { res.status(200).json(await subscriptionService.cancel(parseInt(req.params.id), req.user.userId)); }
  catch (e) { next(e); }
};

const getAll = async (req, res, next) => {
  try { res.status(200).json(await subscriptionService.getAll(req.query)); }
  catch (e) { next(e); }
};

module.exports = { subscribe, getMine, cancel, getAll };
