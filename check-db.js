const { MongoClient } = require('mongodb');

async function run() {
    const uri = 'mongodb://localhost:27017';
    const client = new MongoClient(uri);

    try {
        await client.connect();
        const database = client.db('mernblog');
        const blogs = database.collection('blogs');

        const allBlogs = await blogs.find({}).toArray();
        console.log("Blogs in DB:");
        allBlogs.forEach(b => {
            console.log(`- ${b.title} | Platform visibility: ${b.publishToPlatform}`);
        });

    } finally {
        await client.close();
    }
}

run().catch(console.dir);
