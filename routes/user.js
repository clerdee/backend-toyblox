const express = require('express');
const router = express.Router();
const upload = require('../utils/multer');
const userController = require('../controllers/user');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

// ✅ Destructure functions for cleaner route use
const {
    getAllUsers,
    getSingleUser,
    createUser,
    updateUser,
    deleteUser,
    loginUser,
    verifyEmail
} = userController;

// ✅ Public route: Email verification (no token required)
router.get('/verify', verifyEmail);

// 🔐 Protected routes: Only logged-in users (with appropriate roles)
router.get('/users', verifyToken, authorizeRoles('admin'), getAllUsers);
router.get('/users/:id', verifyToken, authorizeRoles('admin', 'user'), getSingleUser);

// 🔑 Auth routes
router.post('/login', loginUser);

// 🧾 User management
router.post('/users', upload.single('profile_picture'), createUser);
router.put('/users/:id', upload.single('profile_picture'), updateUser);
router.delete('/users/:id', deleteUser);

module.exports = router;

// lumang code
// const {
//     getAllUsers,
//     getSingleUser,
//     createUser,
//     updateUser,
//     deleteUser,
//     loginUser,
// } = require('../controllers/user');

// lumang code
// router.get('/users', verifyToken, authorizeRoles('admin'));
// router.get('/users/:id', verifyToken, authorizeRoles('admin', 'user'));
// router.post('/login', loginUser);
// router.get('/users', getAllUsers);
// router.get('/users/:id', getSingleUser);
// router.post('/users', upload.single('profile_picture'), createUser);
// router.put('/users/:id', upload.single('profile_picture'), updateUser);
// router.delete('/users/:id', deleteUser);
