const User = require('../models/User');
const Blog = require('../models/Blog');
const genAI = require('../config/ai');

const deductAiCredits = async (userId, cost = 10) => {
    if (userId === '000000000000000000000000') return; // Super admin bypass
    const user = await User.findById(userId);
    if (!user || user.role === 'admin') return; // Admin bypass

    if (user.plan === 'free') {
        throw new Error('Free users cannot use AI generation. Please upgrade to premium.');
    }
    if (user.credits < cost) {
        throw new Error(`Insufficient credits for AI. Requires ${cost} credits.`);
    }

    user.credits -= cost;
    await user.save();
};

const getModel = (modelName = "gemini-2.0-flash") => {
    return genAI.getGenerativeModel({ model: modelName });
};

const suggestTitles = async (prompt, userId) => {
    await deductAiCredits(userId, 10);

    let model = getModel();
    let result;
    try {
        result = await model.generateContent(`Suggest 20 SEO blog titles for: "${prompt}". Simple list.`);
    } catch (err) {
        if (err.message.includes('404') || err.message.includes('429')) {
            console.warn(`Gemini model failed with ${err.message}, retrying with fallback...`);
            model = getModel("gemini-1.5-flash");
            result = await model.generateContent(`Suggest 20 SEO blog titles for: "${prompt}". Simple list.`);
        } else throw err;
    }
    const response = await result.response;
    const text = response.text();
    return text.split('\n').map(t => t.replace(/^[*-]\s*|^\d+\.\s*/, '').trim()).filter(t => t.length > 0).slice(0, 20);
};

const generateBlogContent = async (title, userId) => {
    await deductAiCredits(userId, 10);

    let model = getModel();
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
            model = getModel("gemini-1.5-flash");
            result = await model.generateContent(prompt);
        } else throw err;
    }
    const response = await result.response;
    return response.text().replace(/^```html\n?|```$/g, '').trim();
};

const batchGenerate = async (prompt, count = 5, userId) => {
    const totalCost = count * 10;
    await deductAiCredits(userId, totalCost);

    let model = getModel();
    let titlesResult;
    try {
        titlesResult = await model.generateContent(`Give me ${count} blog titles for: "${prompt}". List only.`);
    } catch (err) {
        if (err.message.includes('404') || err.message.includes('429')) {
            model = getModel("gemini-1.5-flash");
            titlesResult = await model.generateContent(`Give me ${count} blog titles for: "${prompt}". List only.`);
        } else throw err;
    }
    const titlesText = (await titlesResult.response).text();
    const titles = titlesText.split('\n').map(t => t.replace(/^[*-]\s*|^\d+\.\s*/, '').trim()).filter(t => t.length > 0).slice(0, count);

    const blogs = [];
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

    for (const title of titles) {
        if (blogs.length > 0) {
            await delay(3000); // Rate limit buffer
        }

        const contentPrompt = `Write a short, engaging blog post about: "${title}". 
        CRITICAL INSTRUCTIONS: 
        1. ONLY output raw HTML. Do not wrap it in \`\`\`html or any markdown blocks.
        2. Do NOT output a <style> block, <head>, or <body> tags. Only <p>, <h2>, <h3>, <ul>, <li>, <strong>, <blockquote>.
        3. AESTHETICS: Make it attractive! Use emojis, bold important phrases with <strong>, use <blockquote> for highlights, and keep paragraphs short.`;

        const contentResult = await model.generateContent(contentPrompt);
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
    return blogs;
};

module.exports = {
    suggestTitles,
    generateBlogContent,
    batchGenerate
};
