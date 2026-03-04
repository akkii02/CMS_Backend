const User = require('../models/User');
const Client = require('../models/Client');
const Blog = require('../models/Blog');

const getAllClientsWithStats = async () => {
    const clients = await Client.find({});
    return await Promise.all(clients.map(async (c) => {
        const blogCount = await Blog.countDocuments({ clientId: c._id });
        return {
            ...c.toObject(),
            blogCount
        };
    }));
};

const updateClientTier = async (id, tier) => {
    const client = await Client.findById(id);
    if (!client) throw new Error('Client not found');

    client.subscriptionTier = tier;
    await client.save();
    return client;
};

const getPlatformMetrics = async () => {
    const totalUsers = await User.countDocuments();
    const totalBlogs = await Blog.countDocuments();
    const totalClients = await Client.countDocuments();
    const recentUsers = await User.find().sort({ createdAt: -1 }).limit(5).select('-password');

    return {
        totalUsers,
        totalBlogs,
        totalClients,
        recentUsers
    };
};

const getAllUsers = async () => {
    return await User.find({}).select('-password').sort({ createdAt: -1 });
};

const suspendUser = async (id) => {
    const user = await User.findById(id);
    if (!user) throw new Error('User not found');
    user.status = user.status === 'active' ? 'suspended' : 'active';
    await user.save();
    return user;
};

const addCredits = async (id, credits) => {
    const user = await User.findById(id);
    if (!user) throw new Error('User not found');
    user.credits += parseInt(credits) || 0;
    await user.save();
    return user;
};

const updateUserPlan = async (id, plan) => {
    const user = await User.findById(id);
    if (!user) throw new Error('User not found');
    user.plan = plan;
    await user.save();
    return user;
};

module.exports = {
    getAllClientsWithStats,
    updateClientTier,
    getPlatformMetrics,
    getAllUsers,
    suspendUser,
    addCredits,
    updateUserPlan
};
