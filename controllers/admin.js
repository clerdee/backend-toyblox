// controllers/admin.js
const connection = require('../config/database');

exports.getStats = async (req, res) => {
  try {
    const [orders] = await connection.promise().query("SELECT COUNT(*) as total FROM orderinfo");
    const [products] = await connection.promise().query("SELECT COUNT(*) as total FROM item");
    const [admins] = await connection.promise().query("SELECT COUNT(*) as total FROM users WHERE role = 'admin'");
    const [customers] = await connection.promise().query("SELECT COUNT(*) as total FROM users WHERE role = 'user'");

    res.json({
      totalOrders: orders[0].total,
      orderChange: 12.5, // dummy for now
      totalProducts: products[0].total,
      productChange: 8.2,
      totalAdmins: admins[0].total,
      adminChange: 4.1,
      totalCustomers: customers[0].total,
      customerChange: 9.3
    });
  } catch (err) {
    console.error("STAT FETCH ERROR:", err);
    res.status(500).json({ message: "Failed to fetch stats" });
  }
};

exports.getTopProducts = async (req, res) => {
  try {
    const sql = `
      SELECT 
        i.item_id,
        i.description AS name,
        i.sell_price,
        ii.image_path AS image_url
      FROM item i
      LEFT JOIN (
        SELECT item_id, MIN(image_path) AS image_path
        FROM item_images
        GROUP BY item_id
      ) ii ON i.item_id = ii.item_id
      WHERE i.deleted_at IS NULL
      ORDER BY i.created_at DESC
      LIMIT 3
    `;

    const [rows] = await connection.promise().query(sql);
    res.json(rows);
  } catch (err) {
    console.error("TOP PRODUCTS FETCH ERROR:", err);
    res.status(500).json({ message: "Failed to fetch top products" });
  }
};


