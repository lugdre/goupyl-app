const passkeyService = require('../services/passkey.service');

const beginRegistration = async (req, res, next) => {
  try { res.json(await passkeyService.beginRegistration(req.user.userId)); }
  catch (e) { next(e); }
};

const finishRegistration = async (req, res, next) => {
  try {
    const { response, nickname } = req.body;
    res.json(await passkeyService.finishRegistration(req.user.userId, response, nickname));
  } catch (e) { next(e); }
};

const beginAuthentication = async (req, res, next) => {
  try { res.json(await passkeyService.beginAuthentication(req.body?.email)); }
  catch (e) { next(e); }
};

const finishAuthentication = async (req, res, next) => {
  try {
    const { scopeId, response } = req.body;
    res.json(await passkeyService.finishAuthentication(scopeId, response));
  } catch (e) { next(e); }
};

const list = async (req, res, next) => {
  try { res.json(await passkeyService.list(req.user.userId)); }
  catch (e) { next(e); }
};

const remove = async (req, res, next) => {
  try { res.json(await passkeyService.remove(req.user.userId, parseInt(req.params.id))); }
  catch (e) { next(e); }
};

module.exports = {
  beginRegistration,
  finishRegistration,
  beginAuthentication,
  finishAuthentication,
  list,
  remove,
};
