const app = require('../server');
const axios = require('axios');

const PORT = process.env.PORT || 8000;
const BASE_URL = `http://localhost:${PORT}`;

async function verifyEndpoints() {
    console.log('Waiting for server to start...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    try {
        // 1. Verify /news/apidata
        console.log('\nTesting /news/apidata...');
        try {
            const resApi = await axios.get(`${BASE_URL}/news/apidata`);
            if (resApi.status === 200 && resApi.headers['content-type'].includes('application/json')) {
                console.log('✅ /news/apidata passed');
            } else {
                console.error('❌ /news/apidata failed:', resApi.status, resApi.headers['content-type']);
            }
        } catch (e) {
            console.error('❌ /news/apidata failed:', e.message);
        }

        // 2. Verify /real/news/rss
        console.log('\nTesting /real/news/rss...');
        try {
            const resReal = await axios.get(`${BASE_URL}/real/news/rss?query=pune`);
            if (resReal.status === 200 && resReal.headers['content-type'].includes('xml')) {
                if (resReal.data.includes('<rss') && resReal.data.includes('<channel>')) {
                    console.log('✅ /real/news/rss passed (Valid XML structure)');
                } else {
                    console.error('❌ /real/news/rss failed validation');
                }
            } else {
                console.error('❌ /real/news/rss failed:', resReal.status, resReal.headers['content-type']);
            }
        } catch (e) {
            console.error('❌ /real/news/rss failed:', e.message);
        }

        // 3. Verify /rewrite/news/rss
        console.log('\nTesting /rewrite/news/rss...');
        try {
            const resRewrite = await axios.get(`${BASE_URL}/rewrite/news/rss`);
            if (resRewrite.status === 200 && resRewrite.headers['content-type'].includes('xml')) {
                if (resRewrite.data.includes('<rss') && resRewrite.data.includes('<channel>')) {
                    console.log('✅ /rewrite/news/rss passed (Valid XML structure)');
                } else {
                    console.error('❌ /rewrite/news/rss failed validation');
                }
            } else {
                console.error('❌ /rewrite/news/rss failed:', resRewrite.status, resRewrite.headers['content-type']);
            }
        } catch (e) {
            console.error('❌ /rewrite/news/rss failed:', e.message);
        }

    } catch (err) {
        console.error('Global error:', err);
    } finally {
        console.log('\nVerification complete. Exiting...');
        process.exit(0);
    }
}

verifyEndpoints();
