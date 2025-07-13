const connection = require('../config/database');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const mailer = require('../config/mailer');

exports.getAllUsers = (req, res) => {
    const sql = `
    SELECT 
        id,
        f_name,
        l_name,
        email,
        password,
        profile_picture,
        role,
        created_at,
        updated_at,
        deleted_at
    FROM users
    WHERE deleted_at IS NULL`;

    try {
        connection.query(sql, (err, rows, fields) => {
            if (err) {
                console.log(err);
                return res.status(500).json({ error: 'Database query error' });
            }
            return res.status(200).json({ users: rows });
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: 'Server error' });
    }
};

exports.getSingleUser = (req, res) => {
    const sql = `
        SELECT 
            u.id,
            u.f_name,
            u.l_name,
            u.email,
            u.profile_picture,
            u.role,
            c.address,
            c.postal_code,
            c.country,
            c.phone_number
        FROM users u
        LEFT JOIN customers c ON u.id = c.user_id
        WHERE u.id = ? AND u.deleted_at IS NULL
    `;
    const values = [parseInt(req.params.id)];

    try {
        connection.execute(sql, values, (err, result, fields) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Server error while fetching user.' });
            }

            if (result.length === 0) {
                return res.status(404).json({ error: 'User not found or has been deleted.' });
            }

            return res.status(200).json({ data: result[0] });
        });
    } catch (error) {
        console.error('Unhandled error:', error);
        return res.status(500).json({ error: 'Unexpected error occurred.' });
    }
};

exports.createUser = async (req, res) => {
  const { f_name, l_name, email, password } = req.body;
  const profile_picture = req.file ? req.file.filename : null;
  const role = 'user';

  if (!f_name || !l_name || !email || !password) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Check if email already exists
    const [existingUser] = await connection.promise().execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUser.length > 0) {
      return res.status(409).json({ error: 'Email already exists. Please use a different email.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user
    const [userResult] = await connection.promise().execute(
      `INSERT INTO users (f_name, l_name, email, password, role, profile_picture)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [f_name, l_name, email, hashedPassword, role, profile_picture]
    );

    const userId = userResult.insertId;

    // Insert blank customer profile
    await connection.promise().execute(
      `INSERT INTO customers (user_id, address, postal_code, country, phone_number)
       VALUES (?, '', '', '', '')`,
      [userId]
    );

    // Generate verification and auth token
    const verifyToken = jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '1d' });
    const authToken = jwt.sign({ id: userId, role }, process.env.JWT_SECRET, { expiresIn: '24h' });

    // Send verification email
    await mailer.sendMail({
      from: '"ToyBlox PH" <toyblox@toys.com.ph>',
      to: email,
      subject: 'Please Verify Account!',
      html: `
        <h3>Hi ${f_name},</h3>
        <p>Welcome to ToyBlox! Please verify your account:</p>
        <a href="http://localhost:4000/api/v1/users/verify?token=${verifyToken}">Verify Account</a>
      `
    });

    // Respond with success
    return res.status(201).json({
      message: 'User created. Please verify your email.',
      token: authToken,
      user: {
        id: userId,
        f_name,
        l_name,
        email,
        role
      }
    });

  } catch (error) {
    console.error('CreateUser Error:', error);
    return res.status(500).json({ error: 'Server error while creating user.' });
  }
};

exports.updateUser = async (req, res) => {
    const { f_name, l_name, email, password } = req.body;
    const userId = parseInt(req.params.id);
    const profile_picture = req.file ? req.file.filename : null;
    const role = "user";

    if (!f_name || !l_name || !email || !password) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const sql = `
            UPDATE users
            SET f_name = ?, l_name = ?, email = ?, password = ?, role = ?, profile_picture = ?, updated_at = NOW()
            WHERE id = ? AND deleted_at IS NULL
        `;
        const values = [
            f_name,
            l_name,
            email,
            hashedPassword,
            role,
            profile_picture,
            userId
        ];

        connection.execute(sql, values, (err, result) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Error updating user' });
            }
            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'User not found or has been deleted.' });
            }
            return res.status(200).json({ message: 'User updated successfully' });
        });
    } catch (error) {
        console.error('Unhandled error:', error);
        return res.status(500).json({ error: 'Unexpected error occurred.' });
    }
};

exports.deleteUser = (req, res) => {
    const userId = parseInt(req.params.id);

    const sql = `
        UPDATE users
        SET deleted_at = NOW()
        WHERE id = ? AND deleted_at IS NULL
    `;
    const values = [userId];

    try {
        connection.execute(sql, values, (err, result) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Error deleting user' });
            }
            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'User not found or has already been deleted.' });
            }
            return res.status(200).json({ message: 'User deleted successfully' });
        });
    } catch (error) {
        console.error('Unhandled error:', error);
        return res.status(500).json({ error: 'Unexpected error occurred.' });
    }
};

exports.loginUser = (req, res) => {
  const { email, password } = req.body;

  const sql = 'SELECT * FROM users WHERE email = ?';
  connection.execute(sql, [email], (err, results) => {
    if (err || results.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

    const user = results[0];

    if (!user.is_verified) {
      return res.status(401).json({ error: 'Please verify your email before logging in.' });
    }

    bcrypt.compare(password, user.password, (err, isMatch) => {
      if (!isMatch) return res.status(401).json({ error: 'Invalid password' });

      const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
        expiresIn: '1d'
      });

      res.json({
        token,
        user: {
          id: user.id,
          f_name: user.f_name,
          l_name: user.l_name,
          email: user.email,
          role: user.role
        }
      });
    });
  });
};

exports.verifyEmail = (req, res) => {
  const token = req.query.token;
  if (!token) return res.status(400).send('Missing token');

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(400).send('Invalid or expired token');

    const userId = decoded.id;
    const updateSql = `UPDATE users SET is_verified = TRUE WHERE id = ?`;

    connection.execute(updateSql, [userId], (err, result) => {
      if (err) return res.status(500).send('Database error during verification');

      const userSql = `SELECT id, f_name, l_name, email, role FROM users WHERE id = ?`;
      connection.execute(userSql, [userId], (err2, results) => {
        if (err2 || results.length === 0) return res.status(500).send('User fetch failed');

        const user = results[0];

        const authToken = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
          expiresIn: '1d',
        });

        const redirectUrl = `http://localhost:4000/home.html?token=${authToken}&id=${user.id}&name=${encodeURIComponent(user.f_name)}`;
        // const redirectUrl = `http://localhost:4000/profile.html?token=${authToken}&id=${user.id}&name=${encodeURIComponent(user.f_name)}`;
        return res.redirect(redirectUrl);
      });
    });
  });
};
