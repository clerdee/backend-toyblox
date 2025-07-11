const connection = require('../config/database');

// Get all stock entries
exports.getAllStock = (req, res) => {
    const sql = `
        SELECT s.stock_id, s.item_id, i.description, s.quantity
        FROM stock s
        JOIN item i ON s.item_id = i.item_id
        WHERE i.deleted_at IS NULL
    `;

    connection.query(sql, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to fetch stock data', details: err });
        }

        // ✅ Return rows wrapped in 'rows' key
        return res.status(200).json({ rows: rows });
    });
};

// Get stock by item_id
exports.getStockByItemId = (req, res) => {
    const itemId = req.params.itemId;

    const sql = 'SELECT * FROM stock WHERE item_id = ?';
    connection.execute(sql, [itemId], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Failed to fetch stock', details: err });
        if (rows.length === 0) return res.status(404).json({ error: 'Stock not found' });
        return res.status(200).json({ success: true, data: rows[0] });
    });
};
