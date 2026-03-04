const blogService = require('../services/blogService');

// @desc    Get all blogs (filtered by client if not admin)
// @route   GET /api/blogs
// @access  Private
const getBlogs = async (req, res) => {
    try {
        const blogs = await blogService.getBlogs(req.user, req.query);
        res.json(blogs);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Get social feed blogs
// @route   GET /api/feed
// @access  Public
const getSocialFeed = async (req, res) => {
    try {
        const blogs = await blogService.getSocialFeed();
        res.json(blogs);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Get single blog by ID or Slug
// @route   GET /api/blogs/:id
// @access  Private
const getBlogById = async (req, res) => {
    try {
        const blog = await blogService.getBlogById(req.params.id, req.user);
        if (blog) res.json(blog);
        else res.status(404).json({ message: 'Blog not found' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Create a new blog
// @route   POST /api/blogs
// @access  Private
const createBlog = async (req, res) => {
    try {
        const blog = await blogService.createBlog(req.body, req.user);
        res.status(201).json(blog);
    } catch (err) {
        if (err.message.includes('Insufficient credits')) {
            return res.status(403).json({ message: err.message });
        }
        res.status(400).json({ message: err.message });
    }
};

// @desc    Delete a blog
// @route   DELETE /api/blogs/:id
// @access  Private
const deleteBlog = async (req, res) => {
    try {
        const deleted = await blogService.deleteBlog(req.params.id, req.user);
        if (deleted) res.json(deleted);
        else res.status(404).json({ message: 'Blog not found' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Update a blog
// @route   PUT /api/blogs/:id
// @access  Private
const updateBlog = async (req, res) => {
    try {
        const updated = await blogService.updateBlog(req.params.id, req.body, req.user);
        if (updated) res.json(updated);
        else res.status(404).json({ message: 'Blog not found' });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

// @desc    Like/Unlike a blog
// @route   POST /api/blogs/:id/like
// @access  Private
const likeBlog = async (req, res) => {
    try {
        const likes = await blogService.likeBlog(req.params.id, req.user._id);
        res.json(likes);
    } catch (err) {
        if (err.message === 'Blog not found') return res.status(404).json({ message: err.message });
        if (err.message === 'Super Admin cannot like blogs') return res.status(403).json({ message: err.message });
        res.status(500).json({ message: err.message });
    }
};

// @desc    Add comment to a blog
// @route   POST /api/blogs/:id/comments
// @access  Private
const addComment = async (req, res) => {
    try {
        const comment = await blogService.addComment(req.params.id, req.user._id, req.body.text);
        res.status(201).json(comment);
    } catch (err) {
        if (err.message === 'Super Admin cannot post comments') return res.status(403).json({ message: err.message });
        res.status(500).json({ message: err.message });
    }
};

// @desc    Get comments for a blog
// @route   GET /api/blogs/:id/comments
// @access  Public
const getComments = async (req, res) => {
    try {
        const comments = await blogService.getComments(req.params.id);
        res.json(comments);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

module.exports = {
    getBlogs,
    getSocialFeed,
    getBlogById,
    createBlog,
    deleteBlog,
    updateBlog,
    likeBlog,
    addComment,
    getComments
};
