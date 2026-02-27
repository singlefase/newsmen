/**
 * Deduplication Helper Functions
 * Uses individual documents per link (not unbounded arrays)
 */

const { connectToDatabase } = require("../config/database");

async function getRssFetchLogCollection() {
  const { mongodb } = await connectToDatabase();
  return mongodb.collection("rss_fetch_log");
}

/**
 * Check if link has been fetched from a specific source.
 * Each (source, link) pair is a separate document for O(1) lookups.
 */
async function isLinkFetched(sourceName, link) {
  try {
    const collection = await getRssFetchLogCollection();
    const exists = await collection.findOne(
      { source: sourceName, link: link },
      { projection: { _id: 1 } }
    );
    return !!exists;
  } catch (error) {
    console.error("Error checking fetched link:", error);
    return false;
  }
}

/**
 * Mark link as fetched for a specific source
 */
async function markLinkAsFetched(sourceName, link) {
  try {
    const collection = await getRssFetchLogCollection();
    await collection.updateOne(
      { source: sourceName, link: link },
      { $set: { source: sourceName, link: link, fetchedAt: new Date() } },
      { upsert: true }
    );
  } catch (error) {
    console.error("Error marking link as fetched:", error);
  }
}

/**
 * Check if a link already exists in unprocessed or processed collections.
 * Prevents the same story (same URL) from being stored again even from a different source.
 */
async function isGlobalDuplicate(link) {
  try {
    const { mongodb } = await connectToDatabase();
    const [inUnprocessed, inProcessed] = await Promise.all([
      mongodb
        .collection("unprocessed_news_data")
        .findOne({ link }, { projection: { _id: 1 } }),
      mongodb
        .collection("processed_news_data")
        .findOne({ link }, { projection: { _id: 1 } }),
    ]);
    return !!(inUnprocessed || inProcessed);
  } catch (error) {
    console.error("Error checking global duplicate:", error);
    return false;
  }
}

/**
 * Check if news exists in Google News collection (by link)
 */
async function googleNewsExists(link) {
  try {
    const { mongodb } = await connectToDatabase();
    const collection = mongodb.collection("google_rss_news_legal");
    const existing = await collection.findOne(
      { link: link },
      { projection: { _id: 1 } }
    );
    return !!existing;
  } catch (error) {
    console.error("Error checking Google News existence:", error);
    return false;
  }
}

module.exports = {
  isLinkFetched,
  markLinkAsFetched,
  isGlobalDuplicate,
  googleNewsExists,
};
