const clientService = require('../services/clientService');

// @desc    Get current client profile
// @route   GET /api/clients/me
// @access  Private
const getMyClient = async (req, res) => {
    try {
        const client = await clientService.getClientByUserId(req.user.clientId);
        res.json(client);
    } catch (err) {
        res.status(404).json({ message: err.message });
    }
};

// @desc    Regenerate API key
// @route   POST /api/clients/regenerate-key
// @access  Private
const regenerateKey = async (req, res) => {
    try {
        const client = await clientService.regenerateApiKey(req.user.clientId);
        res.json(client);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Update client branding
// @route   PUT /api/clients/me/branding
// @access  Private
const updateBranding = async (req, res) => {
    try {
        const client = await clientService.updateBranding(req.user.clientId, req.body);
        res.json(client);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

module.exports = {
    getMyClient,
    regenerateKey,
    updateBranding
};
