// backend-toyblox/controllers/orders.js
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

// Get all orders with customer details
exports.getAllOrders = async (req, res) => {
  try {
    const [rows] = await db.promise().execute(
      `SELECT o.id, o.status, o.date_placed, o.created_at,
              c.id as customer_id, u.f_name, u.l_name, u.email,
              c.address, c.postal_code, c.country, c.phone_number,
              GROUP_CONCAT(CONCAT(i.description, ' (', ol.quantity, ')') SEPARATOR ', ') as items_detail,
              SUM(ol.quantity * ol.price_at_order) as total_amount,
              COUNT(ol.id) as item_count
       FROM orderinfo o
       JOIN customers c ON o.customer_id = c.id
       JOIN users u ON c.user_id = u.id
       JOIN orderline ol ON o.id = ol.order_id
       JOIN item i ON ol.item_id = i.item_id
       GROUP BY o.id
       ORDER BY o.date_placed DESC`
    );

    res.status(200).json(rows);
  } catch (err) {
    console.error('Error fetching orders:', err);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
};

// Get order details by ID
exports.getOrderById = async (req, res) => {
  const { id } = req.params;
  
  try {
    // Get order header info
    const [orderRows] = await db.promise().execute(
      `SELECT o.id, o.status, o.date_placed, o.created_at,
              c.id as customer_id, u.f_name, u.l_name, u.email,
              c.address, c.postal_code, c.country, c.phone_number
       FROM orderinfo o
       JOIN customers c ON o.customer_id = c.id
       JOIN users u ON c.user_id = u.id
       WHERE o.id = ?`,
      [id]
    );
    
    if (orderRows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    // Get order line items
    const [lineItems] = await db.promise().execute(
      `SELECT 
  ol.id AS orderline_id,
  ol.item_id,
  i.description,
  ii.image_path AS image_url,
  ol.quantity,
  ol.price_at_order
FROM orderline ol
JOIN item i ON ol.item_id = i.item_id
LEFT JOIN (
    SELECT item_id, MIN(image_path) AS image_path
    FROM item_images
    WHERE deleted_at IS NULL
    GROUP BY item_id
) ii ON ol.item_id = ii.item_id
WHERE ol.order_id = ?`,
      [id]
    );
    
    const order = {
      ...orderRows[0],
      items: lineItems,
      total_amount: lineItems.reduce((sum, item) => sum + (item.quantity * item.price_at_order), 0)
    };
    
    res.status(200).json(order);
  } catch (err) {
    console.error(`Error fetching order #${id}:`, err);
    res.status(500).json({ error: 'Failed to fetch order details' });
  }
};

// Update order status
exports.updateOrderStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['pending', 'shipped', 'delivered'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status value' });
  }

  try {
    let updateQuery = `UPDATE orderinfo SET status = ?, updated_at = NOW()`;
    const queryParams = [status];

    if (status === 'shipped') {
      updateQuery += `, date_shipped = NOW()`;
    } else if (status === 'delivered') {
      updateQuery += `, date_delivered = NOW()`;
    }

    updateQuery += ` WHERE id = ?`;
    queryParams.push(id);

    const [result] = await db.promise().execute(updateQuery, queryParams);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Send email notification
    if (status === 'shipped') {
      await require('../utils/email').sendOrderShippedEmail(id);
    } else if (status === 'delivered') {
      await require('../utils/email').sendOrderDeliveredEmail(id);
    }

    res.status(200).json({ message: 'Order status updated successfully' });
  } catch (err) {
    console.error(`Error updating order #${id} status:`, err);
    res.status(500).json({ error: 'Failed to update order status' });
  }
};

// Get order statistics for dashboard
exports.getOrderStats = async (req, res) => {
  try {
    // Get total orders count
    const [totalOrders] = await db.promise().execute('SELECT COUNT(*) as count FROM orderinfo');
    
    // Get orders by status
    const [ordersByStatus] = await db.promise().execute(
      `SELECT status, COUNT(*) as count FROM orderinfo GROUP BY status`
    );
    
    // Get recent orders
    const [recentOrders] = await db.promise().execute(
      `SELECT o.id, o.status, o.date_placed, 
              u.f_name, u.l_name,
              SUM(ol.quantity * ol.price_at_order) as total_amount
       FROM orderinfo o
       JOIN customers c ON o.customer_id = c.id
       JOIN users u ON c.user_id = u.id
       JOIN orderline ol ON o.id = ol.order_id
       GROUP BY o.id
       ORDER BY o.date_placed DESC
       LIMIT 5`
    );
    
    // Get monthly order totals for the past 6 months
    const [monthlyOrders] = await db.promise().execute(
      `SELECT 
         DATE_FORMAT(date_placed, '%Y-%m') as month,
         COUNT(*) as order_count,
         SUM(ol.quantity * ol.price_at_order) as revenue
       FROM orderinfo o
       JOIN orderline ol ON o.id = ol.order_id
       WHERE date_placed >= DATE_SUB(CURRENT_DATE(), INTERVAL 6 MONTH)
       GROUP BY DATE_FORMAT(date_placed, '%Y-%m')
       ORDER BY month ASC`
    );
    
    res.status(200).json({
      totalOrders: totalOrders[0].count,
      ordersByStatus,
      recentOrders,
      monthlyOrders
    });
  } catch (err) {
    console.error('Error fetching order statistics:', err);
    res.status(500).json({ error: 'Failed to fetch order statistics' });
  }
};

