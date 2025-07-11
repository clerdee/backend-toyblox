const express = require('express');
const router = express.Router();
const {
    getAllStock,
    getStockByItemId,
} = require('../controllers/stock');

router.get('/stocks', getAllStock);
router.get('/stocks/:itemId', getStockByItemId);

module.exports = router;
