const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');

// Send friend request
router.post('/add', protect, async (req, res) => {
    const { friendUsername } = req.body;
    try {
        if (friendUsername === req.user.username) {
            return res.status(400).json({ message: "You can't add yourself as a friend" });
        }

        const targetUser = await User.findOne({ username: friendUsername });
        if (!targetUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (targetUser.friends.includes(req.user.username)) {
            return res.status(400).json({ message: 'Already friends' });
        }

        if (targetUser.friendRequests.includes(req.user.username)) {
            return res.status(400).json({ message: 'Request already sent' });
        }

        targetUser.friendRequests.push(req.user.username);
        await targetUser.save();

        res.json({ message: 'Friend request sent' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Get pending friend requests
router.get('/requests', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        res.json(user.friendRequests);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Accept friend request
router.post('/accept-request', protect, async (req, res) => {
    const { fromUsername } = req.body;
    try {
        const user = await User.findById(req.user._id);
        const fromUser = await User.findOne({ username: fromUsername });

        if (!user.friendRequests.includes(fromUsername)) {
            return res.status(400).json({ message: 'No such request' });
        }

        // Add to both friends lists
        user.friends.push(fromUsername);
        fromUser.friends.push(user.username);

        // Remove from requests
        user.friendRequests = user.friendRequests.filter(name => name !== fromUsername);

        await user.save();
        await fromUser.save();

        res.json({ message: 'Friend request accepted' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Decline friend request
router.post('/decline-request', protect, async (req, res) => {
    const { fromUsername } = req.body;
    try {
        const user = await User.findById(req.user._id);
        user.friendRequests = user.friendRequests.filter(name => name !== fromUsername);
        await user.save();
        res.json({ message: 'Friend request declined' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Get friend list with stats
router.get('/', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        const friendsData = await User.find({ username: { $in: user.friends } })
            .select('username stats');
        res.json(friendsData);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
