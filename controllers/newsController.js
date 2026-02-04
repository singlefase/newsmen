const { ObjectId } = require("mongodb");
const Parser = require("rss-parser");
const { GoogleGenAI } = require("@google/genai");
const { getNewsCollection } = require("../models/newsModel");
const { getStockImage } = require("../services/stockImageService");

const parser = new Parser();

// ---------------- CONFIGURATION ----------------
const DEFAULT_QUERY = encodeURIComponent(
  "पुणे राजकारण सरकार पालिका विकास प्रशासन"
);

const ALLOWED_KEYWORDS = [
  "सरकार",
  "राज्य",
  "महापालिका",
  "पालिका",
  "प्रशासन",
  "मंत्री",
  "आमदार",
  "खासदार",
  "निवडणूक",
  "विकास",
  "योजना",
  "सभा",
  "निर्णय"
];

const BLOCKED_KEYWORDS = [
  "खून",
  "हत्या",
  "आत्महत्या",
  "अपघात",
  "बलात्कार",
  "गोळीबार",
  "चाकू",
  "गुन्हा"
];

// ---------------- HELPER FUNCTIONS ----------------
function isProperMarathi(text = "") {
  if (!text) return false;
  const mr = (text.match(/[\u0900-\u097F]/g) || []).length;
  return /^[\u0900-\u097F]/.test(text.trim()) && mr / text.length >= 0.6;
}

function containsAllowedTopic(text = "") {
  return ALLOWED_KEYWORDS.some(k => text.includes(k));
}

function containsBlockedTopic(text = "") {
  // Only block if text contains multiple violent keywords or very explicit content
  // This is less aggressive - allows news that mentions these topics in context
  const foundKeywords = BLOCKED_KEYWORDS.filter(k => text.includes(k));
  // Only block if 2+ violent keywords found (more likely to be violent content)
  return foundKeywords.length >= 2;
}

function cleanTitle(title = "") {
  return title.replace(/ - .*$/, "").replace(/\|.*$/, "").trim();
}

// Generate sample news for POC when RSS is unavailable
function generateSampleNews(count = 10) {
  const sampleTitles = [
    "Technology Sector Sees Major Growth in Q4 2024",
    "New Government Policies Aim to Boost Economic Development",
    "Sports: National Team Wins International Championship",
    "Healthcare Innovation: New Treatment Methods Show Promise",
    "Education Reforms: New Curriculum Launched Nationwide",
    "Business: Major Corporations Announce Expansion Plans",
    "Environment: New Green Energy Initiatives Take Effect",
    "Science: Breakthrough Research Published in Leading Journal",
    "Culture: Annual Festival Attracts Record Attendance",
    "International Relations: Diplomatic Talks Show Progress"
  ];

  const sampleSources = [
    "Tech News Daily",
    "National Times",
    "Sports Central",
    "Health Today",
    "Education Weekly",
    "Business Report",
    "Environment Watch",
    "Science Journal",
    "Culture Magazine",
    "World News"
  ];

  const sampleSummaries = [
    "The technology sector has experienced unprecedented growth this quarter, with major companies reporting record profits and expanding their operations globally.",
    "Government officials announced new policies designed to stimulate economic growth and create more job opportunities across various sectors.",
    "The national team achieved a historic victory in the international championship, bringing home the trophy after years of preparation.",
    "Medical researchers have developed new treatment methods that show significant promise in improving patient outcomes and reducing recovery times.",
    "Education authorities have launched a comprehensive new curriculum aimed at better preparing students for the modern workforce.",
    "Several major corporations have announced ambitious expansion plans, signaling confidence in the economic outlook.",
    "New green energy initiatives have been implemented, focusing on renewable sources and reducing carbon emissions.",
    "Scientists have published groundbreaking research that could lead to significant advances in their field of study.",
    "The annual cultural festival has attracted record-breaking attendance, celebrating local traditions and heritage.",
    "Diplomatic discussions between nations have shown positive progress, with agreements reached on key issues."
  ];

  const news = [];
  for (let i = 0; i < Math.min(count, sampleTitles.length); i++) {
    news.push({
      title: sampleTitles[i],
      contentSnippet: sampleSummaries[i],
      source: { title: sampleSources[i] },
      link: `https://example.com/news/${i + 1}`,
      pubDate: new Date(Date.now() - i * 3600000).toISOString() // Stagger dates
    });
  }
  
  return news;
}

// ---------------- GEMINI AI REWRITING ----------------
async function rewriteMarathi({ title, summary, source }) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `
तुम्ही मराठी न्यूज एडिटर आहात.

खालील बातमी 80–100 शब्दांत
सरळ, तथ्यात्मक पद्धतीने पुन्हा लिहा.

नियम:
- मूळ मजकूर कॉपी करू नका
- 4–5 वाक्ये
- मत किंवा निष्कर्ष देऊ नका
- सरकारी / प्रशासकीय माहिती ठेवा

शीर्षक: ${title}
स्रोत: ${source}
सारांश: ${summary}

फक्त बातमी द्या.
`;

    const res = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt
    });

    return res.text.trim();
  } catch (error) {
    console.error("Gemini rewriting error:", error.message);
    return summary || title; // Fallback to original if AI fails
  }
}

// Inshorts-style rewriting (60-80 words, concise, factual)
async function rewriteMarathiInshortsStyle({ title, summary, source }) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `
तुम्ही Inshorts-style मराठी न्यूज रायटर आहात.

खालील बातमी 60-80 शब्दांत, लहान, सोपी आणि तथ्यात्मक पद्धतीने पुन्हा लिहा.

नियम:
- मूळ मजकूर कॉपी करू नका - पूर्णपणे मूळ लिहा
- 3-4 छोटी वाक्ये
- मत मांडू नका
- साधी, स्पष्ट मराठी
- फक्त मुख्य तथ्ये
- शेवटी निष्कर्ष देऊ नका

शीर्षक: ${title}
स्रोत: ${source}
सारांश: ${summary}

फक्त पुन्हा लिहिलेली बातमी द्या (60-80 शब्द).
`;

    const res = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt
    });

    return res.text.trim();
  } catch (error) {
    console.error("Gemini Inshorts rewriting error:", error.message);
    // Fallback: Create a shorter version manually
    const shortSummary = summary ? summary.substring(0, 200) + "..." : title;
    return shortSummary;
  }
}

// ---------------- CONTROLLER FUNCTIONS ----------------

// Fetch and process news from RSS feed (WITH DATABASE STORAGE)
exports.fetchAndProcessNews = async (req, res) => {
  console.log("\n🚀 [fetchAndProcessNews] Request received - Database storage enabled");
  console.log("   Body:", JSON.stringify(req.body, null, 2));
  try {
    const { 
      query = "पुणे", // Default to Pune news (Marathi)
      limit = 10,
      language = "mr", // Default to Marathi
      country = "IN",
      strictFilter = false, // Set to true for strict Marathi filtering
      category = "general", // general, politics, technology, sports, etc.
      storeInDB = true // Store in database by default
    } = req.body;

    // Build RSS URL - try different approaches
    let RSS_URL;
    if (query && query.trim() !== "") {
      RSS_URL = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=${language}&gl=${country}&ceid=${country}:${language}`;
    } else {
      // Use topic-based RSS if no query
      const topicMap = {
        "general": "https://news.google.com/rss?hl=en&gl=IN&ceid=IN:en",
        "politics": "https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRFZxYUdjU0FtVnVHZ0pWVXlnQVAB?hl=en&gl=IN&ceid=IN:en",
        "technology": "https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGRqTVhZU0FtVnVHZ0pWVXlnQVAB?hl=en&gl=IN&ceid=IN:en",
        "sports": "https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRFp1YVdjU0FtVnVHZ0pWVXlnQVAB?hl=en&gl=IN&ceid=IN:en",
        "business": "https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGx1YlY4U0FtVnVHZ0pWVXlnQVAB?hl=en&gl=IN&ceid=IN:en"
      };
      RSS_URL = topicMap[category] || topicMap["general"];
    }

    console.log(`\n📰 Fetching news from RSS: ${RSS_URL}\n`);
    console.log(`   Query: ${query}, Limit: ${limit}, Strict Filter: ${strictFilter}\n`);

    let feed;
    let useFallback = false;
    
    try {
      console.log(`   Attempting to fetch RSS feed...`);
      feed = await parser.parseURL(RSS_URL);
      console.log(`   ✅ RSS feed fetched successfully`);
    } catch (rssError) {
      console.error("❌ RSS Feed Error:", rssError.message);
      console.error("   Error details:", rssError.message);
      
      // Try alternative RSS feed - general news
      try {
        RSS_URL = `https://news.google.com/rss?hl=${language}&gl=${country}&ceid=${country}:${language}`;
        console.log(`   🔄 Trying alternative RSS: ${RSS_URL}`);
        feed = await parser.parseURL(RSS_URL);
        console.log(`   ✅ Alternative RSS feed fetched successfully`);
      } catch (altError) {
        console.error("❌ Alternative RSS also failed:", altError.message);
        console.log("   📝 Using fallback sample news for POC demonstration");
        useFallback = true;
      }
    }
    
    // Fallback: Use sample news if RSS fails (for POC)
    if (useFallback || !feed || !feed.items || feed.items.length === 0) {
      console.log("   📰 Generating sample news for POC...");
      const sampleNews = generateSampleNews(limit);
      feed = { items: sampleNews, title: "Sample News Feed" };
      console.log(`   ✅ Generated ${sampleNews.length} sample news items\n`);
    }

    if (!feed || !feed.items || feed.items.length === 0) {
      console.error("❌ No items in RSS feed");
      return res.status(404).json({
        success: false,
        message: "No news items found in RSS feed. The feed might be empty or inaccessible.",
        news: [],
        debug: { RSS_URL, feedItems: feed?.items?.length || 0 }
      });
    }

    console.log(`✅ RSS feed loaded: ${feed.items.length} items found\n`);

    const collected = [];

    // Filter and collect news
    for (const item of feed.items) {
      if (collected.length >= limit) break;

      const title = cleanTitle(item.title || "");
      const summary = item.contentSnippet || item.content || "";
      const text = `${title} ${summary}`;

      // Apply filters only if strictFilter is true
      if (strictFilter) {
        // Strict filtering: Marathi + allowed topics - blocked topics
        if (
          isProperMarathi(title) &&
          containsAllowedTopic(text) &&
          !containsBlockedTopic(text)
        ) {
          collected.push({
            title,
            summary,
            source: item.source?.title || feed.title || "Google News",
            link: item.link || "",
            publishedAt: item.pubDate ? new Date(item.pubDate) : new Date()
          });
        }
      } else {
        // No strict filtering - accept ALL news (no blocking for POC)
        // Only log if it would have been blocked, but still include it
        const wouldBeBlocked = containsBlockedTopic(text);
        if (wouldBeBlocked) {
          console.log(`  ⚠️  Note: Contains potentially violent keywords but including anyway: ${title.substring(0, 50)}...`);
        }
        
        // Extract image from RSS item (if available) - Multiple methods
        // LEGAL: We use inline image URLs from RSS feeds (hotlinking) - legal when displayed with attribution
        let imageUrl = null;
        
        // Method 1: Extract from HTML content (inline image URLs)
        if (item.content) {
          const imgMatch = item.content.match(/<img[^>]+src=["']([^"']+)["']/i);
          if (imgMatch && imgMatch[1]) {
            imageUrl = imgMatch[1];
            // Clean up Google News redirect URLs
            if (imageUrl.includes('googleusercontent.com') || imageUrl.includes('news.google.com')) {
              // These are usually valid image URLs from Google News
            }
          }
        }
        
        // Method 2: Check enclosure (RSS image tags)
        if (!imageUrl && item.enclosure && item.enclosure.type && item.enclosure.type.startsWith('image/')) {
          imageUrl = item.enclosure.url;
        }
        
        // Method 3: Check media:thumbnail (RSS media extension)
        if (!imageUrl && item['media:thumbnail'] && item['media:thumbnail'].url) {
          imageUrl = item['media:thumbnail'].url;
        }
        
        // Method 4: Check media:content
        if (!imageUrl && item['media:content'] && item['media:content'].url) {
          imageUrl = item['media:content'].url;
        }
        
        // Extract reporter/author name if available
        // Google News RSS feeds typically don't include author info, but we check multiple fields
        let reporterName = null;
        
        // Try multiple RSS fields for author/reporter
        if (item.creator) {
          reporterName = item.creator;
        } else if (item.author) {
          reporterName = item.author;
        } else if (item['dc:creator']) {
          reporterName = item['dc:creator'];
        } else if (item['dc:author']) {
          reporterName = item['dc:author'];
        } else if (item['author']) {
          reporterName = item['author'];
        }
        
        // Try to extract from content if available (some feeds embed author in content)
        if (!reporterName && item.content) {
          const authorMatch = item.content.match(/<author[^>]*>([^<]+)<\/author>/i) || 
                             item.content.match(/by\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/i) ||
                             item.content.match(/Author:\s*([^<\n]+)/i);
          if (authorMatch && authorMatch[1]) {
            reporterName = authorMatch[1].trim();
          }
        }
        
        // Debug: Log all available item fields to see what's available (only for first item)
        if (collected.length === 0) {
          console.log(`  🔍 Debug - RSS item fields available: ${Object.keys(item).join(', ')}`);
          if (item.content) {
            console.log(`  🔍 Content preview: ${item.content.substring(0, 200)}...`);
          }
        }
        
        console.log(`  📸 Image: ${imageUrl ? 'Yes (inline URL)' : 'No'} | Reporter: ${reporterName || 'N/A (Google News RSS does not include author info)'}`);

        collected.push({
          title,
          summary,
          source: item.source?.title || feed.title || "Google News",
          link: item.link || "",
          publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
          imageUrl: imageUrl || null, // Inline image URL from RSS (not stored/rehosted)
          reporterName: reporterName || null, // Reporter/author name if available
          // Legal note: imageUrl is used for inline display only, not stored/rehosted
        });
      }
    }

    console.log(`📊 Collected ${collected.length} news items after filtering\n`);

    if (collected.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No relevant news found matching the criteria. Try with strictFilter=false or different query.",
        news: [],
        debug: {
          RSS_URL,
          totalItems: feed.items.length,
          strictFilter,
          suggestion: "Try setting strictFilter: false in request body"
        }
      });
    }

    // Process each news item with AI rewriting (WITH DATABASE STORAGE)
    const processedNews = [];
    const newsCollection = await getNewsCollection();
    let savedCount = 0;
    let skippedCount = 0;

    console.log(`\n🔄 Processing ${collected.length} news items (WITH DB STORAGE)...\n`);

    for (let i = 0; i < collected.length; i++) {
      const original = collected[i];
      
      console.log(`[${i + 1}/${collected.length}] Processing: ${original.title.substring(0, 60)}...`);

      // Check if article already exists (by link to avoid duplicates)
      if (original.link) {
        const existing = await newsCollection.findOne({ link: original.link });
        if (existing) {
          console.log(`  ⏭️  Article already exists in database, skipping...`);
          skippedCount++;
          processedNews.push(existing);
          continue;
        }
      }

      // Rewrite with AI in Inshorts-style (60-80 words, concise)
      let rewrittenContent;
      try {
        rewrittenContent = await rewriteMarathiInshortsStyle(original);
        console.log(`  ✅ AI rewritten in Inshorts-style (${rewrittenContent.length} chars)`);
      } catch (aiError) {
        console.log(`  ⚠️  AI rewriting failed, using shortened summary`);
        // Fallback: Create shorter version
        rewrittenContent = original.summary ? original.summary.substring(0, 200) + "..." : original.title;
      }

      // Get stock image if RSS feed doesn't have one (legal fallback)
      // LEGAL: Use stock images when RSS has no image (avoids copyright issues)
      let finalImageUrl = original.imageUrl;
      let imageAttribution = null;
      
      if (!finalImageUrl) {
        console.log(`  📸 No image in RSS, trying stock image fallback...`);
        try {
          const stockImage = await getStockImage(original.title, category);
          if (stockImage) {
            finalImageUrl = stockImage.url;
            imageAttribution = stockImage.attribution;
            console.log(`  ✅ Using stock image: ${stockImage.source}`);
          }
        } catch (stockError) {
          console.log(`  ⚠️  Stock image fetch failed: ${stockError.message}`);
        }
      }

      // Create news article object (TO BE SAVED TO DB)
      // LEGAL MODEL: Following Inshorts approach - summarize, attribute, link back
      const newsArticle = {
        title: original.title,
        originalSummary: original.summary,
        rewrittenContent: rewrittenContent, // AI-rewritten content (original, not copied)
        source: original.source,
        link: original.link, // Original article link (REQUIRED for legal compliance)
        imageUrl: finalImageUrl || null, // Inline image URL from RSS or stock image
        imageAttribution: imageAttribution || null, // Attribution for stock images
        reporterName: original.reporterName || null, // Reporter/author name if available
        publishedAt: original.publishedAt,
        fetchedAt: new Date(),
        category: category || "general",
        language: language || "mr",
        status: "published", // Default status
        views: 0, // Initialize view count
        // Legal compliance fields (following Inshorts model)
        isRewritten: true, // Content is rewritten, not copied
        originalSource: original.source, // Source attribution
        hasOriginalLink: !!original.link, // Must have original link
        disclaimer: "This is a summary of publicly available news. Content rewritten for clarity. Click source link for full article."
      };

      // Save to database if storeInDB is true
      if (storeInDB) {
        try {
          const result = await newsCollection.insertOne(newsArticle);
          newsArticle._id = result.insertedId;
          savedCount++;
          console.log(`  💾 Saved to database (ID: ${result.insertedId})`);
        } catch (dbError) {
          console.error(`  ❌ Database save error: ${dbError.message}`);
          // Continue processing even if save fails
        }
      }

      processedNews.push(newsArticle);

      // Small delay to avoid rate limiting
      if (i < collected.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 800));
      }
    }

    console.log(`\n✅ Processing complete: ${processedNews.length} articles processed`);
    console.log(`   💾 Saved to database: ${savedCount}`);
    console.log(`   ⏭️  Skipped (duplicates): ${skippedCount}\n`);

    return res.status(200).json({
      success: true,
      message: `Successfully fetched and processed ${processedNews.length} news articles.`,
      count: processedNews.length,
      saved: savedCount,
      skipped: skippedCount,
      news: processedNews,
      note: storeInDB ? "News fetched from RSS, rewritten with AI, and stored in database." : "News fetched and processed but not stored in database."
    });

  } catch (error) {
    console.error("❌ Error fetching and processing news:", error);
    console.error("   Stack:", error.stack);
    return res.status(500).json({
      success: false,
      message: "Error fetching and processing news",
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Get all news articles (paginated)
exports.getAllNews = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10,
      category,
      language
    } = req.query;

    const newsCollection = await getNewsCollection();
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Don't filter by status or language - show all news
    const query = {};
    if (category) query.category = category;
    // Removed language filter to show all news

    console.log(`[getAllNews] Query:`, query);
    console.log(`[getAllNews] Page: ${page}, Limit: ${limit}`);

    // Check total count in collection (for debugging)
    const totalInCollection = await newsCollection.countDocuments({});
    console.log(`[getAllNews] Total documents in collection: ${totalInCollection}`);

    const news = await newsCollection
      .find(query)
      .sort({ publishedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .toArray();

    const total = await newsCollection.countDocuments(query);

    console.log(`[getAllNews] Found ${news.length} news articles (total matching query: ${total})`);
    
    // Debug: Show sample of what's in database
    if (totalInCollection > 0 && news.length === 0) {
      const sample = await newsCollection.find({}).limit(1).toArray();
      console.log(`[getAllNews] Sample document from DB:`, JSON.stringify(sample[0], null, 2));
    }

    return res.status(200).json({
      success: true,
      news,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error("Error fetching news:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching news",
      error: error.message
    });
  }
};

// Get single news article by ID
exports.getNewsById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid news ID"
      });
    }

    const newsCollection = await getNewsCollection();
    const news = await newsCollection.findOne({ _id: new ObjectId(id) });

    if (!news) {
      return res.status(404).json({
        success: false,
        message: "News article not found"
      });
    }

    // Increment view count
    await newsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $inc: { views: 1 } }
    );

    return res.status(200).json({
      success: true,
      news
    });

  } catch (error) {
    console.error("Error fetching news by ID:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching news",
      error: error.message
    });
  }
};

// Get latest news (for homepage)
exports.getLatestNews = async (req, res) => {
  try {
    const { limit = 5 } = req.query;

    const newsCollection = await getNewsCollection();
    const news = await newsCollection
      .find({ status: "published" })
      .sort({ publishedAt: -1 })
      .limit(parseInt(limit))
      .toArray();

    return res.status(200).json({
      success: true,
      count: news.length,
      news
    });

  } catch (error) {
    console.error("Error fetching latest news:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching latest news",
      error: error.message
    });
  }
};

// Search news
exports.searchNews = async (req, res) => {
  try {
    const { q, page = 1, limit = 10 } = req.query;

    if (!q || q.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Search query is required"
      });
    }

    const newsCollection = await getNewsCollection();
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = {
      status: "published",
      $or: [
        { title: { $regex: q, $options: "i" } },
        { rewrittenContent: { $regex: q, $options: "i" } },
        { originalSummary: { $regex: q, $options: "i" } }
      ]
    };

    const news = await newsCollection
      .find(query)
      .sort({ publishedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .toArray();

    const total = await newsCollection.countDocuments(query);

    return res.status(200).json({
      success: true,
      query: q,
      news,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error("Error searching news:", error);
    return res.status(500).json({
      success: false,
      message: "Error searching news",
      error: error.message
    });
  }
};

// Delete news article (Admin only)
exports.deleteNews = async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid news ID"
      });
    }

    const newsCollection = await getNewsCollection();
    const result = await newsCollection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "News article not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "News article deleted successfully"
    });

  } catch (error) {
    console.error("Error deleting news:", error);
    return res.status(500).json({
      success: false,
      message: "Error deleting news",
      error: error.message
    });
  }
};

// Get news statistics (Admin only)
exports.getNewsStats = async (req, res) => {
  try {
    const newsCollection = await getNewsCollection();

    const total = await newsCollection.countDocuments({});
    const published = await newsCollection.countDocuments({ status: "published" });
    const totalViews = await newsCollection.aggregate([
      { $group: { _id: null, totalViews: { $sum: "$views" } } }
    ]).toArray();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCount = await newsCollection.countDocuments({
      fetchedAt: { $gte: today }
    });

    // Get sample articles for debugging
    const sampleArticles = await newsCollection.find({}).limit(3).toArray();

    return res.status(200).json({
      success: true,
      stats: {
        total,
        published,
        totalViews: totalViews[0]?.totalViews || 0,
        todayCount
      },
      debug: {
        sampleArticles: sampleArticles.map(a => ({
          id: a._id,
          title: a.title?.substring(0, 50),
          status: a.status,
          language: a.language
        }))
      }
    });

  } catch (error) {
    console.error("Error fetching news stats:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching news statistics",
      error: error.message
    });
  }
};

// Test database connection and collection
exports.testDatabase = async (req, res) => {
  try {
    const newsCollection = await getNewsCollection();
    
    // Test insert
    const testDoc = {
      title: "Test Article",
      originalSummary: "This is a test",
      rewrittenContent: "This is a test article",
      source: "Test Source",
      link: "https://test.com",
      publishedAt: new Date(),
      fetchedAt: new Date(),
      status: "published",
      views: 0,
      category: "test",
      language: "en"
    };
    
    const insertResult = await newsCollection.insertOne(testDoc);
    const count = await newsCollection.countDocuments({});
    const found = await newsCollection.findOne({ _id: insertResult.insertedId });
    
    // Clean up test doc
    await newsCollection.deleteOne({ _id: insertResult.insertedId });
    
    return res.status(200).json({
      success: true,
      message: "Database connection test successful",
      test: {
        inserted: !!insertResult.insertedId,
        found: !!found,
        totalInCollection: count - 1, // -1 because we deleted the test doc
        collectionName: "news_articles"
      }
    });
  } catch (error) {
    console.error("Database test error:", error);
    return res.status(500).json({
      success: false,
      message: "Database test failed",
      error: error.message
    });
  }
};

// Helper function to escape XML entities (for non-CDATA fields)
function escapeXml(unsafe) {
  if (!unsafe) return '';
  return unsafe.toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// Helper function to clean HTML from description
function cleanDescription(html) {
  if (!html) return '';
  // Remove HTML tags but keep text
  return html.replace(/<[^>]*>/g, '').trim();
}

// Format date to RFC 822 format (required for RSS validation)
function formatRFC822Date(date) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  const d = new Date(date);
  const day = days[d.getUTCDay()];
  const dayNum = String(d.getUTCDate()).padStart(2, '0');
  const month = months[d.getUTCMonth()];
  const year = d.getUTCFullYear();
  const hours = String(d.getUTCHours()).padStart(2, '0');
  const minutes = String(d.getUTCMinutes()).padStart(2, '0');
  const seconds = String(d.getUTCSeconds()).padStart(2, '0');
  
  return `${day}, ${dayNum} ${month} ${year} ${hours}:${minutes}:${seconds} +0000`;
}

// Helper function to get base URL with proper protocol (HTTPS when secure)
function getBaseUrl(req) {
  // Check if request is secure (HTTPS) or behind a proxy
  const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : req.protocol;
  return `${protocol}://${req.get('host')}`;
}

// Helper function to check if a string is a valid URL
function isValidUrl(string) {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_) {
    return false;
  }
}

// Generate RSS feed in standard RSS 2.0 format (from database)
exports.generateRSSFeed = async (req, res) => {
  try {
    const {
      limit = 20,
      category,
      language = "mr"
    } = req.query;

    // Get news from database (published news)
    const newsCollection = await getNewsCollection();
    const query = { status: "published" };
    if (category) query.category = category;
    if (language) query.language = language;

    const newsItems = await newsCollection
      .find(query)
      .sort({ publishedAt: -1 })
      .limit(parseInt(limit))
      .toArray();

    // If no news in database, try to fetch from RSS as fallback
    if (!newsItems || newsItems.length === 0) {
      console.log("No news in database, fetching from RSS as fallback...");
      
      const {
        query = "पुणे",
        country = "IN"
      } = req.query;

      const RSS_URL = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=${language}&gl=${country}&ceid=${country}:${language}`;
      
      try {
        const feed = await parser.parseURL(RSS_URL);
        
        if (feed && feed.items && feed.items.length > 0) {
          const items = feed.items.slice(0, parseInt(limit));
          const baseUrl = getBaseUrl(req);
          const rssUrl = `${baseUrl}${req.originalUrl}`;
          
          const channelTitle = feed.title || 'News Feed';
          const channelDescription = feed.description || 'Latest news feed';
          const channelLink = `${baseUrl}/news`;

          let rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:media="http://search.yahoo.com/mrss/" xmlns:atom="http://www.w3.org/2005/Atom" version="2.0">
<channel>
<title><![CDATA[${channelTitle}]]></title>
<link>${escapeXml(channelLink)}</link>
<atom:link href="${escapeXml(rssUrl)}" rel="self" type="application/rss+xml"/>
<description>
<![CDATA[ ${channelDescription} ]]>
</description>
<language>${language}</language>
<lastBuildDate>${formatRFC822Date(new Date())}</lastBuildDate>
<pubDate>${formatRFC822Date(new Date())}</pubDate>
<image>
<title><![CDATA[${channelTitle}]]></title>
<url>${escapeXml(baseUrl)}/logo.png</url>
<link>${escapeXml(channelLink)}</link>
</image>
`;

          for (const item of items) {
            const title = (item.title || '').trim();
            const link = item.link || '';
            // GUID must be a full URL when isPermaLink="true"
            // Always use link as guid (it's always a URL from Google News RSS)
            // If link is missing, generate a valid URL
            let guid = link;
            if (!guid || !isValidUrl(guid)) {
              guid = `${baseUrl}/news/${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            }
            const isGuidUrl = isValidUrl(guid);
            
            let description = item.contentSnippet || item.content || item.description || '';
            
            if (description.includes('<')) {
              description = cleanDescription(description);
            }
            
            const pubDate = item.pubDate ? formatRFC822Date(new Date(item.pubDate)) : formatRFC822Date(new Date());
            
            // Extract image URL
            let imageUrl = null;
            let imageWidth = 1000;
            let imageHeight = 1000;
            
            if (item.content) {
              const imgMatch = item.content.match(/<img[^>]+src=["']([^"']+)["']/i);
              if (imgMatch && imgMatch[1]) {
                imageUrl = imgMatch[1];
              }
            }
            if (!imageUrl && item['media:thumbnail'] && item['media:thumbnail'].url) {
              imageUrl = item['media:thumbnail'].url;
            }
            if (!imageUrl && item['media:content'] && item['media:content'].url) {
              imageUrl = item['media:content'].url;
            }

            rssXml += `<item>
<title>
<![CDATA[ ${title} ]]>
</title>
<link>${escapeXml(link)}</link>
<guid isPermaLink="${isGuidUrl ? 'true' : 'false'}">${escapeXml(guid)}</guid>
<atom:link href="${escapeXml(link)}"/>
<description>
<![CDATA[ ${description} ]]>
</description>
<pubDate>${pubDate}</pubDate>
`;

            if (imageUrl) {
              rssXml += `<media:content url="${escapeXml(imageUrl)}" type="image/jpeg" width="${imageWidth}" height="${imageHeight}"/>
`;
            }

            rssXml += `</item>
`;
          }

          rssXml += `</channel>
</rss>`;

          return res.set('Content-Type', 'application/rss+xml; charset=utf-8').send(rssXml);
        }
      } catch (rssError) {
        console.error("RSS fallback error:", rssError.message);
      }
      
      // Return empty but valid RSS feed if both database and RSS fail
      const baseUrl = getBaseUrl(req);
      const rssUrl = `${baseUrl}${req.originalUrl}`;
      
      return res.set('Content-Type', 'application/rss+xml; charset=utf-8').send(`<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:media="http://search.yahoo.com/mrss/" xmlns:atom="http://www.w3.org/2005/Atom" version="2.0">
<channel>
<title><![CDATA[News Feed]]></title>
<link>${escapeXml(baseUrl)}/news</link>
<atom:link href="${escapeXml(rssUrl)}" rel="self" type="application/rss+xml"/>
<description>
<![CDATA[ Latest news feed ]]>
</description>
<language>${language}</language>
<lastBuildDate>${formatRFC822Date(new Date())}</lastBuildDate>
<pubDate>${formatRFC822Date(new Date())}</pubDate>
</channel>
</rss>`);
    }

    const baseUrl = getBaseUrl(req);
    const rssUrl = `${baseUrl}${req.originalUrl}`;
    
    // Channel metadata
    const channelTitle = 'News Feed';
    const channelDescription = 'Latest news feed';
    const channelLink = `${baseUrl}/news`;

    // Build RSS XML (matching divyamarathi.bhaskar.com format exactly)
    let rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:media="http://search.yahoo.com/mrss/" xmlns:atom="http://www.w3.org/2005/Atom" version="2.0">
<channel>
<title><![CDATA[${channelTitle}]]></title>
<link>${escapeXml(channelLink)}</link>
<atom:link href="${escapeXml(rssUrl)}" rel="self" type="application/rss+xml"/>
<description>
<![CDATA[ ${channelDescription} ]]>
</description>
<language>${language}</language>
<lastBuildDate>${formatRFC822Date(new Date())}</lastBuildDate>
<pubDate>${formatRFC822Date(new Date())}</pubDate>
<image>
<title><![CDATA[${channelTitle}]]></title>
<url>${escapeXml(baseUrl)}/logo.png</url>
<link>${escapeXml(channelLink)}</link>
</image>
`;

    // Add items from database
    for (const item of newsItems) {
      const title = (item.title || '').trim();
      const link = item.link || `${baseUrl}/news/${item._id}`;
      // GUID must be a full URL when isPermaLink="true"
      // Ensure guid is always a valid URL
      let guid = link;
      if (!guid || !isValidUrl(guid)) {
        guid = `${baseUrl}/news/${item._id}`;
      }
      const isGuidUrl = isValidUrl(guid);
      
      // Use rewritten content if available, otherwise original summary
      let description = item.rewrittenContent || item.originalSummary || item.description || '';
      
      // Clean HTML from description if it's HTML
      if (description.includes('<')) {
        description = cleanDescription(description);
      }
      
      // Don't truncate description - RSS feeds can have full content
      // But ensure it's not too long (some validators have limits)
      if (description.length > 10000) {
        description = description.substring(0, 10000) + '...';
      }
      
      // Format date properly (RFC 822)
      const pubDate = item.publishedAt 
        ? formatRFC822Date(item.publishedAt) 
        : formatRFC822Date(new Date());
      
      // Get image URL
      const imageUrl = item.imageUrl || null;
      const imageWidth = 1000;
      const imageHeight = 1000;

      rssXml += `<item>
<title>
<![CDATA[ ${title} ]]>
</title>
<link>${escapeXml(link)}</link>
<guid isPermaLink="${isGuidUrl ? 'true' : 'false'}">${escapeXml(guid)}</guid>
<atom:link href="${escapeXml(link)}"/>
<description>
<![CDATA[ ${description} ]]>
</description>
<pubDate>${pubDate}</pubDate>
`;

      // Add media:content if image exists (matching divyamarathi format)
      if (imageUrl) {
        rssXml += `<media:content url="${escapeXml(imageUrl)}" type="image/jpeg" width="${imageWidth}" height="${imageHeight}"/>
`;
      }

      rssXml += `</item>
`;
    }

    rssXml += `</channel>
</rss>`;

    // Set proper headers for RSS
    res.set('Content-Type', 'application/rss+xml; charset=utf-8');
    res.send(rssXml);

  } catch (error) {
    console.error("Error generating RSS feed:", error);
    res.set('Content-Type', 'application/rss+xml; charset=utf-8');
    res.status(500).send(`<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:media="http://search.yahoo.com/mrss/" xmlns:atom="http://www.w3.org/2005/Atom" version="2.0">
<channel>
<title>Error</title>
<description>Error generating RSS feed: ${escapeXml(error.message)}</description>
</channel>
</rss>`);
  }
};
