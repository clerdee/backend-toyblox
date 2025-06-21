const connection = require('../config/database');

exports.getAllItems = (req, res) => {
    const sql = `
    SELECT * FROM item i
    INNER JOIN stock s ON i.item_id = s.item_id
    WHERE i.deleted_at IS NULL`;

    try {
        connection.query(sql, (err, rows, fields) => {
            if (err instanceof Error) {
                console.log(err);
                return;
            }
            console.log(rows);
            return res.status(200).json({
                rows,
            })
        });
    } catch (error) {
        console.log(error)
    }
}

exports.getSingleItem = (req, res) => {
    // http://localhost:4000/api/v1/items/:id
    const sql = `
        SELECT * FROM item i 
        INNER JOIN stock s ON i.item_id = s.item_id 
        WHERE i.item_id = ? AND i.deleted_at IS NULL
    `;
    const values = [parseInt(req.params.id)];

    try {
        connection.execute(sql, values, (err, result, fields) => {
            if (err instanceof Error) {
                console.error('Database error:', err);
                return res.status(500).json({
                    success: false,
                    message: "Server error while fetching item."
                });
            }

            if (result.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Item not found or has been deleted."
                });
            }

            return res.status(200).json({
                success: true,
                result: result[0]
            });
        });
    } catch (error) {
        console.error('Unhandled error:', error);
        return res.status(500).json({
            success: false,
            message: "Unexpected error occurred."
        });
    }
};


exports.createItem = (req, res) => {
    try {
        console.log(req.file, req.body);

        const { description, cost_price, sell_price, quantity } = req.body;

        if (!description || !cost_price || !sell_price || !quantity) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const imagePath = req.file ? req.file.path.replace(/\\/g, "/") : null;

        const sql = 'INSERT INTO item (description, cost_price, sell_price, image, created_at) VALUES (?, ?, ?, ?, NOW())';
        const values = [description, cost_price, sell_price, imagePath];

        connection.execute(sql, values, (err, result) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: 'Error inserting item', details: err.message });
            }

            const itemId = result.insertId;
            const stockSql = 'INSERT INTO stock (item_id, quantity) VALUES (?, ?)';
            const stockValues = [itemId, quantity];

            connection.execute(stockSql, stockValues, (err, result) => {
                if (err) {
                    console.error(err);
                    return res.status(500).json({ error: 'Error inserting stock', details: err.message });
                }

                return res.status(201).json({
                    success: true,
                    message: 'Item and stock inserted successfully',
                    itemId,
                    image: imagePath,
                    quantity
                });
            });
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

exports.updateItem = (req, res) => {
    const item = req.body;
    const image = req.file;
    const id = req.params.id;

    const { description, cost_price, sell_price, quantity } = item;
    let imagePath = null;

    if (image) {
        imagePath = image.path.replace(/\\/g, "/");
    }

    if (!description || !cost_price || !sell_price) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    // Step 1: Check if item is NOT soft-deleted
    const checkSql = 'SELECT * FROM item WHERE item_id = ? AND deleted_at IS NULL';
    connection.execute(checkSql, [id], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Server error while checking item status' });
        }

        if (results.length === 0) {
            return res.status(404).json({ error: 'Item not found or has been deleted' });
        }

        // Step 2: Proceed with update
        const sql = `
            UPDATE item 
            SET description = ?, cost_price = ?, sell_price = ?, image = ?, updated_at = NOW() 
            WHERE item_id = ?
        `;
        const values = [description, cost_price, sell_price, imagePath, id];

        connection.execute(sql, values, (err, result) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: 'Error updating item', details: err });
            }

            // Step 3: Update stock table
            const stockSql = 'UPDATE stock SET quantity = ? WHERE item_id = ?';
            const stockValues = [quantity, id];

            connection.execute(stockSql, stockValues, (err, result) => {
                if (err) {
                    console.error(err);
                    return res.status(500).json({ error: 'Error updating stock', details: err });
                }

                return res.status(200).json({
                    success: true,
                    message: 'Item updated successfully'
                });
            });
        });
    });
};


exports.deleteItem = (req, res) => {

    const id = req.params.id
    const sql = 'UPDATE item SET deleted_at = NOW() WHERE item_id = ?';
    const values = [id];

    connection.execute(sql, values, (err, result) => {
        if (err) {
            console.log(err);
            return res.status(500).json({ error: 'Error deleting item', details: err });
        }
    });

    return res.status(201).json({
        success: true,
        message: 'Item soft-deleted (marked with deleted_at)'   
    });
}
