const express = require('express');
const { register, login, getMe, updateUser, searchUsers } = require('../controllers/authController');
const protect = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadProfileImage');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.patch('/update', protect, upload.single('profileImage'), updateUser);
router.get('/me', protect, getMe);
router.get('/search', protect, searchUsers);

module.exports = router;
