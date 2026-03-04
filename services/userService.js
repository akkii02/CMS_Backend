const User = require('../models/User');
const jwt = require('jsonwebtoken');

const getUserProfile = async (id, authHeader) => {
    let query = {};
    if (id === 'me') {
        if (!authHeader) throw new Error('Not authorized');
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        query = { _id: decoded.id };
    } else {
        query = { _id: id };
    }
    const user = await User.findOne(query).select('-password');
    if (!user) throw new Error('User not found');
    return user;
};

const updateUserProfile = async (user, updateData) => {
    const { name, bio, profilePicUrl } = updateData;

    // Hardcoded bypass check if virtual ID
    if (user._id === '000000000000000000000000') {
        return { ...user, name, bio, profilePicUrl };
    }

    const userDoc = await User.findById(user._id);
    if (!userDoc) throw new Error('User not found');

    if (name !== undefined) userDoc.name = name;
    if (bio !== undefined) userDoc.bio = bio;
    if (profilePicUrl !== undefined) userDoc.profilePicUrl = profilePicUrl;

    userDoc.isProfileComplete = true;

    await userDoc.save();
    return {
        _id: userDoc._id,
        name: userDoc.name,
        bio: userDoc.bio,
        profilePicUrl: userDoc.profilePicUrl,
        isProfileComplete: userDoc.isProfileComplete
    };
};

module.exports = {
    getUserProfile,
    updateUserProfile
};
