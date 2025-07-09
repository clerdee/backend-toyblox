const express = require('express');
const router = express.Router();
const upload = require('../utils/multer');

const {
    getAllUsers,
    getSingleUser,
    createUser,
    updateUser,
    deleteUser,
    loginUser,
    // registerUser,
} = require('../controllers/user');

const { verifyToken, authorizeRoles } = require('../middleware/auth');
router.get('/users', verifyToken, authorizeRoles('admin'));
router.get('/users/:id', verifyToken, authorizeRoles('admin', 'user'));

router.post('/login', loginUser);
// router.post('/register', registerUser);
router.get('/users', getAllUsers);
router.get('/users/:id', getSingleUser);
router.post('/users', upload.single('profile_picture'), createUser);
router.put('/users/:id', upload.single('profile_picture'), updateUser);
router.delete('/users/:id', deleteUser);

module.exports = router;