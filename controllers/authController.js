const authService = require('../services/authService');

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
    const { email, password, companyName } = req.body;
    try {
        const userData = await authService.registerUser(email, password, companyName);
        res.status(201).json(userData);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const userData = await authService.loginUser(email, password);
        res.json(userData);
    } catch (err) {
        if (err.message === 'Your account has been suspended by an administrator.') {
            return res.status(403).json({ message: err.message });
        }
        res.status(401).json({ message: err.message });
    }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
    res.json(req.user);
};

module.exports = {
    register,
    login,
    getMe
};
