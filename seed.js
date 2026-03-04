require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Blog = require('./models/Blog');
const Client = require('./models/Client');

async function seed() {
    try {
        await mongoose.connect(process.env.MONGO_URI, { family: 4 });
        console.log('MongoDB Connected for Seeding');

        const dataPath = path.join(__dirname, 'data.json');
        if (!fs.existsSync(dataPath)) {
            console.log('No data.json found, skipping seed.');
            process.exit(0);
        }
        const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

        // Clear existing
        await Client.deleteMany({});
        await Blog.deleteMany({});

        // Seed Clients
        const clientMap = {};
        if (data.clients) {
            for (const c of data.clients) {
                const newClient = new Client({
                    companyName: c.companyName,
                    apiKey: c.apiKey,
                    subscriptionTier: c.subscriptionTier,
                    allowedDomains: c.allowedDomains
                });
                await newClient.save();
                clientMap[c.id] = newClient._id;
            }
            console.log('Clients seeded.');
        }

        // Seed Blogs
        if (data.blogs) {
            for (const b of data.blogs) {
                const clientId = clientMap[b.clientId] || Object.values(clientMap)[0];
                const newBlog = new Blog({
                    clientId,
                    title: b.title,
                    content: b.content,
                    contentHtml: b.contentHtml,
                    coverImage: b.coverImage,
                    slug: b.slug,
                    metaDescription: b.metaDescription,
                    author: b.author,
                    keywords: b.keywords,
                    createdAt: b.createdAt ? new Date(b.createdAt) : new Date()
                });
                await newBlog.save();
            }
            console.log('Blogs seeded.');
        }

        console.log('Seeding complete!');
        process.exit(0);
    } catch (err) {
        console.error('Seeding error:', err);
        process.exit(1);
    }
}

seed();
