const connection = require('../config/database');
const bcrypt = require('bcrypt');

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
}

exports.getSingleUser = (req, res) => {
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
        WHERE id = ? AND deleted_at IS NULL
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

            return res.status(200).json({ user: result[0] });
        });
    } catch (error) {
        console.error('Unhandled error:', error);
        return res.status(500).json({ error: 'Unexpected error occurred.' });
    }
}

exports.createUser = async (req, res) => {
    const { f_name, l_name, email, password } = req.body;
    const profile_picture = req.file ? req.file.filename : null;
    const role = "user";

    if (!f_name || !l_name || !email || !password) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        const sql = `
            INSERT INTO users (f_name, l_name, email, password, role, profile_picture)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        const values = [
            f_name,
            l_name,
            email,
            hashedPassword,
            role,
            profile_picture
        ];

        connection.execute(sql, values, (err, result) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Error creating user' });
            }
            return res.status(201).json({ id: result.insertId });
        });
    } catch (error) {
        console.error('Unhandled error:', error);
        return res.status(500).json({ error: 'Unexpected error occurred.' });
    }
}

exports.updateUser = async (req, res) => {
    const { f_name, l_name, email, password } = req.body;
    const userId = parseInt(req.params.id);
    const profile_picture = req.file ? req.file.filename : null;
    const role = "user";

    if (!f_name || !l_name || !email || !password) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        // Hash password
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
}

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
}