const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orders');

router.post('/', orderController.placeOrder);

module.exports = router;
