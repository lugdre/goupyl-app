const productService = require('../services/product.service');

const listActive = async (req, res, next) => {
  try { res.json(await productService.listActive()); }
  catch (e) { next(e); }
};

const listAll = async (req, res, next) => {
  try { res.json(await productService.listAll()); }
  catch (e) { next(e); }
};

const createProduct = async (req, res, next) => {
  try { res.status(201).json(await productService.createProduct(req.body)); }
  catch (e) { next(e); }
};

const updateProduct = async (req, res, next) => {
  try { res.json(await productService.updateProduct(parseInt(req.params.id), req.body)); }
  catch (e) { next(e); }
};

const deleteProduct = async (req, res, next) => {
  try {
    await productService.deleteProduct(parseInt(req.params.id));
    res.status(204).send();
  } catch (e) { next(e); }
};

const createCheckout = async (req, res, next) => {
  try { res.json(await productService.createCheckout(req.user.userId, parseInt(req.params.id), req.body.quantity)); }
  catch (e) { next(e); }
};

const getMyOrders = async (req, res, next) => {
  try { res.json(await productService.getMyOrders(req.user.userId)); }
  catch (e) { next(e); }
};

const verifyOrder = async (req, res, next) => {
  try { res.json(await productService.verifyOrder(req.query.session_id, req.user.userId)); }
  catch (e) { next(e); }
};

module.exports = { listActive, listAll, createProduct, updateProduct, deleteProduct, createCheckout, getMyOrders, verifyOrder };
