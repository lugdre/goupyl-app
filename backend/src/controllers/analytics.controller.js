const analyticsService = require('../services/analytics.service');

const getEntrepriseAnalytics = async (req, res, next) => {
  try {
    const data = await analyticsService.getEntrepriseAnalytics(req.user.userId);
    res.json(data);
  } catch (e) { next(e); }
};

const getAdminAnalytics = async (req, res, next) => {
  try {
    const data = await analyticsService.getAdminAnalytics();
    res.json(data);
  } catch (e) { next(e); }
};

module.exports = { getEntrepriseAnalytics, getAdminAnalytics };
