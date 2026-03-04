const adminService = require('../services/adminService');

// @desc    Get all clients with stats
// @route   GET /api/admin/clients
// @access  Private/Admin
const getClients = async (req, res) => {
    try {
        const clients = await adminService.getAllClientsWithStats();
        res.json(clients);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Update client subscription tier
// @route   PUT /api/admin/clients/:id/tier
// @access  Private/Admin
const updateClientTier = async (req, res) => {
    try {
        const client = await adminService.updateClientTier(req.params.id, req.body.tier);
        res.json(client);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Get platform metrics
// @route   GET /api/admin/metrics
// @access  Private/Admin
const getMetrics = async (req, res) => {
    try {
        const metrics = await adminService.getPlatformMetrics();
        res.json(metrics);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private/Admin
const getUsers = async (req, res) => {
    try {
        const users = await adminService.getAllUsers();
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Suspend/Unsuspend user
// @route   PUT /api/admin/users/:id/suspend
// @access  Private/Admin
const suspendUser = async (req, res) => {
    try {
        const user = await adminService.suspendUser(req.params.id);
        res.json(user);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Add credits to user
// @route   PUT /api/admin/users/:id/add-credits
// @access  Private/Admin
const addCredits = async (req, res) => {
    try {
        const user = await adminService.addCredits(req.params.id, req.body.credits);
        res.json(user);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Update user plan
// @route   PUT /api/admin/users/:id/plan
// @access  Private/Admin
const updateUserPlan = async (req, res) => {
    try {
        const user = await adminService.updateUserPlan(req.params.id, req.body.plan);
        res.json(user);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

module.exports = {
    getClients,
    updateClientTier,
    getMetrics,
    getUsers,
    suspendUser,
    addCredits,
    updateUserPlan
};
