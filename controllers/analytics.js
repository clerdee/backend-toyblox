const db = require('../config/database');

exports.getOrdersAnalytics = async (req, res) => {
  const days = parseInt(req.query.days) || 30;
  
  try {
    const [rows] = await db.promise().execute(`
      SELECT status, COUNT(*) as count
      FROM orderinfo
      WHERE date_placed >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY status
    `, [days]);
    
    // Convert to object with status as keys
    const result = {
      pending: 0,
      shipped: 0,
      delivered: 0
    };
    
    rows.forEach(row => {
      result[row.status] = row.count;
    });
    
    res.status(200).json(result);
  } catch (err) {
    console.error('Error fetching orders analytics:', err);
    res.status(500).json({ error: 'Failed to fetch orders analytics' });
  }
};

exports.getUsersAnalytics = async (req, res) => {
  try {
    const [rows] = await db.promise().execute(`
      SELECT role, COUNT(*) as count
      FROM users
      WHERE deleted_at IS NULL
      GROUP BY role
    `);
    
    // Convert to object with role as keys
    const result = {
      admins: 0,
      users: 0
    };
    
    rows.forEach(row => {
      if (row.role === 'admin') {
        result.admins = row.count;
      } else {
        result.users = row.count;
      }
    });
    
    res.status(200).json(result);
  } catch (err) {
    console.error('Error fetching users analytics:', err);
    res.status(500).json({ error: 'Failed to fetch users analytics' });
  }
};

exports.getProductsAnalytics = async (req, res) => {
  const days = parseInt(req.query.days) || 30;
  
  try {
    const [rows] = await db.promise().execute(`
      SELECT i.item_id, i.description, SUM(ol.quantity) as quantity
      FROM orderline ol
      JOIN item i ON ol.item_id = i.item_id
      JOIN orderinfo o ON ol.order_id = o.id
      WHERE o.date_placed >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY i.item_id
      ORDER BY quantity DESC
      LIMIT 10
    `, [days]);
    
    res.status(200).json(rows);