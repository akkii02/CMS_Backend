const express = require('express');
const router = express.Router();
const { getFeed, getPublicBlogs, getStats, getEmbedScript } = require('../controllers/publicController');
const { getSystemSettings } = require('../controllers/settingsController');

router.get('/feed', getFeed); // Technically could be /api/feed or /api/public/feed
router.get('/blogs', getPublicBlogs);
router.get('/stats', getStats);
router.get('/embed.js', getEmbedScript);
router.get('/settings', getSystemSettings);

module.exports = router;
