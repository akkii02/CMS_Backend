const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
    companyName: {
        type: String,
        required: true,
        trim: true
    },
    apiKey: {
        type: String,
        required: true,
        unique: true
    },
    subscriptionTier: {
        type: String,
        enum: ['free', 'pro', 'enterprise'],
        default: 'free'
    },
    allowedDomains: [{
        type: String,
        trim: true
    }],
    brandSettings: {
        logoUrl: { type: String, default: '' },
        primaryColor: { type: String, default: '#4f46e5' },
        footerText: { type: String, default: '' }
    }
}, { timestamps: true });

module.exports = mongoose.model('Client', clientSchema);
