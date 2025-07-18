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
    verifyEmail,
    reactivateUser,
} = userController;

// 🔑 Auth routes
router.post('/login', loginUser);
// router.get('/verify', verifyEmail);

// 🧾 User management
router.post('/users', upload.single('profile_picture'), createUser); // Public Registration

// router.put('/users/:id', upload.single('profile_picture'), updateUser);

// 🔐 Protected routes: Only logged-in users (with appropriate roles)
// router.delete('/users/:id', deleteUser);
// router.get('/users', verifyToken, authorizeRoles('admin'), getAllUsers);
// router.get('/users/:id', verifyToken, authorizeRoles('admin', 'user'), getSingleUser);

// Protected: Admin/User Access
router.get('/users', verifyToken, authorizeRoles('admin'), getAllUsers);
router.get('/users/:id', verifyToken, authorizeRoles('admin', 'user'), getSingleUser);
router.put('/users/:id', verifyToken, authorizeRoles('admin', 'user'), upload.single('profile_picture'), updateUser);
router.delete('/users/:id', verifyToken, authorizeRoles('admin'), deleteUser);
router.put('/users/:id/reactivate', verifyToken, authorizeRoles('admin'), userController.reactivateUser);

// Profile update route with file upload (using updateProfile controller)
router.put('/users/:id/profile', verifyToken, authorizeRoles('admin', 'user'), upload.single('profile_picture'), userController.updateProfile);

module.exports = router;