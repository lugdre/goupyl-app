const express = require('express');
const router = express.Router();
const productController = require('../controllers/product.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/role.middleware');
const validate = require('../middlewares/validate.middleware');
const { productSchema, updateProductSchema, checkoutSchema } = require('../validators/product.validator');

router.use(authenticate);

// Routes statiques déclarées avant /:id
router.get('/all', authorize('ADMIN'), productController.listAll);
router.get('/orders/me', authorize('CLIENT'), productController.getMyOrders);
router.get('/orders/verify', authorize('CLIENT'), productController.verifyOrder);

router.get('/', authorize('CLIENT'), productController.listActive);
router.post('/', authorize('ADMIN'), validate(productSchema), productController.createProduct);
router.post('/:id/checkout', authorize('CLIENT'), validate(checkoutSchema), productController.createCheckout);
router.put('/:id', authorize('ADMIN'), validate(updateProductSchema), productController.updateProduct);
router.delete('/:id', authorize('ADMIN'), productController.deleteProduct);

module.exports = router;
