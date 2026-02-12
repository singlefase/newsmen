/**
 * Deduplication Helper Functions
 * Track fetched news to avoid duplicates
 */

const { connectToDatabase } = require("../config/database");

/**
 * Get RSS fetch log collection
 */
async function getRssFetchLogCollection() {
  const { mongodb } = await connectToDatabase();
  return mongodb.collection("rss_fetch_log");
}

/**
 * Check if link has been fetched from a specific source
 * @param {string} sourceName - Source name (e.g., "TV9 Marathi")
 * @param {string} link - News article link
 * @returns {Promise<boolean>} - true if already fetched
 */
async function isLinkFetched(sourceName, link) {
  try {
    const collection = await getRssFetchLogCollection();
    const log = await collection.findOne({ source: sourceName });
    
    if (!log || !log.fetchedLinks) {
      return false;
    }
    
    return log.fetchedLinks.includes(link);
  } catch (error) {
    console.error("Error checking fetched link:", error);
    return false;
  }
}

/**
 * Mark link as fetched for a specific source
 * @param {string} sourceName - Source name
 * @param {string} link - News article link
 */
async function markLinkAsFetched(sourceName, link) {
  try {
    const collection = await getRssFetchLogCollection();
    
    await collection.updateOne(
      { source: sourceName },
      {
        $set: {
          source: sourceName,
          lastFetchedAt: new Date(),
        },
        $addToSet: { fetchedLinks: link }, // Add to array if not exists
        $inc: { totalFetched: 1 },
      },
      { upsert: true }
    );
  } catch (error) {
    console.error("Error marking link as fetched:", error);
  }
}

/**
 * Check if news exists in Google News collection (by link)
 * @param {string} link - News article link
 * @returns {Promise<boolean>} - true if exists
 */
async function googleNewsExists(link) {
  try {
    const { mongodb } = await connectToDatabase();
    const collection = mongodb.collection("google_rss_news_legal");
    
    const existing = await collection.findOne({ link: link });
    return !!existing;
  } catch (error) {
    console.error("Error checking Google News existence:", error);
    return false;
  }
}

/**
 * Get all fetched links for a source (for debugging)
 * @param {string} sourceName - Source name
 * @returns {Promise<string[]>} - Array of fetched links
 */
async function getFetchedLinks(sourceName) {
  try {
    const collection = await getRssFetchLogCollection();
    const log = await collection.findOne({ source: sourceName });
    return log?.fetchedLinks || [];
  } catch (error) {
    console.error("Error getting fetched links:", error);
    return [];
  }
}

module.exports = {
  isLinkFetched,
  markLinkAsFetched,
  googleNewsExists,
  getFetchedLinks,
};
