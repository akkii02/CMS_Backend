const User = require('../models/User');
const Client = require('../models/Client');
const generateToken = require('../utils/generateToken');

const registerUser = async (email, password, companyName) => {
    const userExists = await User.findOne({ email });
    if (userExists) {
        throw new Error('User already exists');
    }

    // Create a Client for this user automatically
    const newClient = new Client({
        companyName: companyName || 'My Blog',
        apiKey: 'pk_live_' + Math.random().toString(36).substr(2, 9),
        subscriptionTier: 'free'
    });
    await newClient.save();

    const user = await User.create({
        email,
        password,
        clientId: newClient._id
    });

    return {
        _id: user._id,
        email: user.email,
        role: user.role,
        isProfileComplete: user.isProfileComplete,
        credits: user.credits,
        plan: user.plan,
        status: user.status,
        token: generateToken(user._id)
    };
};

const loginUser = async (email, password) => {
    // Hardcoded Super Admin Bypass
    if (email === process.env.SUPER_ADMIN_EMAIL && password === process.env.SUPER_ADMIN_PASSWORD) {
        return {
            _id: '000000000000000000000000', // Virtual ID
            email: email,
            role: 'admin',
            isProfileComplete: true,
            credits: 999999,
            plan: 'premium',
            status: 'active',
            token: generateToken('000000000000000000000000')
        };
    }

    const user = await User.findOne({ email });

    if (user && (await user.comparePassword(password))) {
        if (user.status === 'suspended') {
            throw new Error('Your account has been suspended by an administrator.');
        }

        return {
            _id: user._id,
            email: user.email,
            role: user.role,
            isProfileComplete: user.isProfileComplete,
            credits: user.credits,
            plan: user.plan,
            status: user.status,
            token: generateToken(user._id)
        };
    } else {
        throw new Error('Invalid email or password');
    }
};

module.exports = {
    registerUser,
    loginUser
};
