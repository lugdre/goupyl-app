const parqService = require('../services/parq.service');

const submit = async (req, res, next) => {
  try {
    const result = await parqService.submitQuestionnaire(req.user.userId, req.body.answers);
    res.status(201).json({
      id: result.id,
      hasRisk: result.hasRisk,
      coachCleared: result.coachCleared,
      completedAt: result.completedAt,
      expiresAt: result.expiresAt,
    });
  } catch (e) { next(e); }
};

const getStatus = async (req, res, next) => {
  try {
    const status = await parqService.getStatus(req.user.userId);
    res.json(status);
  } catch (e) { next(e); }
};

const getMyAnswers = async (req, res, next) => {
  try {
    const answers = await parqService.getOwnAnswers(req.user.userId);
    res.json({ answers });
  } catch (e) { next(e); }
};

module.exports = { submit, getStatus, getMyAnswers };
