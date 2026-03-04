/**
 * Clear all news-related data from MongoDB.
 *
 * Run:
 *   node scripts/clear-news-data.js
 *
 * This will delete:
 *   - all documents from google_rss_news_legal
 *   - all documents from unprocessed_news_data
 *   - all documents from processed_news_data
 *   - all documents from rss_fetch_log
 *
 * Indexes are NOT removed.
 */

const { connectToDatabase } = require("../config/database");

async function clearNewsData() {
  try {
    const { mongodb } = await connectToDatabase();

    const collections = [
      "google_rss_news_legal",
      "unprocessed_news_data",
      "processed_news_data",
      "rss_fetch_log",
    ];

    console.log("Clearing news-related collections...\n");

    for (const name of collections) {
      const col = mongodb.collection(name);
      const countBefore = await col.countDocuments();
      console.log(`Collection "${name}": found ${countBefore} documents.`);

      if (countBefore === 0) {
        continue;
      }

      const result = await col.deleteMany({});
      console.log(
        `  -> Deleted ${result.deletedCount} document(s) from "${name}".`
      );
    }

    console.log("\n✅ All specified collections have been cleared.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error while clearing news data:", error);
    process.exit(1);
  }
}

clearNewsData();

