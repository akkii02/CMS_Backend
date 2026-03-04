const Client = require('../models/Client');

const getClientByUserId = async (clientId) => {
    const client = await Client.findById(clientId);
    if (!client) throw new Error('Client not found');
    return client;
};

const regenerateApiKey = async (clientId) => {
    const client = await Client.findById(clientId);
    if (!client) throw new Error('Client not found');

    client.apiKey = 'pk_live_' + Math.random().toString(36).substr(2, 9);
    await client.save();
    return client;
};

const updateBranding = async (clientId, brandingData) => {
    const { logoUrl, primaryColor, secondaryColor, fontFamily, tagline, footerText, websiteUrl, socialLinks } = brandingData;
    const client = await Client.findById(clientId);
    if (!client) throw new Error('Client profile not found');

    client.brandSettings = {
        logoUrl: logoUrl ?? client.brandSettings.logoUrl,
        primaryColor: primaryColor ?? client.brandSettings.primaryColor,
        secondaryColor: secondaryColor ?? client.brandSettings.secondaryColor,
        fontFamily: fontFamily ?? client.brandSettings.fontFamily,
        tagline: tagline ?? client.brandSettings.tagline,
        footerText: footerText ?? client.brandSettings.footerText,
        websiteUrl: websiteUrl ?? client.brandSettings.websiteUrl,
        socialLinks: {
            twitter: socialLinks?.twitter ?? client.brandSettings.socialLinks?.twitter ?? '',
            linkedin: socialLinks?.linkedin ?? client.brandSettings.socialLinks?.linkedin ?? '',
            instagram: socialLinks?.instagram ?? client.brandSettings.socialLinks?.instagram ?? ''
        }
    };

    await client.save();
    return client;
};

module.exports = {
    getClientByUserId,
    regenerateApiKey,
    updateBranding
};
