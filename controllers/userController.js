const userService = require('../services/userService');

// @desc    Get user profile by ID
// @route   GET /api/users/profile/:id
// @access  Public (can be 'me' or ID)
const getUserProfile = async (req, res) => {
    try {
        const user = await userService.getUserProfile(req.params.id, req.headers.authorization);
        res.json(user);
    } catch (err) {
        if (err.message === 'User not found') return res.status(404).json({ message: err.message });
        if (err.message === 'Not authorized') return res.status(401).json({ message: err.message });
        res.status(500).json({ message: err.message });
    }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = async (req, res) => {
    try {
        const updatedUser = await userService.updateUserProfile(req.user, req.body);
        res.json(updatedUser);
    } catch (err) {
        if (err.message === 'User not found') return res.status(404).json({ message: err.message });
        res.status(500).json({ message: err.message });
    }
};

module.exports = {
    getUserProfile,
    updateUserProfile
};
