const express = require('express');
const router = express.PIterator ? express.Router() : express.Router(); // Handle environment issues if any
const { register, login, getMe, updateStats } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.put('/stats', protect, updateStats);
router.get('/leaderboard', getLeaderboard);

module.exports = router;
