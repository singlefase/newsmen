const Parser = require("rss-parser");

const parser = new Parser();

// Pune Marathi RSS
const query = encodeURIComponent("पुणे");
const RSS_URL = `https://news.google.com/rss/search?q=${query}&hl=mr&gl=IN&ceid=IN:mr`;

// Check if text is strongly Marathi
function isProperMarathi(text) {
  if (!text) return false;

  const totalChars = text.length;
  const marathiChars = (text.match(/[\u0900-\u097F]/g) || []).length;

  // Must start with Marathi character
  if (!/^[\u0900-\u097F]/.test(text.trim())) return false;

  // At least 60% Marathi
  return marathiChars / totalChars >= 0.6;
}

// Clean title
function cleanTitle(title) {
  return title
    .replace(/ - .*$/, "")
    .replace(/\|.*$/, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

async function fetchMarathiNews(limit = 10) {
  try {
    const feed = await parser.parseURL(RSS_URL);

    const articles = feed.items
      .map(item => ({
        title: cleanTitle(item.title),
        summary: item.contentSnippet || "",
        source: item.source?.title || "Google News",
        link: item.link,
        publishedAt: item.pubDate
      }))
      .filter(item => isProperMarathi(item.title))
      .slice(0, limit);

    return articles;
  } catch (error) {
    console.error("RSS fetch error:", error.message);
    return [];
  }
}

// Run
fetchMarathiNews(10).then(news => {
  console.log("✅ Proper Marathi Pune News (10):");
  console.log(JSON.stringify(news, null, 2));
}).catch(err => {
  console.error("Error:", err);
});
