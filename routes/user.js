const express = require('express');
const router = express.Router();
const upload = require('../utils/multer');

const {
    getAllUsers,
    getSingleUser,
    createUser,
    updateUser,
    deleteUser
} = require('../controllers/user');

router.get('/users', getAllUsers);
router.get('/users/:id', getSingleUser);
router.post('/users', upload.single('profile_picture'), createUser);
router.put('/users/:id', upload.single('profile_picture'), updateUser);
router.delete('/users/:id', deleteUser);

module.exports = router;