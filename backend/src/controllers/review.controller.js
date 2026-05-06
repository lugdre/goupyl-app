const reviewService = require('../services/review.service');

const createReview = async (req, res, next) => {
  try {
    const result = await reviewService.createReview(req.user.userId, req.body);
    res.status(201).json(result);
  } catch (e) { next(e); }
};

const getIntervenantReviews = async (req, res, next) => {
  try {
    const intervenantId = parseInt(req.params.intervenantId);
    const result = await reviewService.getIntervenantReviews(intervenantId);
    res.json(result);
  } catch (e) { next(e); }
};

const getMyReview = async (req, res, next) => {
  try {
    const appointmentId = parseInt(req.params.appointmentId);
    const result = await reviewService.getReviewByAppointment(appointmentId, req.user.userId);
    res.json(result);
  } catch (e) { next(e); }
};

// For INTERVENANT — get the review on one of their appointments
const getReviewForAppointment = async (req, res, next) => {
  try {
    const appointmentId = parseInt(req.params.appointmentId);
    const review = await reviewService.getReviewForAppointment(appointmentId, req.user.userId);
    res.json(review);
  } catch (e) { next(e); }
};

const replyToReview = async (req, res, next) => {
  try {
    const reviewId = parseInt(req.params.id);
    const { reply } = req.body;
    const result = await reviewService.replyToReview(req.user.userId, reviewId, reply);
    res.json(result);
  } catch (e) { next(e); }
};

module.exports = { createReview, getIntervenantReviews, getMyReview, getReviewForAppointment, replyToReview };
