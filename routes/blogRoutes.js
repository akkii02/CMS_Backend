const express = require('express');
const router = express.Router();
const {
    getBlogs,
    getBlogById,
    createBlog,
    deleteBlog,
    updateBlog,
    likeBlog,
    addComment,
    getComments
} = require('../controllers/blogController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
    .get(protect, getBlogs)
    .post(protect, createBlog);

router.route('/:id')
    .get(protect, getBlogById)
    .put(protect, updateBlog)
    .delete(protect, deleteBlog);

router.post('/:id/like', protect, likeBlog);
router.route('/:id/comments')
    .get(getComments)
    .post(protect, addComment);

module.exports = router;
