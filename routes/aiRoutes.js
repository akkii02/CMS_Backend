const express = require('express');
const router = express.Router();
const { suggestTitles, generateBlog, batchGenerate } = require('../controllers/aiController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.post('/suggest-titles', suggestTitles);
router.post('/generate-blog', generateBlog);
router.post('/batch-generate', batchGenerate);

module.exports = router;
