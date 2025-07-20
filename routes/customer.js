const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customer');
const { verifyToken } = require('../middleware/auth'); 

router.get('/me', verifyToken, customerController.getCustomerByUserId);

module.exports = router;
