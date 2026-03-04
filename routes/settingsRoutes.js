const express = require('express');
const router = express.Router();
const { updateSystemSettings } = require('../controllers/settingsController');
const { protect, admin } = require('../middleware/authMiddleware');

router.use(protect);
router.use(admin);

router.put('/', updateSystemSettings);

module.exports = router;
