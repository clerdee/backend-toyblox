// backend/controllers/user.js
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
        token,
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

    // Insert user first without token
    const [userResult] = await connection.promise().execute(
      `INSERT INTO users (f_name, l_name, email, password, role, profile_picture)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [f_name, l_name, email, hashedPassword, role, profile_picture]
    );

    const userId = userResult.insertId;

    // Generate auth token
    const authToken = jwt.sign({ id: userId, role }, process.env.JWT_SECRET, { expiresIn: '24h' });

    // Update user with the generated token
    await connection.promise().execute(
      `UPDATE users SET token = ? WHERE id = ?`,
      [authToken, userId]
    );

    // Insert blank customer profile
    await connection.promise().execute(
      `INSERT INTO customers (user_id, address, postal_code, country, phone_number)
       VALUES (?, '', '', '', '')`,
      [userId]
    );

    // Send welcome email
    try {
      await mailer.sendMail({
        from: '"ToyBlox PH" <toyblox@toys.com.ph>',
        to: email,
        subject: 'Welcome to ToyBlox!',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
            <div style="background-color: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <h2 style="color: #2c3e50; text-align: center; margin-bottom: 30px;">Welcome to ToyBlox! 🎉</h2>
              
              <p style="color: #34495e; font-size: 16px; line-height: 1.6;">
                Hi <strong>${f_name}</strong>,
              </p>
              
              <p style="color: #34495e; font-size: 16px; line-height: 1.6;">
                Welcome to ToyBlox! We're excited to have you join our community of toy enthusiasts.
              </p>
            
              <p style="color: #7f8c8d; font-size: 14px; line-height: 1.5; margin-top: 30px;">
                If you didn't create an account with ToyBlox, please ignore this email.
              </p>
              
              <hr style="border: none; border-top: 1px solid #ecf0f1; margin: 30px 0;">
              
              <p style="color: #95a5a6; font-size: 12px; text-align: center;">
                © 2025 ToyBlox PH. All rights reserved.
              </p>
            </div>
          </div>
        `
      });
      
      console.log('Welcome email sent successfully to:', email);
    } catch (emailError) {
      console.error('Error sending welcome email:', emailError);
      // Continue with registration even if email fails
    }

    // Respond with success
    return res.status(201).json({
      message: 'User created successfully!',
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

// Simple email verification function (optional - can be removed)
// exports.verifyEmail = async (req, res) => {
//   return res.status(200).json({ message: 'Email verification not required for this application.' });
// };

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

    bcrypt.compare(password, user.password, (err, isMatch) => {
      if (!isMatch) return res.status(401).json({ error: 'Invalid password' });

      const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
        expiresIn: '1d'
      });

      // Update the token in the database
      const updateTokenSql = 'UPDATE users SET token = ? WHERE id = ?';
      connection.execute(updateTokenSql, [token, user.id], (updateErr) => {
        if (updateErr) {
          console.error('Error updating token:', updateErr);
          return res.status(500).json({ error: 'Server error while updating token' });
        }

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
  });
};

// Add this to your backend/controllers/user.js - replace the existing updateProfile function

exports.updateProfile = async (req, res) => {
  const { f_name, l_name, email, address, postal_code, country, phone_number, current_password, new_password } = req.body;
  const userId = parseInt(req.params.id);
  const profile_picture = req.file ? req.file.filename : null;

  // Basic validation
  if (!f_name || !l_name || !email) {
    return res.status(400).json({ error: 'First name, last name, and email are required' });
  }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address' });
  }

  // Password validation if changing password
  if (new_password && !current_password) {
    return res.status(400).json({ error: 'Current password is required to set a new password' });
  }

  if (new_password && new_password.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters long' });
  }

  try {
    // Check if user exists and get current password
    const [userCheck] = await connection.promise().execute(
      'SELECT id, password FROM users WHERE id = ? AND deleted_at IS NULL',
      [userId]
    );

    if (userCheck.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const currentUser = userCheck[0];

    // Verify current password if changing password
    if (new_password) {
      const isCurrentPasswordValid = await bcrypt.compare(current_password, currentUser.password);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }
    }

    // Check if email is already taken by another user
    const [emailCheck] = await connection.promise().execute(
      'SELECT id FROM users WHERE email = ? AND id != ? AND deleted_at IS NULL',
      [email, userId]
    );

    if (emailCheck.length > 0) {
      return res.status(409).json({ error: 'Email already exists. Please use a different email.' });
    }

    // Prepare user update query
    let updateUserSql = `
      UPDATE users 
      SET f_name = ?, l_name = ?, email = ?, updated_at = NOW()
    `;
    let userValues = [f_name, l_name, email];

    // Add password to update if provided
    if (new_password) {
      const hashedPassword = await bcrypt.hash(new_password, 10);
      updateUserSql += ', password = ?';
      userValues.push(hashedPassword);
    }

    // Add profile picture to update if provided
    if (profile_picture) {
      updateUserSql += ', profile_picture = ?';
      userValues.push(profile_picture);
    }

    updateUserSql += ' WHERE id = ? AND deleted_at IS NULL';
    userValues.push(userId);

    await connection.promise().execute(updateUserSql, userValues);

    // Update customer table
    const updateCustomerSql = `
      UPDATE customers 
      SET address = ?, postal_code = ?, country = ?, phone_number = ?
      WHERE user_id = ?
    `;
    const customerValues = [
      address || '',
      postal_code || '',
      country || '',
      phone_number || '',
      userId
    ];

    await connection.promise().execute(updateCustomerSql, customerValues);

    // Fetch updated user data to return
    const [updatedUser] = await connection.promise().execute(`
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
    `, [userId]);

    return res.status(200).json({
      message: new_password ? 'Profile and password updated successfully' : 'Profile updated successfully',
      data: updatedUser[0]
    });

  } catch (error) {
    console.error('Profile update error:', error);
    return res.status(500).json({ error: 'Server error while updating profile' });
  }
};