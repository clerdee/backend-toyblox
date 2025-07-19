// routes/admin.js
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin');

// If this line throws error, comment it out temporarily
const verifyToken = require('../middleware/auth');

router.get('/stats', /* verifyToken, */ adminController.getStats);
router.get('/top-products', /* verifyToken, */ adminController.getTopProducts);

module.exports = router;
