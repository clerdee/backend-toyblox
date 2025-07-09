const connection = require('../config/database');

exports.getAllItems = (req, res) => {
    const sql = `
        SELECT 
            i.item_id, i.description, i.cost_price, i.sell_price, i.created_at, i.updated_at,
            s.quantity,
            im.image_path
        FROM item i
        INNER JOIN stock s ON i.item_id = s.item_id
        LEFT JOIN item_images im ON i.item_id = im.item_id
        WHERE i.deleted_at IS NULL
    `;

    connection.query(sql, (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Error fetching items', details: err.message });
        }

        // Group rows by item_id
        const itemMap = {};
        rows.forEach(row => {
            const id = row.item_id;
            if (!itemMap[id]) {
                itemMap[id] = {
                    item_id: row.item_id,
                    description: row.description,
                    cost_price: row.cost_price,
                    sell_price: row.sell_price,
                    quantity: row.quantity,
                    images: []
                };
            }
            if (row.image_path) {
                itemMap[id].images.push(row.image_path);
            }
        });

        // Convert object to array
        const items = Object.values(itemMap);

        return res.status(200).json({ rows: items });
    });
};

exports.getSingleItem = (req, res) => {
    const sql = `
        SELECT i.*, s.quantity, GROUP_CONCAT(ii.image_path) AS images
        FROM item i
        LEFT JOIN stock s ON i.item_id = s.item_id
        LEFT JOIN item_images ii ON i.item_id = ii.item_id
        WHERE i.item_id = ? AND i.deleted_at IS NULL
        GROUP BY i.item_id
    `;

    connection.execute(sql, [req.params.id], (err, result) => {
        if (err) return res.status(500).json({ success: false, message: 'Server error', details: err });
        if (result.length === 0) return res.status(404).json({ success: false, message: 'Item not found' });

        return res.status(200).json({ success: true, result: result[0] });
    });
};

exports.createItem = (req, res) => {
    const { description, cost_price, sell_price, quantity } = req.body;
    const files = req.files;

    if (!description || !cost_price || !sell_price || !quantity) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const sql = 'INSERT INTO item (description, cost_price, sell_price, created_at) VALUES (?, ?, ?, NOW())';
    const values = [description, cost_price, sell_price];

    connection.execute(sql, values, (err, result) => {
        if (err) return res.status(500).json({ error: 'Error inserting item', details: err.message });

        const itemId = result.insertId;
        const stockSql = 'INSERT INTO stock (item_id, quantity) VALUES (?, ?)';

        connection.execute(stockSql, [itemId, quantity], (err) => {
            if (err) return res.status(500).json({ error: 'Error inserting stock', details: err.message });

            if (files && files.length > 0) {
                const imageSql = 'INSERT INTO item_images (item_id, image_path) VALUES ?';
                const imageValues = files.map(file => [itemId, file.path.replace(/\\/g, "/")]);

                connection.query(imageSql, [imageValues], (imgErr) => {
                    if (imgErr) return res.status(500).json({ error: 'Error inserting images', details: imgErr.message });
                    return res.status(201).json({ success: true, message: 'Item, stock, and images inserted successfully' });
                });
            } else {
                return res.status(201).json({ success: true, message: 'Item and stock inserted successfully (no images)' });
            }
        });
    });
};

exports.updateItem = (req, res) => {
    const { description, cost_price, sell_price, quantity } = req.body;
    const files = req.files;
    const id = req.params.id;

    if (!description || !cost_price || !sell_price) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const checkSql = 'SELECT * FROM item WHERE item_id = ? AND deleted_at IS NULL';
    connection.execute(checkSql, [id], (err, results) => {
        if (err) return res.status(500).json({ error: 'Server error while checking item status', details: err });
        if (results.length === 0) return res.status(404).json({ error: 'Item not found or has been deleted' });

        const updateSql = 'UPDATE item SET description = ?, cost_price = ?, sell_price = ?, updated_at = NOW() WHERE item_id = ?';
        connection.execute(updateSql, [description, cost_price, sell_price, id], (err) => {
            if (err) return res.status(500).json({ error: 'Error updating item', details: err });

            const stockSql = 'UPDATE stock SET quantity = ? WHERE item_id = ?';
            connection.execute(stockSql, [quantity, id], (err) => {
                if (err) return res.status(500).json({ error: 'Error updating stock', details: err });

                if (files && files.length > 0) {
                    const deleteOldImages = 'DELETE FROM item_images WHERE item_id = ?';
                    connection.execute(deleteOldImages, [id], (delErr) => {
                        if (delErr) return res.status(500).json({ error: 'Error deleting old images', details: delErr });

                        const insertNewImages = 'INSERT INTO item_images (item_id, image_path) VALUES ?';
                        const imageValues = files.map(file => [id, file.path.replace(/\\/g, "/")]);
                        connection.query(insertNewImages, [imageValues], (imgErr) => {
                            if (imgErr) return res.status(500).json({ error: 'Error inserting new images', details: imgErr });

                            return res.status(200).json({ success: true, message: 'Item, stock, and images updated successfully' });
                        });
                    });
                } else {
                    return res.status(200).json({ success: true, message: 'Item and stock updated successfully (images unchanged)' });
                }
            });
        });
    });
};

exports.deleteItem = (req, res) => {
    const id = req.params.id;
    const sql = 'UPDATE item SET deleted_at = NOW() WHERE item_id = ?';

    connection.execute(sql, [id], (err) => {
        if (err) return res.status(500).json({ error: 'Error deleting item', details: err });
        return res.status(200).json({ success: true, message: 'Item soft-deleted successfully' });
    });
};
