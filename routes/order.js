const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orders');

router.post('/', orderController.placeOrder);
router.get('/', orderController.getAllOrders);
router.get('/stats', orderController.getOrderStats);
router.get('/:id', orderController.getOrderById);
router.put('/:id/status', orderController.updateOrderStatus);

module.exports = router;
