const express = require('express');
const router = express.Router();
const { getMyClient, regenerateKey, updateBranding } = require('../controllers/clientController');
const { protect } = require('../middleware/authMiddleware');

router.get('/me', protect, getMyClient);
router.post('/regenerate-key', protect, regenerateKey);
router.put('/me/branding', protect, updateBranding);

module.exports = router;
