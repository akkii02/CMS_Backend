const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema({
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client'
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    content: {
        type: String, // Stringified JSON
        required: true
    },
    contentHtml: {
        type: String,
        required: true
    },
    coverImage: {
        type: String
    },
    slug: {
        type: String,
        unique: true,
        sparse: true,
        trim: true
    },
    metaDescription: {
        type: String,
        trim: true
    },
    category: {
        type: String,
        default: 'General',
        trim: true
    },
    author: {
        type: String,
        trim: true
    },
    keywords: {
        type: String,
        trim: true
    },
    status: {
        type: String,
        enum: ['draft', 'published'],
        default: 'draft'
    },
    publishToPlatform: {
        type: Boolean,
        default: false
    },
    likes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }]
}, { timestamps: true });

module.exports = mongoose.model('Blog', blogSchema);
