require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');

const jwt = require('jsonwebtoken');
const Blog = require('./models/Blog');
const Client = require('./models/Client');
const User = require('./models/User');
const Comment = require('./models/Comment');
const { protect, admin } = require('./middleware/authMiddleware');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const key = (process.env.GEMINI_API_KEY || "").trim();
const genAI = new GoogleGenerativeAI(key);
if (key) {
  console.log(`AI Architect: Gemini Loaded (Key starts with: ${key.substring(0, 4)}...)`);
} else {
  console.warn("AI Architect: GEMINI_API_KEY is missing in .env");
}

const app = express();

// Handle unhandled rejections to prevent silent crashes
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  // Optionally: process.exit(1) if you want to restart
});

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI, { family: 4 })
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.error('MongoDB Connection Error:', err));

// --- Authentication ---
app.post('/api/auth/register', async (req, res) => {
  const { email, password, companyName } = req.body;
  try {
    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ message: 'User already exists' });

    // Create a Client for this user automatically
    const newClient = new Client({
      companyName: companyName || 'My Blog',
      apiKey: 'pk_live_' + Math.random().toString(36).substr(2, 9),
      subscriptionTier: 'free'
    });
    await newClient.save();

    const user = await User.create({
      email,
      password,
      clientId: newClient._id
    });

    res.status(201).json({
      _id: user._id,
      email: user.email,
      role: user.role,
      token: generateToken(user._id)
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    // Hardcoded Super Admin Bypass
    if (email === process.env.SUPER_ADMIN_EMAIL && password === process.env.SUPER_ADMIN_PASSWORD) {
      return res.json({
        _id: '000000000000000000000000', // Virtual ID
        email: email,
        role: 'admin',
        token: generateToken('000000000000000000000000')
      });
    }

    const user = await User.findOne({ email });
    if (user && (await user.comparePassword(password))) {
      res.json({
        _id: user._id,
        email: user.email,
        role: user.role,
        token: generateToken(user._id)
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/auth/me', protect, async (req, res) => {
  res.json(req.user);
});

// --- Blog CRUD ---
app.get('/api/blogs', protect, async (req, res) => {
  try {
    let query = {};
    // If not admin, only show own blogs
    if (req.user.role !== 'admin') {
      query.clientId = req.user.clientId;
    }

    if (req.query.slug) {
      if (req.query.slug.match(/^[0-9a-fA-F]{24}$/)) {
        query = { ...query, $or: [{ slug: req.query.slug }, { _id: req.query.slug }] };
      } else {
        query = { ...query, slug: req.query.slug };
      }
    }
    const blogs = await Blog.find(query).sort({ createdAt: -1 });

    // Map _id to id for frontend compatibility
    const formatted = blogs.map(b => {
      const obj = b.toObject();
      obj.id = obj._id;
      return obj;
    });
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// --- Social Feed Api ---
app.get('/api/feed', async (req, res) => {
  try {
    const blogs = await Blog.find({ publishToPlatform: true, status: 'published' })
      .sort({ createdAt: -1 });
    const formatted = blogs.map(b => {
      const obj = b.toObject();
      obj.id = obj._id;
      return obj;
    });
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/blogs/:id', protect, async (req, res) => {
  try {
    let query = req.user.role === 'admin' ? {} : { clientId: req.user.clientId };
    if (req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      query = { ...query, $or: [{ _id: req.params.id }, { slug: req.params.id }] };
    } else {
      query = { ...query, slug: req.params.id };
    }
    const blog = await Blog.findOne(query);
    if (blog) {
      const obj = blog.toObject();
      obj.id = obj._id;
      res.json(obj);
    } else res.status(404).json({ message: 'Blog not found' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/blogs', protect, async (req, res) => {
  try {
    const newBlog = new Blog({
      ...req.body,
      clientId: req.user.clientId
    });
    await newBlog.save();
    const obj = newBlog.toObject();
    obj.id = obj._id;
    res.status(201).json(obj);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.delete('/api/blogs/:id', protect, async (req, res) => {
  try {
    const query = req.user.role === 'admin' ? { _id: req.params.id } : { _id: req.params.id, clientId: req.user.clientId };
    const deleted = await Blog.findOneAndDelete(query);
    if (deleted) res.json(deleted);
    else res.status(404).json({ message: 'Blog not found' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.put('/api/blogs/:id', protect, async (req, res) => {
  try {
    const query = req.user.role === 'admin' ? { _id: req.params.id } : { _id: req.params.id, clientId: req.user.clientId };
    const updated = await Blog.findOneAndUpdate(query, req.body, { new: true });
    if (updated) {
      const obj = updated.toObject();
      obj.id = obj._id;
      res.json(obj);
    } else res.status(404).json({ message: 'Blog not found' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// --- Profiles & Social Feed ---
app.get('/api/users/profile/:id', async (req, res) => {
  try {
    let query = {};
    if (req.params.id === 'me') {
      if (!req.headers.authorization) return res.status(401).json({ message: 'Not authorized' });
      const token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      query = { _id: decoded.id };
    } else {
      query = { _id: req.params.id };
    }
    const user = await User.findOne(query).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.put('/api/users/profile', protect, async (req, res) => {
  try {
    const { name, bio, profilePicUrl } = req.body;
    // Hardcoded bypass check if virtual ID
    if (req.user._id === '000000000000000000000000') {
      return res.json({ ...req.user, name, bio, profilePicUrl });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (name !== undefined) user.name = name;
    if (bio !== undefined) user.bio = bio;
    if (profilePicUrl !== undefined) user.profilePicUrl = profilePicUrl;

    await user.save();
    res.json({ _id: user._id, name: user.name, bio: user.bio, profilePicUrl: user.profilePicUrl });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/blogs/:id/like', protect, async (req, res) => {
  try {
    if (req.user._id === '000000000000000000000000') return res.status(403).json({ message: 'Super Admin cannot like blogs' });

    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ message: 'Blog not found' });

    if (blog.likes.includes(req.user._id)) {
      blog.likes = blog.likes.filter(id => id.toString() !== req.user._id.toString());
    } else {
      blog.likes.push(req.user._id);
    }
    await blog.save();
    res.json(blog.likes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/blogs/:id/comments', protect, async (req, res) => {
  try {
    // SuperAdmin bypass handle
    if (req.user._id === '000000000000000000000000') return res.status(403).json({ message: 'Super Admin cannot post comments' });

    const comment = new Comment({
      text: req.body.text,
      blogId: req.params.id,
      userId: req.user._id
    });
    await comment.save();
    const populated = await comment.populate('userId', 'name profilePicUrl');
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/blogs/:id/comments', async (req, res) => {
  try {
    const comments = await Comment.find({ blogId: req.params.id })
      .sort({ createdAt: -1 })
      .populate('userId', 'name profilePicUrl');
    res.json(comments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// --- SaaS Client API ---
app.get('/api/clients/me', protect, async (req, res) => {
  try {
    const client = await Client.findById(req.user.clientId);
    if (client) res.json(client);
    else res.status(404).json({ message: 'Client not found' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/clients/regenerate-key', protect, async (req, res) => {
  try {
    const client = await Client.findById(req.user.clientId);
    if (!client) return res.status(404).json({ message: 'Client not found' });

    client.apiKey = 'pk_live_' + Math.random().toString(36).substr(2, 9);
    await client.save();
    res.json(client);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// --- Admin Management ---
app.get('/api/admin/clients', protect, admin, async (req, res) => {
  try {
    const clients = await Client.find({});
    // Aggregate blog counts for each client
    const clientsWithStats = await Promise.all(clients.map(async (c) => {
      const blogCount = await Blog.countDocuments({ clientId: c._id });
      return {
        ...c.toObject(),
        blogCount
      };
    }));
    res.json(clientsWithStats);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.put('/api/admin/clients/:id/tier', protect, admin, async (req, res) => {
  try {
    const { tier } = req.body;
    const client = await Client.findById(req.params.id);
    if (!client) return res.status(404).json({ message: 'Client not found' });

    client.subscriptionTier = tier;
    await client.save();
    res.json(client);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.put('/api/clients/me/branding', protect, async (req, res) => {
  try {
    const { logoUrl, primaryColor, footerText } = req.body;
    const client = await Client.findById(req.user.clientId);
    if (!client) return res.status(404).json({ message: 'Client profile not found' });

    client.brandSettings = {
      logoUrl: logoUrl || client.brandSettings.logoUrl,
      primaryColor: primaryColor || client.brandSettings.primaryColor,
      footerText: footerText || client.brandSettings.footerText
    };

    await client.save();
    res.json(client);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// --- Admin Monitoring Metric ---
app.get('/api/admin/metrics', protect, admin, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalBlogs = await Blog.countDocuments();
    const totalClients = await Client.countDocuments();
    const recentUsers = await User.find().sort({ createdAt: -1 }).limit(5).select('-password');

    res.json({
      totalUsers,
      totalBlogs,
      totalClients,
      recentUsers
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// --- Public Embed API (No protect middleware, uses API Key) ---
app.get('/api/public/blogs', async (req, res) => {
  try {
    const apiKey = req.query.key;
    const client = await Client.findOne({ apiKey });
    if (!client) return res.status(401).json({ message: 'Invalid API Key' });

    let query = { clientId: client._id, status: 'published' };
    if (req.query.slug) {
      query.slug = req.query.slug;
    }

    const blogs = await Blog.find(query).sort({ createdAt: -1 });
    res.json(blogs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// --- Embed Script ---
app.get('/api/embed.js', async (req, res) => {
  const apiKey = req.query.key;

  // 1. Client Authorization
  const client = await Client.findOne({ apiKey });
  if (!client) {
    res.setHeader('Content-Type', 'application/javascript');
    return res.send(`
          (function() {
              console.error("LexiBlog Error: Unauthorized or Missing API Key.");
              const container = document.getElementById('blog-embed-container');
              if (container) {
                  container.innerHTML = '<div style="font-family: sans-serif; padding: 20px; border: 1px solid #ef4444; background: #fef2f2; color: #991b1b; border-radius: 8px;"><strong>LexiBlog Unauthorized:</strong> Invalid API Key provided in embed script.</div>';
              }
          })();
      `);
  }

  // 2. Generate Valid Embed Script
  const serverUrl = req.protocol + '://' + req.get('host');
  const scriptContent = `
    (function() {
      // Allow overriding theme via ?theme=dark
      const scriptTags = document.getElementsByTagName('script');
      let theme = 'light';
      for(let script of scriptTags) {
          if (script.src.includes('embed.js')) {
              try {
                  const url = new URL(script.src);
                  if (url.searchParams.get('theme')) theme = url.searchParams.get('theme');
              } catch(e) {}
          }
      }

      const container = document.getElementById('blog-embed-container');
      if (!container) {
        console.error('LexiBlog Embed Error: Please ensure <div id="blog-embed-container"></div> exists in your HTML.');
        return;
      }

      // Check for specific blog ID and theme overriding
      theme = container.getAttribute('data-theme') || theme;
      const specificBlogId = container.getAttribute('data-blog-id');

      // Attach Shadow DOM for perfect CSS isolation
      const shadow = container.shadowRoot || container.attachShadow({ mode: 'open' });

      // Theme Colors Map
      const themes = {
        light: { bg: '#ffffff', text: '#333333', muted: '#777', border: '#eaeaea', primary: '#2563eb', cardBg: '#fafafa' },
        dark: { bg: '#1a1a1a', text: '#e0e0e0', muted: '#888', border: '#333', primary: '#3b82f6', cardBg: '#2a2a2a' },
        ocean: { bg: '#f0f9ff', text: '#0c4a6e', muted: '#075985', border: '#bae6fd', primary: '#0ea5e9', cardBg: '#e0f2fe' },
        midnight: { bg: '#020617', text: '#f8fafc', muted: '#94a3b8', border: '#1e293b', primary: '#818cf8', cardBg: '#0f172a' },
        cyberpunk: { bg: '#000000', text: '#00ff41', muted: '#008f11', border: '#003b00', primary: '#f000ff', cardBg: '#0d0208' },
        notion: { bg: '#ffffff', text: '#37352f', muted: '#73726e', border: '#e8e8e8', primary: '#2eaadc', cardBg: '#ffffff' }
      };

      const colors = themes[theme] || themes.light;

      shadow.innerHTML = \\\`
        <style>
          :host {
            display: block;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: \\\${colors.text};
            background: transparent;
            box-sizing: border-box;
          }
          * { box-sizing: border-box; }
          .embed-loading { padding: 40px; text-align: center; color: \\\${colors.muted}; }
          
          /* View Toggle Styles */
          .blog-list-view { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 24px; padding: 10px; }
          @media (max-width: 600px) { .blog-list-view { grid-template-columns: 1fr; } }
          .blog-detail-view { display: none; animation: fadeIn 0.4s ease-out; background: \\\${colors.bg}; border-radius: 16px; border: 1px solid \\\${colors.border}; overflow: hidden; }
          @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

          /* Blog Card Styles */
          .blog-card {
            background: \\\${colors.cardBg}; border: 1px solid \\\${colors.border}; border-radius: 12px;
            overflow: hidden; cursor: pointer; transition: all 0.2s ease;
            display: flex; flex-direction: column;
          }
          .blog-card:hover { transform: translateY(-4px); box-shadow: 0 12px 24px rgba(0,0,0,0.08); border-color: \\\${colors.primary}; }
          .blog-card img { width: 100%; height: 200px; object-fit: cover; border-bottom: 1px solid \\\${colors.border}; }
          .blog-card-content { padding: 24px; flex: 1; display: flex; flex-direction: column; justify-content: space-between; gap: 12px;}
          .blog-title { margin: 0; font-size: 1.35rem; color: \\\${colors.text}; font-weight: 700; line-height: 1.35; letter-spacing: -0.01em;}
          .blog-date { margin: 0; color: \\\${colors.muted}; font-size: 0.9rem; font-weight: 500;}

          /* In-Page Detail Styles */
          .back-button {
            display: inline-flex; align-items: center; gap: 8px; margin: 30px 40px 10px; padding: 8px 16px;
            cursor: pointer; color: \\\${colors.muted}; font-weight: 600; font-size: 0.95rem; background: \\\${colors.cardBg};
            border: 1px solid \\\${colors.border}; border-radius: 8px; transition: all 0.2s;
          }
          .back-button:hover { color: \\\${colors.text}; border-color: \\\${colors.text}; background: transparent; }
          .detail-cover { width: 100%; max-height: 450px; object-fit: cover; border-bottom: 1px solid \\\${colors.border}; }
          .detail-header { padding: 40px 40px 20px; }
          .article-title { margin: 0 0 16px 0; font-size: 3rem; font-weight: 800; line-height: 1.15; letter-spacing: -0.02em; }
          .article-date { color: \\\${colors.muted}; margin: 0; font-weight: 500; font-size: 1rem;}

          /* Professional Blog Content Styles */
          .blog-body { padding: 0 40px 60px; font-size: 1.15rem; line-height: 1.8; color: \\\${colors.text}; max-width: 800px; margin: 0; }
          @media (max-width: 768px) {
            .back-button { margin: 20px 24px 10px; }
            .detail-header { padding: 30px 24px 20px; }
            .blog-body { padding: 0 24px 40px; font-size: 1.05rem; }
            .article-title { font-size: 2.2rem; }
            .blog-list-view { padding: 0; }
          }
          .blog-body h1, .blog-body h2, .blog-body h3, .blog-body h4 { font-weight: 700; margin-top: 2em; margin-bottom: 0.8em; line-height: 1.3; color: \\\${colors.text}; letter-spacing: -0.01em;}
          .blog-body h1 { font-size: 2.2em; font-weight: 800; letter-spacing: -0.02em; }
          .blog-body h2 { font-size: 1.8em; }
          .blog-body h3 { font-size: 1.4em; }
          .blog-body p { margin-bottom: 1.5em; }
          .blog-body a { color: \\\${colors.primary}; text-decoration: underline; text-underline-offset: 4px; text-decoration-thickness: 2px; }
          .blog-body blockquote { border-left: 4px solid \\\${colors.primary}; font-style: italic; color: \\\${colors.muted}; margin: 2em 0; background: \\\${colors.cardBg}; padding: 20px 28px; border-radius: 0 12px 12px 0; font-size: 1.1em; }
          .blog-body ul { list-style-type: disc; padding-left: 1.5em; margin-bottom: 1.5em; }
          .blog-body ol { list-style-type: decimal; padding-left: 1.5em; margin-bottom: 1.5em; }
          .blog-body li { margin-bottom: 0.5em; padding-left: 0.5em; }
          .blog-body code { background: \\\${colors.cardBg}; padding: 3px 6px; border-radius: 6px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 0.85em; border: 1px solid \\\${colors.border}; }
          .blog-body pre { background: #1e1e1e; color: #d4d4d4; padding: 24px; border-radius: 12px; overflow-x: auto; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 0.9em; margin: 2em 0; border: 1px solid #333; line-height: 1.6; }
          .blog-body pre code { background: transparent; padding: 0; border: none; color: inherit; }
          .blog-body strong { font-weight: 700; color: \\\${colors.text}; }
          .blog-body em { font-style: italic; }
          .blog-body img { max-width: 100%; height: auto; border-radius: 12px; margin: 2em 0; }
          
          /* Core Utility Classes */
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .text-justify { text-align: justify; }
        </style>
        <div id="wrapper">
          <div class="embed-loading">Loading blogs...</div>
        </div>
      \\\`;

      const wrapper = shadow.getElementById('wrapper');
      
      const fetchUrl = specificBlogId ? \`\${serverUrl}/api/public/blogs/\${specificBlogId}\` : \`\${serverUrl}/api/public/blogs\`;

      // Pass the API Key back to the backend when fetching the actual JSON data
      const secureFetchUrl = fetchUrl + (fetchUrl.includes('?') ? '&' : '?') + 'key=${apiKey}';

      fetch(secureFetchUrl)
        .then(response => response.json())
        .then(data => {
          const blogs = specificBlogId ? [data] : data; // Normalize to array

          if (!blogs || blogs.length === 0) {
            wrapper.innerHTML = '<div class="embed-loading">No blogs found.</div>';
            return;
          }

          let html = '<div id="blog-list-view" class="blog-list-view" ' + (specificBlogId ? 'style="display:none;"' : '') + '>';
          let detailsHtml = '';

          blogs.forEach(blog => {
            const dateStr = new Date(blog.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
            
            // List Item
            html += \\\`
              <div class="blog-card" onclick="
                this.getRootNode().getElementById('blog-list-view').style.display='none';
                this.getRootNode().getElementById('blog-detail-\\\${blog.id}').style.display='block';
                window.scrollTo({ top: this.getRootNode().host.offsetTop - 50, behavior: 'smooth' });
              ">
                \\\${blog.coverImage ? \\\`<img src="\\\${blog.coverImage}" alt="Cover"/>\\\` : \\\`<div style="height: 12px; background: \\\${colors.primary}"></div>\\\`}
                <div class="blog-card-content">
                  <h3 class="blog-title">\\\${blog.title}</h3>
                  <p class="blog-date">\\\${dateStr}</p>
                </div>
              </div>
            \\\`;
            
            // In-page Detail Item
            detailsHtml += \\\`
              <div id="blog-detail-\\\${blog.id}" class="blog-detail-view" \\\${specificBlogId ? 'style="display:block;"' : ''}>
                \\\${!specificBlogId ? \\\`
                <button class="back-button" onclick="
                  this.getRootNode().getElementById('blog-detail-\\\${blog.id}').style.display='none';
                  this.getRootNode().getElementById('blog-list-view').style.display='grid';
                  window.scrollTo({ top: this.getRootNode().host.offsetTop - 50, behavior: 'smooth' });
                ">&larr; Back to all posts</button>
                \\\` : ''}
                
                \\\${blog.coverImage ? \\\`<img src="\\\${blog.coverImage}" class="detail-cover" alt="Cover"/>\\\` : ''}
                <div class="detail-header">
                  <h1 class="article-title">\\\${blog.title}</h1>
                  <p class="article-date">\\\${dateStr}</p>
                </div>
                <div class="blog-body">
                  \\\${blog.contentHtml || renderSimpleFallback(blog.content)}
                </div>
              </div>
            \\\`;
          });
          html += '</div>';
          
          // Clear any initial fallback content
          container.innerHTML = '';
          // Inject the rich, styled interactive Shadow DOM view
          wrapper.innerHTML = html + detailsHtml;
        })
        .catch(err => {
          console.error('Blog Embed Error:', err);
          wrapper.innerHTML = '<div class="embed-loading">Error loading blogs. Please check connection.</div>';
        });

      // Rough fallback parser for older blogs that only have JSON state
      function renderSimpleFallback(contentStr) {
        if (!contentStr) return '';
        try {
          const content = typeof contentStr === 'string' ? JSON.parse(contentStr) : contentStr;
          if (!content.root || !content.root.children) return '';
          
          let html = '';
          content.root.children.forEach(node => {
            if (node.type === 'paragraph' || node.type === 'heading') {
              let text = '';
              node.children?.forEach(child => {
                 if (child.type === 'text') {
                    let formatted = child.text;
                    if (child.format & 1) formatted = \\\`<strong>\\\${formatted}</strong>\\\`;
                    if (child.format & 2) formatted = \\\`<em>\\\${formatted}</em>\\\`;
                    if (child.format & 8) formatted = \\\`<u>\\\${formatted}</u>\\\`;
                    text += formatted;
                 } else if (child.type === 'link' || child.type === 'autolink') {
                    // very basic text extraction from link
                    child.children?.forEach(linkChild => {
                         if (linkChild.type === 'text') text += \\\`<a href="\\\${child.url}" target="_blank">\\\${linkChild.text}</a>\\\`;
                    })
                 }
              });
              const tag = node.type === 'heading' ? \\\`h\\\${node.tag || 2}\\\` : 'p';
              html += \\\`<\\\${tag}>\\\${text || '<br/>'}</\\\${tag}>\\\`;
            } else if (node.type === 'list') {
              const tag = node.listType === 'number' ? 'ol' : 'ul';
              html += \\\`<\\\${tag}>\\\`;
              node.children?.forEach(li => {
                let text = '';
                li.children?.forEach(child => {
                  if (child.type === 'text') text += child.text;
                });
                html += \\\`<li>\\\${text}</li>\\\`;
              });
              html += \\\`</\\\${tag}>\\\`;
            } else if (node.type === 'quote') {
                let text = '';
                node.children?.forEach(child => {
                  if (child.type === 'text') text += child.text;
                });
                html += \\\`<blockquote>\\\${text}</blockquote>\\\`;
            }
          });
          return html;
        } catch (e) {
          return \\\`<p>\\\${contentStr}</p>\\\`;
        }
      }

    })();
  `;
  res.setHeader('Content-Type', 'application/javascript');
  res.send(scriptContent);
});

// --- Public Platform Stats (New) ---
app.get('/api/public/stats', async (req, res) => {
  try {
    const totalBlogs = await Blog.countDocuments();
    const totalClients = await Client.countDocuments();
    res.json({
      totalBlogs,
      totalClients,
      uptime: "99.98%",
      lastDeployment: new Date().toISOString(),
      pioneerCount: totalClients,
      availableSlots: Math.max(0, 10 - totalClients)
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// --- AI Blog Architect API ---
app.post('/api/ai/suggest-titles', protect, async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ message: 'Prompt is required' });

  try {
    let model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    let result;
    try {
      result = await model.generateContent(`Suggest 20 SEO blog titles for: "${prompt}". Simple list.`);
    } catch (err) {
      if (err.message.includes('404') || err.message.includes('429')) {
        console.warn(`gemini-2.5-flash failed with ${err.message.includes('429') ? 'Rate Limit (429)' : '404'}, retrying with gemini-flash-lite-latest...`);
        model = genAI.getGenerativeModel({ model: "gemini-flash-lite-latest" });
        result = await model.generateContent(`Suggest 20 SEO blog titles for: "${prompt}". Simple list.`);
      } else throw err;
    }
    const response = await result.response;
    const text = response.text();
    const titles = text.split('\n').map(t => t.replace(/^[*-]\s*|^\d+\.\s*/, '').trim()).filter(t => t.length > 0).slice(0, 20);
    res.json({ titles });
  } catch (err) {
    console.error("AI Title Error:", err);
    if (err.message && err.message.includes('429')) {
      return res.status(429).json({ message: 'Rate limit exceeded for all models. Please wait a minute before trying again.', error: err.message });
    }
    res.status(500).json({ message: 'AI Title generation failed', error: err.message });
  }
});

app.post('/api/ai/generate-blog', protect, async (req, res) => {
  const { title } = req.body;
  if (!title) return res.status(400).json({ message: 'Title is required' });

  try {
    let model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = `Write a professionally formatted blog for: "${title}". 
      CRITICAL INSTRUCTIONS: 
      1. ONLY output raw HTML. Do not wrap it in \`\`\`html or any markdown blocks.
      2. Do NOT output a <style> block, <head>, or <body> tags. Only output the inner content tags.
      3. Use ONLY standard structural HTML elements: <h1>, <h2>, <h3>, <p>, <ul>, <ol>, <li>, <strong>, <em>, <blockquote>.
      4. Do not include any placeholder text or external CSS links.
      5. AESTHETICS & ENGAGEMENT: Make it visually attractive! Use <strong> for key terms to make them pop. Incorporate subtle, professional emojis in headers or lists. Use short, punchy paragraphs. Include at least one <blockquote> for a key takeaway or quote.`;

    let result;
    try {
      result = await model.generateContent(prompt);
    } catch (err) {
      if (err.message.includes('404') || err.message.includes('429')) {
        console.warn(`gemini-2.5-flash failed with ${err.message.includes('429') ? 'Rate Limit (429)' : '404'}, retrying with gemini-flash-lite-latest...`);
        model = genAI.getGenerativeModel({ model: "gemini-flash-lite-latest" });
        result = await model.generateContent(prompt);
      } else throw err;
    }
    const response = await result.response;
    // Strip markdown wrappers if Gemini still includes them
    const cleanHtml = response.text().replace(/^```html\n?|```$/g, '').trim();
    res.json({ title, contentHtml: cleanHtml });
  } catch (err) {
    console.error("AI Generation Error:", err);
    if (err.message && err.message.includes('429')) {
      return res.status(429).json({ message: 'Rate limit exceeded for all models. Please wait a minute before trying again.', error: err.message });
    }
    res.status(500).json({ message: 'AI Blog generation failed', error: err.message });
  }
});

app.post('/api/ai/batch-generate', protect, async (req, res) => {
  const { prompt, count = 5 } = req.body;
  if (!prompt) return res.status(400).json({ message: 'Prompt is required' });

  try {
    let model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    let titlesResult;
    try {
      titlesResult = await model.generateContent(`Give me ${count} blog titles for: "${prompt}". List only.`);
    } catch (err) {
      if (err.message.includes('404') || err.message.includes('429')) {
        console.warn(`gemini-2.5-flash failed with ${err.message.includes('429') ? 'Rate Limit (429)' : '404'}, retrying with gemini-flash-lite-latest...`);
        model = genAI.getGenerativeModel({ model: "gemini-flash-lite-latest" });
        titlesResult = await model.generateContent(`Give me ${count} blog titles for: "${prompt}". List only.`);
      } else throw err;
    }
    const titlesText = (await titlesResult.response).text();
    const titles = titlesText.split('\n').map(t => t.replace(/^[*-]\s*|^\d+\.\s*/, '').trim()).filter(t => t.length > 0).slice(0, count);

    const blogs = [];
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

    for (const title of titles) {
      if (blogs.length > 0) {
        await delay(3000); // Wait 3 seconds between requests to avoid rate limits
      }

      const prompt = `Write a short, engaging blog post about: "${title}". 
        CRITICAL INSTRUCTIONS: 
        1. ONLY output raw HTML. Do not wrap it in \`\`\`html or any markdown blocks.
        2. Do NOT output a <style> block, <head>, or <body> tags. Only <p>, <h2>, <h3>, <ul>, <li>, <strong>, <blockquote>.
        3. AESTHETICS: Make it attractive! Use emojis, bold important phrases with <strong>, use <blockquote> for highlights, and keep paragraphs short.`;

      const contentResult = await model.generateContent(prompt);
      const rawText = (await contentResult.response).text();
      const contentHtml = rawText.replace(/^```html\n?|```$/g, '').trim();

      const newBlog = new Blog({
        title, contentHtml,
        content: JSON.stringify({ root: { children: [{ type: 'paragraph', children: [{ text: "AI Generated Content." }], direction: null, format: '', indent: 0, version: 1 }], direction: null, format: '', indent: 0, type: 'root', version: 1 } }),
        author: 'AI Architect', status: 'draft', category: 'General',
        slug: title.toLowerCase().split(' ').join('-').replace(/[^a-z0-9-]/g, ''),
      });
      await newBlog.save();
      blogs.push(newBlog);
    }
    res.json({ message: `Successfully generated ${blogs.length} drafts`, blogs });
  } catch (err) {
    console.error("AI Batch Error:", err);
    if (err.message && err.message.includes('429')) {
    }
    res.status(500).json({ message: 'AI Batch generation failed', error: err.message });
  }
});

// --- Serve React Frontend in Production ---
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/dist')));

  // Custom middleware to act as the single catch-all for unknown GET requests
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      res.sendFile(path.resolve(__dirname, '../frontend', 'dist', 'index.html'));
    } else {
      next();
    }
  });
} else {
  app.get('/', (req, res) => {
    res.send('API is running. Set NODE_ENV to production to serve frontend.');
  });
}

// --- Global 404 for APIs ---
app.use('/api', (req, res) => {
  res.status(404).json({ message: 'API Route Not Found' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});