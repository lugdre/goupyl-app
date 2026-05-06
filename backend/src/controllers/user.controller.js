const userService = require('../services/user.service');

const getMe = async (req, res, next) => {
  try { res.status(200).json(await userService.getMe(req.user.userId)); }
  catch (e) { next(e); }
};

const updateMe = async (req, res, next) => {
  try { res.status(200).json(await userService.updateMe(req.user.userId, req.body)); }
  catch (e) { next(e); }
};

const getIntervenants = async (req, res, next) => {
  try { res.status(200).json(await userService.getIntervenants(req.query)); }
  catch (e) { next(e); }
};

const getIntervenantById = async (req, res, next) => {
  try { res.status(200).json(await userService.getIntervenantById(parseInt(req.params.id))); }
  catch (e) { next(e); }
};

const getAllUsers = async (req, res, next) => {
  try { res.status(200).json(await userService.getAllUsers(req.query)); }
  catch (e) { next(e); }
};

const deactivateUser = async (req, res, next) => {
  try { res.status(200).json(await userService.toggleUserActive(parseInt(req.params.id), false)); }
  catch (e) { next(e); }
};

const activateUser = async (req, res, next) => {
  try { res.status(200).json(await userService.toggleUserActive(parseInt(req.params.id), true)); }
  catch (e) { next(e); }
};

const getPendingVerifications = async (req, res, next) => {
  try { res.status(200).json(await userService.getPendingVerifications()); }
  catch (e) { next(e); }
};

const verifyUser = async (req, res, next) => {
  try {
    const { status, note } = req.body;
    res.status(200).json(await userService.verifyUser(parseInt(req.params.id), status, note));
  } catch (e) { next(e); }
};

const deleteMe = async (req, res, next) => {
  try {
    await userService.deleteMe(req.user.userId);
    res.status(204).end();
  } catch (e) {
    next(e);
  }
};

const uploadAvatar = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Aucun fichier fourni.' });
    res.status(200).json(await userService.uploadAvatar(req.user.userId, req.file.filename));
  } catch (e) { next(e); }
};

module.exports = { getMe, updateMe, getIntervenants, getIntervenantById, getAllUsers, deactivateUser, activateUser, getPendingVerifications, verifyUser, deleteMe, uploadAvatar };
