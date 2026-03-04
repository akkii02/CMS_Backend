const SystemSettings = require('../models/SystemSettings');

// @desc    Get system settings
// @route   GET /api/public/settings
// @access  Public
const getSystemSettings = async (req, res) => {
    try {
        let settings = await SystemSettings.findOne();
        if (!settings) {
            settings = await SystemSettings.create({});
        }
        res.json(settings);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Update system settings
// @route   PUT /api/admin/settings
// @access  Private/Admin
const updateSystemSettings = async (req, res) => {
    try {
        let settings = await SystemSettings.findOne();
        if (!settings) {
            settings = new SystemSettings();
        }

        if (req.body.globalAnnouncement) {
            settings.globalAnnouncement = { ...settings.globalAnnouncement, ...req.body.globalAnnouncement };
        }
        if (req.body.maintenanceMode) {
            settings.maintenanceMode = { ...settings.maintenanceMode, ...req.body.maintenanceMode };
        }

        await settings.save();
        res.json(settings);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

module.exports = {
    getSystemSettings,
    updateSystemSettings
};
