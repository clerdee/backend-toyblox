const db = require('../config/database'); 
const mailer = require('../config/mailer');
const { sendOrderConfirmation } = require('../utils/email');

exports.placeOrder = async (req, res) => {
  const { user_id, items } = req.body;

  try {
    // 1. Get customer_id based on user_id
    const [customerRows] = await db.promise().execute(
      `SELECT id, address, postal_code, country, phone_number
       FROM customers WHERE user_id = ? AND deleted_at IS NULL`,
      [user_id]
    );

    if (customerRows.length === 0) {
      return res.status(404).json({ error: 'Customer profile not found' });
    }

    const customer = customerRows[0];
    const customer_id = customer.id;

    // 2. Insert into orderinfo
    const [orderResult] = await db.promise().execute(
      `INSERT INTO orderinfo (customer_id, status, date_placed, created_at, updated_at)
       VALUES (?, 'pending', NOW(), NOW(), NOW())`,
      [customer_id]
    );
    const order_id = orderResult.insertId;

    // 3. Insert each item into orderline
    for (const item of items) {
      await db.promise().execute(
        `INSERT INTO orderline (order_id, item_id, quantity, price_at_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, NOW(), NOW())`,
        [order_id, item.item_id, item.quantity, item.price]
      );
    }

    // 4. Send confirmation email using the utility function
    await sendOrderConfirmation(user_id, order_id);

    res.status(200).json({ message: 'Order placed successfully', order_id });

  } catch (err) {
    console.error('💥 Order submission failed:', err);
    res.status(500).json({ error: 'Failed to submit order.' });
  }
};

