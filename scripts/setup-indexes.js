/**
 * Setup MongoDB Indexes for Performance
 * Run: node scripts/setup-indexes.js
 */

const { connectToDatabase } = require("../config/database");

async function setupIndexes() {
  try {
    const { mongodb } = await connectToDatabase();

    console.log("Setting up MongoDB indexes...\n");

    // google_rss_news_legal
    const googleNewsCollection = mongodb.collection("google_rss_news_legal");
    await googleNewsCollection.createIndex({ link: 1 }, { unique: true });
    await googleNewsCollection.createIndex({ publishedAt: -1 });
    await googleNewsCollection.createIndex({ category: 1 });
    await googleNewsCollection.createIndex({ language: 1 });
    await googleNewsCollection.createIndex({ fetchedAt: -1 });
    console.log("  google_rss_news_legal - done");

    // unprocessed_news_data
    const unprocessedCollection = mongodb.collection("unprocessed_news_data");
    await unprocessedCollection.createIndex({ processed: 1, fetchedAt: 1 });
    await unprocessedCollection.createIndex({ processed: 1, categories: 1, fetchedAt: 1 });
    await unprocessedCollection.createIndex({ categories: 1 });
    await unprocessedCollection.createIndex({ sourceName: 1 });
    await unprocessedCollection.createIndex({ link: 1 }, { unique: true });
    await unprocessedCollection.createIndex({ publishedAt: -1 });
    console.log("  unprocessed_news_data - done");

    // processed_news_data
    const processedCollection = mongodb.collection("processed_news_data");
    await processedCollection.createIndex({ publishedAt: -1 });
    await processedCollection.createIndex({ categories: 1 });
    await processedCollection.createIndex({ categories: 1, publishedAt: -1 });
    await processedCollection.createIndex({ language: 1 });
    await processedCollection.createIndex({ sourceName: 1 });
    await processedCollection.createIndex({ link: 1 }, { unique: true });
    await processedCollection.createIndex(
      { title: "text", rewrittenDescription: "text", originalDescription: "text" },
      { default_language: "none", language_override: "textSearchLang" }
    );
    console.log("  processed_news_data - done");

    // rss_fetch_log (individual docs per source+link)
    const fetchLogCollection = mongodb.collection("rss_fetch_log");
    await fetchLogCollection.createIndex(
      { source: 1, link: 1 },
      { unique: true }
    );
    await fetchLogCollection.createIndex({ fetchedAt: -1 });
    console.log("  rss_fetch_log - done");

    console.log("\nAll indexes created successfully!");
  } catch (error) {
    console.error("Error setting up indexes:", error);
    process.exit(1);
  }
}

setupIndexes()
  .then(() => {
    console.log("\nSetup complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Setup failed:", error);
    process.exit(1);
  });
