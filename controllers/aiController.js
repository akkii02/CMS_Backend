const aiService = require('../services/aiService');

// @desc    Suggest SEO blog titles
// @route   POST /api/ai/suggest-titles
// @access  Private
const suggestTitles = async (req, res) => {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ message: 'Prompt is required' });

    try {
        const titles = await aiService.suggestTitles(prompt, req.user._id);
        res.json({ titles });
    } catch (err) {
        console.error("AI Title Error:", err);
        if (err.message.includes('Free users') || err.message.includes('Insufficient credits')) {
            return res.status(403).json({ message: err.message });
        }
        if (err.message.includes('429')) {
            return res.status(429).json({ message: 'Rate limit exceeded. Please wait a minute.', error: err.message });
        }
        res.status(500).json({ message: 'AI Title generation failed', error: err.message });
    }
};

// @desc    Generate a blog based on title
// @route   POST /api/ai/generate-blog
// @access  Private
const generateBlog = async (req, res) => {
    const { title } = req.body;
    if (!title) return res.status(400).json({ message: 'Title is required' });

    try {
        const contentHtml = await aiService.generateBlogContent(title, req.user._id);
        res.json({ title, contentHtml });
    } catch (err) {
        console.error("AI Generation Error:", err);
        if (err.message.includes('Free users') || err.message.includes('Insufficient credits')) {
            return res.status(403).json({ message: err.message });
        }
        if (err.message.includes('429')) {
            return res.status(429).json({ message: 'Rate limit exceeded. Please wait a minute.', error: err.message });
        }
        res.status(500).json({ message: 'AI Blog generation failed', error: err.message });
    }
};

// @desc    Batch generate draft blogs
// @route   POST /api/ai/batch-generate
// @access  Private
const batchGenerate = async (req, res) => {
    const { prompt, count = 5 } = req.body;
    if (!prompt) return res.status(400).json({ message: 'Prompt is required' });

    try {
        const blogs = await aiService.batchGenerate(prompt, count, req.user._id);
        res.json({ message: `Successfully generated ${blogs.length} drafts`, blogs });
    } catch (err) {
        console.error("AI Batch Error:", err);
        if (err.message.includes('Free users') || err.message.includes('Insufficient credits')) {
            return res.status(403).json({ message: err.message });
        }
        res.status(500).json({ message: 'AI Batch generation failed', error: err.message });
    }
};

module.exports = {
    suggestTitles,
    generateBlog,
    batchGenerate
};
