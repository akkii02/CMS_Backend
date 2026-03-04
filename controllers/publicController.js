const publicService = require('../services/publicService');
const blogService = require('../services/blogService');

// @desc    Get public blogs (Platform Feed)
// @route   GET /api/feed
// @access  Public
const getFeed = async (req, res) => {
    try {
        const blogs = await blogService.getSocialFeed();
        res.json(blogs);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Get public blogs for embed (uses API Key)
// @route   GET /api/public/blogs
// @access  Public
const getPublicBlogs = async (req, res) => {
    try {
        const blogs = await publicService.getPublicBlogs(req.query.key, req.query.slug);
        res.json(blogs);
    } catch (err) {
        if (err.message === 'Invalid API Key') return res.status(401).json({ message: err.message });
        res.status(500).json({ message: err.message });
    }
};

// @desc    Get platform stats
// @route   GET /api/public/stats
// @access  Public
const getStats = async (req, res) => {
    try {
        const stats = await publicService.getPublicStats();
        res.json(stats);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Serve dynamic embed script
// @route   GET /api/embed.js
// @access  Public
const getEmbedScript = async (req, res) => {
    try {
        const script = await publicService.getEmbedScript(req.query.key, req.protocol, req.get('host'));
        res.setHeader('Content-Type', 'application/javascript');
        res.send(script);
    } catch (err) {
        res.status(500).send('console.error("LexiBlog Embed Error: Server Error");');
    }
};

module.exports = {
    getFeed,
    getPublicBlogs,
    getStats,
    getEmbedScript
};
