const authService = require('../services/auth.service');

const register = async (req, res, next) => {
  try { res.status(201).json(await authService.register(req.body)); }
  catch (e) { next(e); }
};

const login = async (req, res, next) => {
  try { res.status(200).json(await authService.login(req.body)); }
  catch (e) { next(e); }
};

const refresh = async (req, res, next) => {
  try { res.status(200).json(await authService.refresh(req.body.refreshToken)); }
  catch (e) { next(e); }
};

const logout = async (req, res, next) => {
  try {
    await authService.logout(req.user.userId);
    res.status(200).json({ message: 'Deconnexion reussie.' });
  } catch (e) { next(e); }
};

const verifyEmail = async (req, res, next) => {
  try { res.status(200).json(await authService.verifyEmail(req.body.token)); }
  catch (e) { next(e); }
};

module.exports = { register, login, refresh, logout, verifyEmail };
