/**
 * Setup MongoDB Indexes for Performance
 * Run this script once to create indexes on collections
 */
// npm install
// node scripts/setup-indexes.js
// npm start

const { connectToDatabase } = require("../config/database");

async function setupIndexes() {
  try {
    const { mongodb } = await connectToDatabase();

    console.log("🔧 Setting up MongoDB indexes...\n");

    // Indexes for google_rss_news_legal
    const googleNewsCollection = mongodb.collection("google_rss_news_legal");
    await googleNewsCollection.createIndex({ link: 1 }, { unique: true });
    await googleNewsCollection.createIndex({ publishedAt: -1 });
    await googleNewsCollection.createIndex({ category: 1 });
    await googleNewsCollection.createIndex({ language: 1 });
    await googleNewsCollection.createIndex({ fetchedAt: -1 });
    console.log("✅ Indexes created for google_rss_news_legal");

    // Indexes for unprocessed_news_data
    const unprocessedCollection = mongodb.collection("unprocessed_news_data");
    await unprocessedCollection.createIndex({ processed: 1, fetchedAt: 1 });
    await unprocessedCollection.createIndex({ sourceName: 1 });
    await unprocessedCollection.createIndex({ link: 1 });
    await unprocessedCollection.createIndex({ publishedAt: -1 });
    console.log("✅ Indexes created for unprocessed_news_data");

    // Indexes for processed_news_data
    const processedCollection = mongodb.collection("processed_news_data");
    await processedCollection.createIndex({ publishedAt: -1 });
    await processedCollection.createIndex({ category: 1 });
    await processedCollection.createIndex({ language: 1 });
    await processedCollection.createIndex({ sourceName: 1 });
    await processedCollection.createIndex({
      title: "text",
      rewrittenDescription: "text",
      originalDescription: "text",
    });
    console.log("✅ Indexes created for processed_news_data");

    // Indexes for rss_fetch_log
    const fetchLogCollection = mongodb.collection("rss_fetch_log");
    await fetchLogCollection.createIndex({ source: 1 }, { unique: true });
    console.log("✅ Indexes created for rss_fetch_log");

    console.log("\n🎉 All indexes created successfully!");
  } catch (error) {
    console.error("❌ Error setting up indexes:", error);
    process.exit(1);
  }
}

setupIndexes()
  .then(() => {
    console.log("\n✅ Setup complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Setup failed:", error);
    process.exit(1);
  });
