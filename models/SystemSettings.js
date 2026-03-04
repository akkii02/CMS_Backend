const mongoose = require('mongoose');

const systemSettingsSchema = new mongoose.Schema({
    globalAnnouncement: {
        text: { type: String, default: '' },
        isActive: { type: Boolean, default: false },
        type: { type: String, enum: ['info', 'warning', 'error', 'success'], default: 'info' }
    },
    maintenanceMode: {
        isActive: { type: Boolean, default: false },
        message: { type: String, default: 'Platform is currently under maintenance.' }
    }
}, { timestamps: true });

module.exports = mongoose.model('SystemSettings', systemSettingsSchema);
