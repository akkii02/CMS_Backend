const Blog = require('../models/Blog');
const User = require('../models/User');
const Comment = require('../models/Comment');

const getBlogs = async (user, queryParams) => {
    let query = {};
    // If not admin, only show own blogs
    if (user.role !== 'admin') {
        query.clientId = user.clientId;
    }

    if (queryParams.slug) {
        if (queryParams.slug.match(/^[0-9a-fA-F]{24}$/)) {
            query = { ...query, $or: [{ slug: queryParams.slug }, { _id: queryParams.slug }] };
        } else {
            query = { ...query, slug: queryParams.slug };
        }
    }
    const blogs = await Blog.find(query).sort({ createdAt: -1 });

    // Map _id to id for frontend compatibility
    return blogs.map(b => {
        const obj = b.toObject();
        obj.id = obj._id;
        return obj;
    });
};

const getSocialFeed = async () => {
    const blogs = await Blog.find({ publishToPlatform: true, status: 'published' })
        .sort({ createdAt: -1 });
    return blogs.map(b => {
        const obj = b.toObject();
        obj.id = obj._id;
        return obj;
    });
};

const getBlogById = async (id, user) => {
    let query = user.role === 'admin' ? {} : { clientId: user.clientId };
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
        query = { ...query, $or: [{ _id: id }, { slug: id }] };
    } else {
        query = { ...query, slug: id };
    }
    const blog = await Blog.findOne(query);
    if (blog) {
        const obj = blog.toObject();
        obj.id = obj._id;
        return obj;
    }
    return null;
};

const createBlog = async (blogData, user) => {
    // Credit Check for normal users
    if (user._id !== '000000000000000000000000') {
        const userDoc = await User.findById(user._id);
        if (userDoc && userDoc.role !== 'admin') {
            if (userDoc.credits < 1) {
                throw new Error('Insufficient credits to post a blog. Please upgrade your plan or contact admin.');
            }
            userDoc.credits -= 1;
            await userDoc.save();
        }
    }

    const newBlog = new Blog({
        ...blogData,
        clientId: user.clientId
    });
    await newBlog.save();
    const obj = newBlog.toObject();
    obj.id = obj._id;
    return obj;
};

const deleteBlog = async (id, user) => {
    const query = user.role === 'admin' ? { _id: id } : { _id: id, clientId: user.clientId };
    return await Blog.findOneAndDelete(query);
};

const updateBlog = async (id, blogData, user) => {
    const query = user.role === 'admin' ? { _id: id } : { _id: id, clientId: user.clientId };
    const updated = await Blog.findOneAndUpdate(query, blogData, { new: true });
    if (updated) {
        const obj = updated.toObject();
        obj.id = obj._id;
        return obj;
    }
    return null;
};

const likeBlog = async (id, userId) => {
    if (userId === '000000000000000000000000') {
        throw new Error('Super Admin cannot like blogs');
    }

    const blog = await Blog.findById(id);
    if (!blog) throw new Error('Blog not found');

    if (blog.likes.includes(userId)) {
        blog.likes = blog.likes.filter(id => id.toString() !== userId.toString());
    } else {
        blog.likes.push(userId);
    }
    await blog.save();
    return blog.likes;
};

const addComment = async (blogId, userId, text) => {
    if (userId === '000000000000000000000000') {
        throw new Error('Super Admin cannot post comments');
    }

    const comment = new Comment({
        text,
        blogId,
        userId
    });
    await comment.save();
    return await comment.populate('userId', 'name profilePicUrl');
};

const getComments = async (blogId) => {
    return await Comment.find({ blogId })
        .sort({ createdAt: -1 })
        .populate('userId', 'name profilePicUrl');
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
