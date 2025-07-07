const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const connection = require('../config/database');

router.post('/register', async (req, res) => {
  const { username, password, email, full_name } = req.body;
  if (!username || !password || !email) {
    return res.status(400).json({ message: "Missing required fields" });
  }
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await db.execute(
      'INSERT INTO users (username, password_hash, email, full_name) VALUES (?, ?, ?, ?)',
      [username, hashedPassword, email, full_name]
    );
    res.status(201).json({ id: result.insertId, username, email });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;