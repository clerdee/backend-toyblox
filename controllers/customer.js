const connection = require('../config/database');

// Get customer by user ID (used in checkout and profile)
exports.getCustomerByUserId = (req, res) => {
  const userId = req.query.user_id;

  if (!userId) {
    return res.status(400).json({ message: 'Missing user_id in request' });
  }

  const query = `
    SELECT customers.*, users.email, users.f_name, users.l_name 
    FROM customers 
    JOIN users ON users.id = customers.user_id
    WHERE customers.user_id = ? AND customers.deleted_at IS NULL
  `;

  connection.query(query, [userId], (err, results) => {
    if (err) {
      console.error('Error retrieving customer info:', err);
      return res.status(500).json({ message: 'Database error', error: err });
    }
    if (!results.length) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    res.status(200).json(results[0]);
  });
};
