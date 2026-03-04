const Blog = require('../models/Blog');
const Client = require('../models/Client');

const getPublicBlogs = async (apiKey, slug) => {
    const client = await Client.findOne({ apiKey });
    if (!client) throw new Error('Invalid API Key');

    let query = { clientId: client._id, status: 'published' };
    if (slug) {
        query.slug = slug;
    }

    return await Blog.find(query).sort({ createdAt: -1 });
};

const getPublicStats = async () => {
    const totalBlogs = await Blog.countDocuments();
    const totalClients = await Client.countDocuments();
    return {
        totalBlogs,
        totalClients,
        uptime: "99.98%",
        lastDeployment: new Date().toISOString(),
        pioneerCount: totalClients,
        availableSlots: Math.max(0, 10 - totalClients)
    };
};

const getEmbedScript = async (apiKey, protocol, host) => {
    const client = await Client.findOne({ apiKey });
    if (!client) {
        return `
          (function() {
              console.error("LexiBlog Error: Unauthorized or Missing API Key.");
              const container = document.getElementById('blog-embed-container');
              if (container) {
                  container.innerHTML = '<div style="font-family: sans-serif; padding: 20px; border: 1px solid #ef4444; background: #fef2f2; color: #991b1b; border-radius: 8px;"><strong>LexiBlog Unauthorized:</strong> Invalid API Key provided in embed script.</div>';
              }
          })();
      `;
    }

    const serverUrl = protocol + '://' + host;
    return `
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

      shadow.innerHTML = \`
        <style>
          :host {
            display: block;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: \${colors.text};
            background: transparent;
            box-sizing: border-box;
          }
          * { box-sizing: border-box; }
          .embed-loading { padding: 40px; text-align: center; color: \${colors.muted}; }
          
          /* View Toggle Styles */
          .blog-list-view { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 24px; padding: 10px; }
          @media (max-width: 600px) { .blog-list-view { grid-template-columns: 1fr; } }
          .blog-detail-view { display: none; animation: fadeIn 0.4s ease-out; background: \${colors.bg}; border-radius: 16px; border: 1px solid \${colors.border}; overflow: hidden; }
          @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

          /* Blog Card Styles */
          .blog-card {
            background: \${colors.cardBg}; border: 1px solid \${colors.border}; border-radius: 12px;
            overflow: hidden; cursor: pointer; transition: all 0.2s ease;
            display: flex; flex-direction: column;
          }
          .blog-card:hover { transform: translateY(-4px); box-shadow: 0 12px 24px rgba(0,0,0,0.08); border-color: \${colors.primary}; }
          .blog-card img { width: 100%; height: 200px; object-fit: cover; border-bottom: 1px solid \${colors.border}; }
          .blog-card-content { padding: 24px; flex: 1; display: flex; flex-direction: column; justify-content: space-between; gap: 12px;}
          .blog-title { margin: 0; font-size: 1.35rem; color: \${colors.text}; font-weight: 700; line-height: 1.35; letter-spacing: -0.01em;}
          .blog-date { margin: 0; color: \${colors.muted}; font-size: 0.9rem; font-weight: 500;}

          /* In-Page Detail Styles */
          .back-button {
            display: inline-flex; align-items: center; gap: 8px; margin: 30px 40px 10px; padding: 8px 16px;
            cursor: pointer; color: \${colors.muted}; font-weight: 600; font-size: 0.95rem; background: \${colors.cardBg};
            border: 1px solid \${colors.border}; border-radius: 8px; transition: all 0.2s;
          }
          .back-button:hover { color: \${colors.text}; border-color: \${colors.text}; background: transparent; }
          .detail-cover { width: 100%; max-height: 450px; object-fit: cover; border-bottom: 1px solid \${colors.border}; }
          .detail-header { padding: 40px 40px 20px; }
          .article-title { margin: 0 0 16px 0; font-size: 3rem; font-weight: 800; line-height: 1.15; letter-spacing: -0.02em; }
          .article-date { color: \${colors.muted}; margin: 0; font-weight: 500; font-size: 1rem;}

          /* Professional Blog Content Styles */
          .blog-body { padding: 0 40px 60px; font-size: 1.15rem; line-height: 1.8; color: \${colors.text}; max-width: 800px; margin: 0; }
          @media (max-width: 768px) {
            .back-button { margin: 20px 24px 10px; }
            .detail-header { padding: 30px 24px 20px; }
            .blog-body { padding: 0 24px 40px; font-size: 1.05rem; }
            .article-title { font-size: 2.2rem; }
            .blog-list-view { padding: 0; }
          }
          .blog-body h1, .blog-body h2, .blog-body h3, .blog-body h4 { font-weight: 700; margin-top: 2em; margin-bottom: 0.8em; line-height: 1.3; color: \${colors.text}; letter-spacing: -0.01em;}
          .blog-body h1 { font-size: 2.2em; font-weight: 800; letter-spacing: -0.02em; }
          .blog-body h2 { font-size: 1.8em; }
          .blog-body h3 { font-size: 1.4em; }
          .blog-body p { margin-bottom: 1.5em; }
          .blog-body a { color: \${colors.primary}; text-decoration: underline; text-underline-offset: 4px; text-decoration-thickness: 2px; }
          .blog-body blockquote { border-left: 4px solid \${colors.primary}; font-style: italic; color: \${colors.muted}; margin: 2em 0; background: \${colors.cardBg}; padding: 20px 28px; border-radius: 0 12px 12px 0; font-size: 1.1em; }
          .blog-body ul { list-style-type: disc; padding-left: 1.5em; margin-bottom: 1.5em; }
          .blog-body ol { list-style-type: decimal; padding-left: 1.5em; margin-bottom: 1.5em; }
          .blog-body li { margin-bottom: 0.5em; padding-left: 0.5em; }
          .blog-body code { background: \${colors.cardBg}; padding: 3px 6px; border-radius: 6px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 0.85em; border: 1px solid \${colors.border}; }
          .blog-body pre { background: #1e1e1e; color: #d4d4d4; padding: 24px; border-radius: 12px; overflow-x: auto; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 0.9em; margin: 2em 0; border: 1px solid #333; line-height: 1.6; }
          .blog-body pre code { background: transparent; padding: 0; border: none; color: inherit; }
          .blog-body strong { font-weight: 700; color: \${colors.text}; }
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
      \`;

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
            html += \`
              <div class="blog-card" onclick="
                this.getRootNode().getElementById('blog-list-view').style.display='none';
                this.getRootNode().getElementById('blog-detail-\${blog.id}').style.display='block';
                window.scrollTo({ top: this.getRootNode().host.offsetTop - 50, behavior: 'smooth' });
              ">
                \${blog.coverImage ? \`<img src="\${blog.coverImage}" alt="Cover"/>\` : \`<div style="height: 12px; background: \${colors.primary}"></div>\`}
                <div class="blog-card-content">
                  <h3 class="blog-title">\${blog.title}</h3>
                  <p class="blog-date">\${dateStr}</p>
                </div>
              </div>
            \`;
            
            // In-page Detail Item
            detailsHtml += \`
              <div id="blog-detail-\${blog.id}" class="blog-detail-view" \${specificBlogId ? 'style="display:block;"' : ''}>
                \${!specificBlogId ? \`
                <button class="back-button" onclick="
                  this.getRootNode().getElementById('blog-detail-\${blog.id}').style.display='none';
                  this.getRootNode().getElementById('blog-list-view').style.display='grid';
                  window.scrollTo({ top: this.getRootNode().host.offsetTop - 50, behavior: 'smooth' });
                ">&larr; Back to all posts</button>
                \` : ''}
                
                \${blog.coverImage ? \`<img src="\${blog.coverImage}" class="detail-cover" alt="Cover"/>\` : ''}
                <div class="detail-header">
                  <h1 class="article-title">\${blog.title}</h1>
                  <p class="article-date">\${dateStr}</p>
                </div>
                <div class="blog-body">
                  \${blog.contentHtml || renderSimpleFallback(blog.content)}
                </div>
              </div>
            \`;
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
                    if (child.format & 1) formatted = \`<strong>\${formatted}</strong>\`;
                    if (child.format & 2) formatted = \`<em>\${formatted}</em>\`;
                    if (child.format & 8) formatted = \`<u>\${formatted}</u>\`;
                    text += formatted;
                 } else if (child.type === 'link' || child.type === 'autolink') {
                    // very basic text extraction from link
                    child.children?.forEach(linkChild => {
                         if (linkChild.type === 'text') text += \`<a href="\${child.url}" target="_blank">\${linkChild.text}</a>\`;
                    })
                 }
              });
              const tag = node.type === 'heading' ? \`h\${node.tag || 2}\` : 'p';
              html += \`<\${tag}>\${text || '<br/>'}</\${tag}>\`;
            } else if (node.type === 'list') {
              const tag = node.listType === 'number' ? 'ol' : 'ul';
              html += \`<\${tag}>\`;
              node.children?.forEach(li => {
                let text = '';
                li.children?.forEach(child => {
                  if (child.type === 'text') text += child.text;
                });
                html += \`<li>\${text}</li>\`;
              });
              html += \`</\${tag}>\`;
            } else if (node.type === 'quote') {
                let text = '';
                node.children?.forEach(child => {
                  if (child.type === 'text') text += child.text;
                });
                html += \`<blockquote>\${text}</blockquote>\`;
            }
          });
          return html;
        } catch (e) {
          return \`<p>\${contentStr}</p>\`;
        }
      }

    })();
  `;
};

module.exports = {
    getPublicBlogs,
    getPublicStats,
    getEmbedScript
};
