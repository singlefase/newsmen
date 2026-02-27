/**
 * V1 News Controller - New 6 APIs + getRealRSS
 * Implements all new APIs as per architecture proposal
 */

const { ObjectId } = require("mongodb");
const Parser = require("rss-parser");
const { GoogleGenAI } = require("@google/genai");
const { connectToDatabase } = require("../config/database");
const {
  downloadAndUploadImage,
  extractImageUrlFromRSSItem,
} = require("../services/r2ImageService");
const { getStockImage } = require("../services/stockImageService");
const {
  isLinkFetched,
  markLinkAsFetched,
  googleNewsExists,
  isGlobalDuplicate,
} = require("../utils/deduplication");
const {
  escapeXml,
  cleanDescription,
  formatRFC822Date,
  getBaseUrl,
  isValidUrl,
} = require("../utils/rssUtils");

const parser = new Parser();

// ---------------- CONFIGURATION ----------------
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
  "निर्णय",
];

const BLOCKED_KEYWORDS = [
  "खून",
  "हत्या",
  "आत्महत्या",
  "अपघात",
  "बलात्कार",
  "गोळीबार",
  "चाकू",
  "गुन्हा",
];

const RSS_SOURCES = [
  { name: "TV9 Marathi", url: "https://www.tv9marathi.com/feed" },
  { name: "Saam TV", url: "https://www.saamtv.com/feed/" },
  {
    name: "Divya Marathi",
    url: "https://divyamarathi.bhaskar.com/rss-v1--category-12019.xml",
  },
];

const CATEGORY_KEYWORDS = {
  desh: ["देश", "भारत", "राष्ट्रीय", "केंद्र", "दिल्ली", "संसद", "राष्ट्रपती", "प्रधानमंत्री", "सर्वोच्च न्यायालय", "सीबीआय", "एनआयए"],
  videsh: ["विदेश", "परदेश", "आंतरराष्ट्रीय", "जागतिक", "अमेरिका", "चीन", "पाकिस्तान", "रशिया", "युक्रेन", "ब्रिटन", "संयुक्त राष्ट्र", "नाटो", "युरोप"],
  maharastra: ["महाराष्ट्र", "मराठवाडा", "कोकण", "विदर्भ", "खानदेश", "पश्चिम महाराष्ट्र", "राज्य सरकार"],
  pune: ["पुणे", "पुण्यात", "पुण्याचा", "पुण्यातील", "पिंपरी", "चिंचवड", "हडपसर", "कोथरूड"],
  mumbai: ["मुंबई", "मुंबईत", "मुंबईचा", "मुंबईतील", "बॉम्बे", "ठाणे", "नवी मुंबई", "वसई", "विरार", "अंधेरी", "दादर", "बोरीवली"],
  nashik: ["नाशिक", "नाशिकात", "नाशिकचा", "नाशिकतील", "त्र्यंबकेश्वर", "सिन्नर", "मालेगाव"],
  ahmednagar: ["अहमदनगर", "अहिल्यानगर", "नगर", "श्रीरामपूर", "शिर्डी"],
  aurangabad: ["औरंगाबाद", "संभाजीनगर", "छत्रपती संभाजीनगर", "जालना", "बीड"],
  political: ["राजकारण", "राजकीय", "आमदार", "खासदार", "मंत्री", "मुख्यमंत्री", "पक्ष", "निवडणूक", "भाजप", "काँग्रेस", "शिवसेना", "राष्ट्रवादी", "विरोधक", "सत्ताधारी", "विधानसभा", "लोकसभा", "राज्यसभा", "पवार", "ठाकरे", "फडणवीस", "शिंदे", "राऊत", "उपमुख्यमंत्री", "विधानपरिषद", "महायुती", "मविआ"],
  sports: ["क्रीडा", "खेळ", "स्पोर्ट्स", "क्रिकेट", "फुटबॉल", "टेनिस", "खेळाडू", "आयपीएल", "विश्वचषक", "ऑलिम्पिक", "कबड्डी", "हॉकी", "बॅडमिंटन", "विराट", "रोहित", "धोनी", "बीसीसीआय", "सामना", "स्पर्धा"],
  entertainment: ["मनोरंजन", "चित्रपट", "फिल्म", "सिनेमा", "अभिनेता", "अभिनेत्री", "सिरीयल", "गाणे", "बॉलिवूड", "मराठी चित्रपट", "नाटक", "वेब सिरीज", "ओटीटी", "बिग बॉस"],
  tourism: ["पर्यटन", "पर्यटक", "टूर", "यात्रा", "सफर", "ठिकाण", "दर्शन", "हिल स्टेशन", "समुद्रकिनारा", "किल्ला", "लेणी", "मंदिर", "धार्मिक स्थळ"],
  lifestyle: ["जीवनशैली", "फॅशन", "स्टाईल", "सौंदर्य", "ब्यूटी", "फिटनेस", "योगा", "डाएट", "वेलनेस", "स्किनकेअर", "रेसिपी", "स्वयंपाक"],
  agriculture: ["शेती", "शेतकरी", "पिक", "धान्य", "कृषी", "खते", "सिंचन", "कापूस", "सोयाबीन", "ऊस", "कांदा", "हमीभाव", "मंडी", "बाजारभाव"],
  government: ["सरकार", "सरकारी", "प्रशासन", "पालिका", "महापालिका", "योजना", "निर्णय", "जिल्हाधिकारी", "आयुक्त", "अर्थसंकल्प", "कर", "जीएसटी"],
  trade: ["व्यापार", "व्यवसाय", "बाजार", "कंपनी", "उद्योग", "व्यापारी", "शेअर", "सेन्सेक्स", "निफ्टी", "गुंतवणूक", "स्टार्टअप", "निर्यात", "आयात"],
  health: ["आरोग्य", "रुग्णालय", "डॉक्टर", "औषध", "उपचार", "रोग", "आजार", "लस", "कोरोना", "कॅन्सर", "मधुमेह", "हृदयविकार", "शस्त्रक्रिया", "एम्स"],
  horoscope: ["भविष्य", "राशी", "ज्योतिष", "राशिभविष्य", "कुंडली", "ग्रहस्थिती", "पंचांग", "मेष", "वृषभ", "मिथुन", "कर्क", "सिंह", "कन्या", "तूळ", "वृश्चिक", "धनु", "मकर", "कुंभ", "मीन"],
};

const CATEGORY_LABELS = {
  desh: { title: "देश बातम्या", description: "भारतातील ताज्या बातम्या" },
  videsh: { title: "विदेश बातम्या", description: "आंतरराष्ट्रीय ताज्या बातम्या" },
  maharastra: { title: "महाराष्ट्र बातम्या", description: "महाराष्ट्रातील ताज्या बातम्या" },
  pune: { title: "पुणे बातम्या", description: "पुण्यातील ताज्या बातम्या" },
  mumbai: { title: "मुंबई बातम्या", description: "मुंबईतील ताज्या बातम्या" },
  nashik: { title: "नाशिक बातम्या", description: "नाशिकातील ताज्या बातम्या" },
  ahmednagar: { title: "अहमदनगर बातम्या", description: "अहमदनगरातील ताज्या बातम्या" },
  aurangabad: { title: "संभाजीनगर बातम्या", description: "संभाजीनगरातील ताज्या बातम्या" },
  political: { title: "राजकारण बातम्या", description: "राजकीय ताज्या बातम्या" },
  sports: { title: "क्रीडा बातम्या", description: "खेळाच्या ताज्या बातम्या" },
  entertainment: { title: "मनोरंजन बातम्या", description: "मनोरंजन क्षेत्रातील ताज्या बातम्या" },
  tourism: { title: "पर्यटन बातम्या", description: "पर्यटन क्षेत्रातील ताज्या बातम्या" },
  lifestyle: { title: "जीवनशैली", description: "जीवनशैलीशी संबंधित ताज्या बातम्या" },
  agriculture: { title: "कृषी बातम्या", description: "शेती आणि कृषी क्षेत्रातील ताज्या बातम्या" },
  government: { title: "सरकारी बातम्या", description: "सरकारी निर्णय आणि योजनांच्या बातम्या" },
  trade: { title: "व्यापार बातम्या", description: "व्यापार आणि उद्योग क्षेत्रातील ताज्या बातम्या" },
  health: { title: "आरोग्य बातम्या", description: "आरोग्य क्षेत्रातील ताज्या बातम्या" },
  horoscope: { title: "राशिभविष्य", description: "आजचे राशिभविष्य" },
  general: { title: "ताज्या बातम्या", description: "सर्व ताज्या मराठी बातम्या" },
};

// ---------------- HELPER FUNCTIONS ----------------
function isProperMarathi(text = "") {
  if (!text) return false;
  const devanagariChars = (text.match(/[\u0900-\u097F]/g) || []).length;
  // At least 10 Devanagari characters and 30%+ Devanagari ratio
  // (lowered from 60% because Marathi news sites prefix titles with English names/tags)
  return devanagariChars >= 10 && devanagariChars / text.length >= 0.3;
}

function containsAllowedTopic(text = "") {
  return ALLOWED_KEYWORDS.some((k) => text.includes(k));
}

function containsBlockedTopic(text = "") {
  const foundKeywords = BLOCKED_KEYWORDS.filter((k) => text.includes(k));
  return foundKeywords.length >= 2;
}

function cleanTitle(title = "") {
  return title.replace(/ - .*$/, "").replace(/\|.*$/, "").trim();
}

function detectCategoriesFromText(title = "", description = "") {
  if (!title && !description) return ["general"];

  const titleLower = title.toLowerCase();
  // Location matching uses title + first 200 chars of description (city names are unambiguous)
  const snippetLower = `${title} ${(description || "").substring(0, 200)}`.toLowerCase();
  const matched = [];

  const locationCategories = [
    "pune", "mumbai", "nashik", "ahmednagar", "aurangabad", "maharastra",
  ];
  const topicCategories = [
    "desh", "videsh", "political", "sports", "entertainment",
    "tourism", "lifestyle", "agriculture", "government", "trade", "health", "horoscope",
  ];

  for (const cat of locationCategories) {
    const keywords = CATEGORY_KEYWORDS[cat];
    if (keywords && keywords.some((kw) => snippetLower.includes(kw.toLowerCase()))) {
      matched.push(cat);
    }
  }

  for (const cat of topicCategories) {
    const keywords = CATEGORY_KEYWORDS[cat];
    if (keywords && keywords.some((kw) => titleLower.includes(kw.toLowerCase()))) {
      matched.push(cat);
    }
  }

  return matched.length > 0 ? matched : ["general"];
}

function stripHtml(html = "") {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

// Get collection helper
async function getCollection(collectionName) {
  const { mongodb } = await connectToDatabase();
  return mongodb.collection(collectionName);
}

// Shared Gemini call with retry on 429 rate limits
async function callGemini(prompt, maxRetries = 3) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  const ai = new GoogleGenAI({ apiKey });

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });
      return res.text.trim();
    } catch (error) {
      const is429 = error.message?.includes("429") || error.message?.includes("RESOURCE_EXHAUSTED");
      if (is429 && attempt < maxRetries) {
        const waitSec = Math.pow(2, attempt + 1) + Math.random() * 2;
        console.log(`  ⏳ Gemini rate limited, waiting ${waitSec.toFixed(1)}s (attempt ${attempt + 1}/${maxRetries})...`);
        await new Promise((r) => setTimeout(r, waitSec * 1000));
        continue;
      }
      throw error;
    }
  }
}

// AI Rewriting function
async function rewriteMarathiInshortsStyle({ title, summary, source }) {
  try {
    const prompt = `तुम्ही Inshorts-style मराठी न्यूज रायटर आहात.

खालील बातमी 60-80 शब्दांत, लहान, सोपी आणि तथ्यात्मक पद्धतीने पुन्हा लिहा.

नियम:
- मूळ मजकूर कॉपी करू नका - पूर्णपणे मूळ लिहा
- 3-4 छोटी वाक्ये
- मत मांडू नका
- साधी, स्पष्ट मराठी
- फक्त मुख्य तथ्ये

शीर्षक: ${title}
स्रोत: ${source}
सारांश: ${summary}

फक्त पुन्हा लिहिलेली बातमी द्या (60-80 शब्द).`;

    return await callGemini(prompt);
  } catch (error) {
    console.error("Gemini Inshorts rewriting error:", error.message);
    return summary ? summary.substring(0, 200) + "..." : title;
  }
}

// Long-form Marathi rewriting (for detailed descriptions)
async function rewriteMarathiLong({ title, content, source }) {
  try {
    const prompt = `तुम्ही मराठी न्यूज एडिटर आहात.

खालील संपूर्ण बातमी पुन्हा लिहा. मजकूर लांब, तपशीलवार आणि वाचनीय असावा.

नियम:
- मूळ मजकूर कॉपी करू नका - पूर्णपणे मूळ लिहा
- संपूर्ण बातमी पुन्हा लिहा (सारांश नाही)
- मूळ लांबी जवळजवळ कायम ठेवा किंवा थोडी वाढवा
- सर्व महत्त्वाची माहिती, पार्श्वभूमी आणि संदर्भ समाविष्ट करा
- साधी, स्पष्ट आणि प्रवाही मराठी वापरा
- मत मांडू नका, फक्त तथ्यांवर लक्ष द्या

शीर्षक: ${title}
स्रोत: ${source}
मूळ बातमी:
${content}

फक्त पुन्हा लिहिलेली संपूर्ण बातमी द्या.`;

    return await callGemini(prompt);
  } catch (error) {
    console.error("Gemini long-form rewriting error:", error.message);
    return content || title;
  }
}

async function rewriteTitle(originalTitle, content = "") {
  try {
    const prompt = `तुम्ही मराठी न्यूज हेडलाइन एडिटर आहात.

खालील बातमीचे शीर्षक पुन्हा लिहा.

नियम:
- मूळ शीर्षक कॉपी करू नका - पूर्णपणे नवीन लिहा
- 10-15 शब्दांत ठेवा
- मुख्य माहिती समाविष्ट करा
- आकर्षक पण क्लिकबेट नसलेले
- साधी स्पष्ट मराठी

मूळ शीर्षक: ${originalTitle}
बातमी सारांश: ${(content || "").substring(0, 300)}

फक्त नवीन शीर्षक द्या, कोणतेही स्पष्टीकरण किंवा अवतरण चिन्ह नाही.`;

    let newTitle = await callGemini(prompt);
    newTitle = newTitle.replace(/^["'"""'']+|["'"""'']+$/g, "");
    return newTitle || originalTitle;
  } catch (error) {
    console.error("Title rewriting error:", error.message);
    return originalTitle;
  }
}

// ---------------- API 1: Google News RSS Fetcher & Storage ----------------
exports.fetchGoogleNews = async (req, res) => {
  try {
    console.log("\n🚀 [API 1] Fetching Google News RSS...");
    const {
      query = "पुणे",
      limit = 10,
      language = "mr",
      country = "IN",
      strictFilter = false,
      category = "general",
    } = req.body;

    // Build RSS URL
    let RSS_URL;
    if (query && query.trim() !== "") {
      RSS_URL = `https://news.google.com/rss/search?q=${encodeURIComponent(
        query
      )}&hl=${language}&gl=${country}&ceid=${country}:${language}`;
    } else {
      const topicMap = {
        general: "https://news.google.com/rss?hl=en&gl=IN&ceid=IN:en",
        politics:
          "https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRFZxYUdjU0FtVnVHZ0pWVXlnQVAB?hl=en&gl=IN&ceid=IN:en",
        technology:
          "https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGRqTVhZU0FtVnVHZ0pWVXlnQVAB?hl=en&gl=IN&ceid=IN:en",
        sports:
          "https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRFp1YVdjU0FtVnVHZ0pWVXlnQVAB?hl=en&gl=IN&ceid=IN:en",
        business:
          "https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGx1YlY4U0FtVnVHZ0pWVXlnQVAB?hl=en&gl=IN&ceid=IN:en",
      };
      RSS_URL = topicMap[category] || topicMap["general"];
    }

    console.log(`📰 RSS URL: ${RSS_URL}`);

    // Fetch RSS feed
    let feed;
    try {
      feed = await parser.parseURL(RSS_URL);
    } catch (rssError) {
      console.error("❌ RSS Feed Error:", rssError.message);
      return res.status(500).json({
        success: false,
        message: "Error fetching RSS feed",
        error: rssError.message,
      });
    }

    if (!feed || !feed.items || feed.items.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No news items found in RSS feed",
        news: [],
      });
    }

    console.log(`✅ RSS feed loaded: ${feed.items.length} items found`);

    const collection = await getCollection("google_rss_news_legal");
    const collected = [];
    let savedCount = 0;
    let skippedCount = 0;

    // Process and filter news
    for (const item of feed.items) {
      if (collected.length >= limit) break;

      const title = cleanTitle(item.title || "");
      const summary = item.contentSnippet || item.content || "";
      const text = `${title} ${summary}`;

      // Apply filters
      if (strictFilter) {
        if (
          !isProperMarathi(title) ||
          !containsAllowedTopic(text) ||
          containsBlockedTopic(text)
        ) {
          continue;
        }
      }

      // Check if already exists (deduplication)
      const link = item.link || "";
      if (link && (await googleNewsExists(link))) {
        console.log(`  ⏭️  Skipping duplicate: ${title.substring(0, 50)}...`);
        skippedCount++;
        continue;
      }

      // Extract image URL
      let imageUrl = null;
      if (item.content) {
        const imgMatch = item.content.match(/<img[^>]+src=["']([^"']+)["']/i);
        if (imgMatch && imgMatch[1]) {
          imageUrl = imgMatch[1];
        }
      }
      if (!imageUrl && item["media:thumbnail"]?.url) {
        imageUrl = item["media:thumbnail"].url;
      }
      if (!imageUrl && item["media:content"]?.url) {
        imageUrl = item["media:content"].url;
      }

      // Extract reporter name
      let reporterName =
        item.creator ||
        item.author ||
        item["dc:creator"] ||
        item["dc:author"] ||
        null;

      // Create news article
      const newsArticle = {
        title: title,
        originalSummary: summary,
        source: item.source?.title || feed.title || "Google News",
        link: link,
        imageUrl: imageUrl || null,
        reporterName: reporterName,
        publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
        fetchedAt: new Date(),
        category: category || "general",
        language: language || "mr",
        query: query,
        // Legal compliance fields
        originalSource: item.source?.title || feed.title || "Google News",
        hasOriginalLink: !!link,
        isFromGoogleNews: true,
      };

      // Save to database
      try {
        await collection.insertOne(newsArticle);
        savedCount++;
        collected.push(newsArticle);
        console.log(`  💾 Saved: ${title.substring(0, 50)}...`);
      } catch (dbError) {
        if (dbError.code === 11000) {
          // Duplicate key error
          skippedCount++;
          console.log(`  ⏭️  Duplicate skipped: ${title.substring(0, 50)}...`);
        } else {
          console.error(`  ❌ Database error: ${dbError.message}`);
        }
      }
    }

    console.log(
      `\n✅ Processing complete: ${savedCount} saved, ${skippedCount} skipped\n`
    );

    return res.status(200).json({
      success: true,
      message: `Successfully fetched and stored ${savedCount} news articles`,
      count: savedCount,
      skipped: skippedCount,
      news: collected,
    });
  } catch (error) {
    console.error("❌ Error in fetchGoogleNews:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching Google News",
      error: error.message,
    });
  }
};

// ---------------- API 2: Legal News Retrieval from Google News Collection ----------------
exports.getGoogleNews = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      category,
      language,
      search,
      dateFrom,
      dateTo,
    } = req.query;

    const collection = await getCollection("google_rss_news_legal");
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build query
    const query = {};
    if (category) query.category = category;
    if (language) query.language = language;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { originalSummary: { $regex: search, $options: "i" } },
      ];
    }
    if (dateFrom || dateTo) {
      query.publishedAt = {};
      if (dateFrom) query.publishedAt.$gte = new Date(dateFrom);
      if (dateTo) query.publishedAt.$lte = new Date(dateTo);
    }

    // Fetch news
    const news = await collection
      .find(query)
      .sort({ publishedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .toArray();

    const total = await collection.countDocuments(query);

    // Format response with legal compliance
    const formattedNews = news.map((item) => ({
      id: item._id.toString(),
      title: item.title,
      summary: item.originalSummary,
      source: item.source,
      sourceLink: item.link,
      imageUrl: item.imageUrl,
      publishedAt: item.publishedAt,
      category: item.category,
      language: item.language,
      attribution: {
        source: item.originalSource,
        originalLink: item.link,
        publishedDate: item.publishedAt,
      },
      navigation: {
        detailUrl: `/news/google-news/${item._id}`,
        sourceUrl: item.link,
        shareUrl: `/share/google-news/${item._id}`,
      },
      disclaimer:
        "This is a summary of publicly available news. Click source link for full article.",
    }));

    return res.status(200).json({
      success: true,
      news: formattedNews,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Error in getGoogleNews:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching news",
      error: error.message,
    });
  }
};

// ---------------- API 3: External RSS Fetcher with Image Download ----------------
exports.fetchExternalRSS = async (req, res) => {
  try {
    console.log("\n🚀 [API 3] Fetching External RSS with Image Download...");
    const { source, limit = 6, category: requestedCategory } = req.body;

    const sourcesToFetch = source
      ? RSS_SOURCES.filter((s) =>
          s.name.toLowerCase().includes(source.toLowerCase())
        )
      : RSS_SOURCES;

    const perSourceLimit = Math.ceil(limit / sourcesToFetch.length);
    console.log(`📰 Fetching from ${sourcesToFetch.length} sources (${perSourceLimit} per source, ${limit} total)...`);
    if (requestedCategory) {
      console.log(`🏷️  Filtering for category: ${requestedCategory}`);
    }

    const allItems = [];
    let fetchedCount = 0;
    let nonMarathiCount = 0;
    let categoryMismatchCount = 0;
    let duplicateCount = 0;

    for (const src of sourcesToFetch) {
      if (fetchedCount >= limit) break;
      let sourceCount = 0;

      try {
        console.log(`  📡 Fetching: ${src.name} - ${src.url}`);
        const feed = await parser.parseURL(src.url);

        if (!feed || !feed.items || feed.items.length === 0) {
          console.log(`  ⚠️  No items in ${src.name}`);
          continue;
        }

        for (const item of feed.items) {
          if (fetchedCount >= limit) break;
          if (sourceCount >= perSourceLimit) break;

          const link = item.link || "";
          if (!link) continue;

          const title = item.title || "";
          const shortTitle = title.substring(0, 55);

          if (await isLinkFetched(src.name, link)) {
            console.log(`  ⏭️  [source-dup] ${shortTitle}...`);
            duplicateCount++;
            continue;
          }

          if (await isGlobalDuplicate(link)) {
            console.log(`  ⏭️  [global-dup] ${shortTitle}...`);
            duplicateCount++;
            continue;
          }

          const description = item.description || item.contentSnippet || "";
          const combinedText = `${title} ${description}`;

          if (!isProperMarathi(combinedText)) {
            console.log(`  ⏭️  [not-marathi] ${shortTitle}...`);
            nonMarathiCount++;
            continue;
          }

          const detectedCategories = detectCategoriesFromText(title, description);

          if (requestedCategory && !detectedCategories.includes(requestedCategory)) {
            console.log(`  ⏭️  [cat-mismatch] wanted="${requestedCategory}" detected=[${detectedCategories}] title: ${shortTitle}...`);
            categoryMismatchCount++;
            continue;
          }

          const originalImageUrl = extractImageUrlFromRSSItem(item);
          let r2ImageUrl = null;
          let imageDownloaded = false;
          let imageUploaded = false;

          if (originalImageUrl) {
            console.log(`  📸 Processing image for: ${title.substring(0, 50)}...`);
            const imageResult = await downloadAndUploadImage(
              originalImageUrl,
              src.name.replace(/\s+/g, "-").toLowerCase()
            );

            if (imageResult.success) {
              r2ImageUrl = imageResult.url;
              imageDownloaded = true;
              imageUploaded = true;
            } else {
              console.log(`  ⚠️  Image upload failed: ${imageResult.error}`);
            }
          }

          // Fallback: if no image from RSS, fetch from Unsplash/Pexels
          let stockImageSource = null;
          if (!r2ImageUrl) {
            console.log(`  🖼️  No RSS image — searching stock photos for "${detectedCategories[0]}"...`);
            const stockResult = await getStockImage(detectedCategories);
            if (stockResult) {
              const stockUpload = await downloadAndUploadImage(
                stockResult.url,
                `stock-${stockResult.source}`
              );
              if (stockUpload.success) {
                r2ImageUrl = stockUpload.url;
                imageDownloaded = true;
                imageUploaded = true;
                stockImageSource = stockResult.source;
                console.log(`  ✅ Stock image (${stockResult.source}) uploaded: ${r2ImageUrl.substring(0, 60)}...`);
              }
            }
          }

          const newsArticle = {
            sourceName: src.name,
            sourceUrl: src.url,
            title: title,
            link: link,
            guid: item.guid || link,
            description: description,
            content: item["content:encoded"] || item.content || "",
            contentSnippet: item.contentSnippet || "",
            pubDate: item.pubDate || "",
            publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
            originalImageUrl: originalImageUrl,
            r2ImageUrl: r2ImageUrl,
            imageDownloaded: imageDownloaded,
            imageUploaded: imageUploaded,
            mediaContent: item["media:content"] || null,
            mediaThumbnail: item["media:thumbnail"] || null,
            enclosure: item.enclosure || null,
            fetchedAt: new Date(),
            processed: false,
            processedAt: null,
            categories: detectedCategories,
            language: "mr",
            stockImageSource: stockImageSource,
            rawRssData: item,
          };

          try {
            const collection = await getCollection("unprocessed_news_data");
            await collection.insertOne(newsArticle);
            await markLinkAsFetched(src.name, link);
            allItems.push(newsArticle);
            fetchedCount++;
            sourceCount++;
            console.log(`  ✅ [${src.name}] Saved (${detectedCategories.join(",")}): ${title.substring(0, 50)}...`);
          } catch (dbError) {
            if (dbError.code === 11000) {
              duplicateCount++;
              console.log(`  ⏭️  Duplicate key skipped: ${title.substring(0, 50)}...`);
            } else {
              console.error(`  ❌ DB insert error: ${dbError.message}`);
            }
          }
        }
      } catch (error) {
        console.error(`  ❌ Error fetching ${src.name}:`, error.message);
        continue;
      }
    }

    console.log(`\n✅ Fetched ${fetchedCount} | Skipped: ${nonMarathiCount} non-Marathi, ${categoryMismatchCount} category mismatch, ${duplicateCount} duplicates\n`);

    return res.status(200).json({
      success: true,
      message: `Successfully fetched ${fetchedCount} news items`,
      count: fetchedCount,
      nonMarathiSkipped: nonMarathiCount,
      categoryMismatchSkipped: categoryMismatchCount,
      duplicatesSkipped: duplicateCount,
      news: allItems.map((item) => ({
        id: item._id?.toString(),
        title: item.title,
        source: item.sourceName,
        link: item.link,
        categories: item.categories,
        imageUrl: item.r2ImageUrl || item.originalImageUrl,
      })),
    });
  } catch (error) {
    console.error("❌ Error in fetchExternalRSS:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching external RSS",
      error: error.message,
    });
  }
};

// ---------------- API 4: News Processing with AI Rewriting ----------------
exports.processNews = async (req, res) => {
  try {
    console.log("\n🚀 [API 4] Processing news with AI...");

    const { category: requestedCategory } = req.body || {};

    const collection = await getCollection("unprocessed_news_data");
    const processedCollection = await getCollection("processed_news_data");

    const baseQuery = { processed: false };
    if (requestedCategory) {
      baseQuery.categories = requestedCategory;
    }

    const unprocessedNews = await collection.findOne(baseQuery, {
      sort: { fetchedAt: 1 },
    });

    if (!unprocessedNews) {
      const remaining = await collection.countDocuments(baseQuery);
      console.log("  ℹ️  No unprocessed news found");
      return res.status(200).json({
        success: true,
        message: "No unprocessed news to process",
        processed: false,
        remaining: remaining,
      });
    }

    console.log(`  📰 Processing: ${unprocessedNews.title?.substring(0, 50)}...`);

    // Strip HTML before sending to AI
    const rawContent =
      unprocessedNews.content ||
      unprocessedNews.description ||
      unprocessedNews.contentSnippet ||
      "";
    const cleanContent = stripHtml(rawContent);

    // Rewrite description with AI (long, detailed)
    let rewrittenDescription;
    try {
      rewrittenDescription = await rewriteMarathiLong({
        title: unprocessedNews.title,
        content: cleanContent,
        source: unprocessedNews.sourceName,
      });
      console.log(`  ✅ AI description rewritten (${rewrittenDescription.length} chars)`);
    } catch (aiError) {
      console.error(`  ⚠️  AI description rewriting failed: ${aiError.message}`);
      rewrittenDescription = cleanContent.substring(0, 500) + "..." || unprocessedNews.title;
    }

    // Rewrite title with AI
    let rewrittenTitle;
    try {
      rewrittenTitle = await rewriteTitle(unprocessedNews.title, cleanContent);
      console.log(`  ✅ AI title rewritten: ${rewrittenTitle.substring(0, 60)}...`);
    } catch (titleError) {
      console.error(`  ⚠️  Title rewriting failed: ${titleError.message}`);
      rewrittenTitle = unprocessedNews.title;
    }

    // Image: prefer R2, fall back to original
    const imageUrl = unprocessedNews.r2ImageUrl || unprocessedNews.originalImageUrl || null;

    const processedNews = {
      sourceName: unprocessedNews.sourceName,
      sourceUrl: unprocessedNews.sourceUrl,
      title: rewrittenTitle,
      originalTitle: unprocessedNews.title,
      rewrittenDescription: rewrittenDescription,
      originalDescription:
        unprocessedNews.description || unprocessedNews.contentSnippet || "",
      link: unprocessedNews.link,
      guid: unprocessedNews.guid,
      imageUrl: imageUrl,
      originalImageUrl: unprocessedNews.originalImageUrl,
      pubDate: unprocessedNews.pubDate,
      publishedAt: unprocessedNews.publishedAt,
      processedAt: new Date(),
      mediaContent: unprocessedNews.mediaContent,
      mediaThumbnail: unprocessedNews.mediaThumbnail,
      enclosure: unprocessedNews.enclosure,
      language: unprocessedNews.language || "mr",
      categories: unprocessedNews.categories || ["general"],
      originalSource: unprocessedNews.sourceName,
      originalLink: unprocessedNews.link,
      isRewritten: true,
      isTitleRewritten: rewrittenTitle !== unprocessedNews.title,
      disclaimer:
        "This is a summary of publicly available news. Content rewritten for clarity. Click source link for full article.",
      unprocessedNewsId: unprocessedNews._id,
    };

    await processedCollection.insertOne(processedNews);

    await collection.updateOne(
      { _id: unprocessedNews._id },
      { $set: { processed: true, processedAt: new Date() } }
    );

    // Count remaining unprocessed for this query
    const remaining = await collection.countDocuments(baseQuery);

    console.log(`  💾 Saved to processed_news_data (${remaining} remaining)\n`);

    return res.status(200).json({
      success: true,
      message: "News processed successfully",
      processed: true,
      remaining: remaining,
      news: {
        id: processedNews._id?.toString(),
        title: processedNews.title,
        originalTitle: processedNews.originalTitle,
        description: processedNews.rewrittenDescription?.substring(0, 200) + "...",
        categories: processedNews.categories,
        imageUrl: processedNews.imageUrl,
      },
    });
  } catch (error) {
    console.error("❌ Error in processNews:", error);
    return res.status(500).json({
      success: false,
      message: "Error processing news",
      error: error.message,
    });
  }
};

// ---------------- API 5: Valid RSS Feed Generator ----------------
exports.generateRSSFeed = async (req, res) => {
  try {
    const { limit = 20, category, language = "mr", source } = req.query;

    const collection = await getCollection("processed_news_data");
    const query = {};
    if (category) query.categories = category;
    if (language) query.language = language;
    if (source) query.sourceName = source;

    const newsItems = await collection
      .find(query)
      .sort({ publishedAt: -1 })
      .limit(parseInt(limit))
      .toArray();

    const baseUrl = getBaseUrl(req);
    const rssUrl = `${baseUrl}${req.originalUrl}`;

    const catLabel = CATEGORY_LABELS[category] || CATEGORY_LABELS.general;
    const channelTitle = catLabel.title;
    const channelDescription = catLabel.description;
    const channelLink = `${baseUrl}/api/v1/rss-feed`;

    let rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:media="http://search.yahoo.com/mrss/" xmlns:atom="http://www.w3.org/2005/Atom" version="2.0">
<channel>
<title><![CDATA[${channelTitle}]]></title>
<link>${escapeXml(channelLink)}</link>
<atom:link href="${escapeXml(rssUrl)}" rel="self" type="application/rss+xml"/>
<description><![CDATA[${channelDescription}]]></description>
<language>${language}</language>
<lastBuildDate>${formatRFC822Date(new Date())}</lastBuildDate>
<pubDate>${formatRFC822Date(new Date())}</pubDate>
<image>
<title><![CDATA[${channelTitle}]]></title>
<url>${escapeXml(baseUrl)}/logo.png</url>
<link>${escapeXml(channelLink)}</link>
</image>
`;

    for (const item of newsItems) {
      const title = (item.title || "").trim();
      const link = item.link || `${baseUrl}/news/${item._id}`;
      let guid = link;
      if (!guid || !isValidUrl(guid)) {
        guid = `${baseUrl}/news/${item._id}`;
      }
      const isGuidUrl = isValidUrl(guid);

      let description = item.rewrittenDescription || item.originalDescription || "";
      if (description.includes("<")) {
        description = cleanDescription(description);
      }
      if (description.length > 10000) {
        description = description.substring(0, 10000) + "...";
      }

      const pubDate = item.publishedAt
        ? formatRFC822Date(item.publishedAt)
        : formatRFC822Date(new Date());

      const imageUrl = item.imageUrl || null;
      const itemCategories = item.categories || [];

      rssXml += `<item>
<title><![CDATA[${title}]]></title>
<link>${escapeXml(link)}</link>
<guid isPermaLink="${isGuidUrl ? "true" : "false"}">${escapeXml(guid)}</guid>
<description><![CDATA[${description}]]></description>
<pubDate>${pubDate}</pubDate>
`;

      for (const cat of itemCategories) {
        const catInfo = CATEGORY_LABELS[cat];
        if (catInfo) {
          rssXml += `<category>${escapeXml(catInfo.title)}</category>
`;
        }
      }

      if (imageUrl) {
        rssXml += `<media:content url="${escapeXml(imageUrl)}" type="image/jpeg" width="1000" height="1000"/>
`;
      }

      rssXml += `</item>
`;
    }

    rssXml += `</channel>
</rss>`;

    res.set("Content-Type", "application/rss+xml; charset=utf-8");
    res.send(rssXml);
  } catch (error) {
    console.error("Error generating RSS feed:", error);
    res.set("Content-Type", "application/rss+xml; charset=utf-8");
    res.status(500).send(
      `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:media="http://search.yahoo.com/mrss/" xmlns:atom="http://www.w3.org/2005/Atom" version="2.0">
<channel>
<title>Error</title>
<description>Error generating RSS feed: ${escapeXml(error.message)}</description>
</channel>
</rss>`
    );
  }
};

// ---------------- API 6: JSON News Feed ----------------
exports.getNewsJSON = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      category,
      language,
      source,
      search,
    } = req.query;

    const collection = await getCollection("processed_news_data");
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = {};
    if (category) query.categories = category;
    if (language) query.language = language;
    if (source) query.sourceName = source;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { rewrittenDescription: { $regex: search, $options: "i" } },
        { originalDescription: { $regex: search, $options: "i" } },
      ];
    }

    const news = await collection
      .find(query)
      .sort({ publishedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .toArray();

    const total = await collection.countDocuments(query);

    const formattedNews = news.map((item) => ({
      id: item._id.toString(),
      title: item.title,
      originalTitle: item.originalTitle,
      description: item.rewrittenDescription || item.originalDescription,
      image: item.imageUrl,
      source: item.sourceName,
      publishedAt: item.publishedAt,
      categories: item.categories || [],
      language: item.language,
      originalLink: item.originalLink,
    }));

    return res.status(200).json({
      success: true,
      news: formattedNews,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Error in getNewsJSON:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching news",
      error: error.message,
    });
  }
};

// ---------------- API 7: getRealRSS (Keep from old code) ----------------
exports.getRealRSS = async (req, res) => {
  try {
    const { limit = 50, source } = req.query;

    const sourcesToFetch = source
      ? RSS_SOURCES.filter((s) =>
          s.name.toLowerCase().includes(source.toLowerCase())
        )
      : RSS_SOURCES;

    console.log(`[Real RSS] Fetching from ${sourcesToFetch.length} sources...`);

    const feedPromises = sourcesToFetch.map(async (src) => {
      try {
        console.log(`[Real RSS] Fetching: ${src.name} - ${src.url}`);
        const feed = await parser.parseURL(src.url);
        return { source: src.name, feed, error: null };
      } catch (error) {
        console.error(`[Real RSS] Error fetching ${src.name}:`, error.message);
        return { source: src.name, feed: null, error: error.message };
      }
    });

    const results = await Promise.all(feedPromises);

    let allItems = [];
    results.forEach((result) => {
      if (result.feed && result.feed.items) {
        result.feed.items.forEach((item) => {
          allItems.push({
            ...item,
            sourceName: result.source,
          });
        });
      }
    });

    allItems.sort((a, b) => {
      const dateA = a.pubDate ? new Date(a.pubDate) : new Date(0);
      const dateB = b.pubDate ? new Date(b.pubDate) : new Date(0);
      return dateB - dateA;
    });

    allItems = allItems.slice(0, parseInt(limit));

    const baseUrl = getBaseUrl(req);
    const rssUrl = `${baseUrl}${req.originalUrl}`;

    const channelTitle = "Real Marathi News Feed";
    const channelDescription = "Direct feed from multiple Marathi news sources";
    const channelLink = `${baseUrl}/real/news/rss`;

    let rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:media="http://search.yahoo.com/mrss/" xmlns:atom="http://www.w3.org/2005/Atom" version="2.0">
<channel>
<title><![CDATA[${channelTitle}]]></title>
<link>${escapeXml(channelLink)}</link>
<atom:link href="${escapeXml(rssUrl)}" rel="self" type="application/rss+xml"/>
<description>
<![CDATA[${channelDescription}]]>
</description>
<language>mr</language>
<lastBuildDate>${formatRFC822Date(new Date())}</lastBuildDate>
<pubDate>${formatRFC822Date(new Date())}</pubDate>
<image>
<title><![CDATA[${channelTitle}]]></title>
<url>${escapeXml(baseUrl)}/logo.png</url>
<link>${escapeXml(channelLink)}</link>
</image>
`;

    for (const item of allItems) {
      const title = (item.title || "").trim();
      const link = item.link || "";
      const guid = link;
      const isGuidUrl = isValidUrl(guid);

      let description = "";
      if (item["content:encoded"]) {
        description = item["content:encoded"];
      } else if (item.content) {
        description = item.content;
      } else if (item.contentSnippet) {
        description = item.contentSnippet;
      } else if (item.description) {
        description = item.description;
      }

      if (description.includes("<") && !description.includes("<p>")) {
        description = cleanDescription(description);
      }

      const pubDate = item.pubDate
        ? formatRFC822Date(new Date(item.pubDate))
        : formatRFC822Date(new Date());

      let imageUrl = null;
      if (item["content:encoded"]) {
        const imgMatch = item["content:encoded"].match(
          /<img[^>]+src=["']([^"']+)["']/i
        );
        if (imgMatch && imgMatch[1]) imageUrl = imgMatch[1];
      }
      if (!imageUrl && item.content) {
        const imgMatch = item.content.match(/<img[^>]+src=["']([^"']+)["']/i);
        if (imgMatch && imgMatch[1]) imageUrl = imgMatch[1];
      }
      if (!imageUrl && item["media:content"]) {
        imageUrl = item["media:content"]?.url || item["media:content"]?.$?.url;
      }
      if (!imageUrl && item["media:thumbnail"]) {
        imageUrl =
          item["media:thumbnail"]?.url || item["media:thumbnail"]?.$?.url;
      }
      if (!imageUrl && item.enclosure) {
        imageUrl = item.enclosure.url;
      }

      rssXml += `<item>
<title>
<![CDATA[${title}]]>
</title>
<link>${escapeXml(link)}</link>
<guid isPermaLink="${isGuidUrl ? "true" : "false"}">${escapeXml(guid)}</guid>
<atom:link href="${escapeXml(link)}"/>
<description>
<![CDATA[${description}]]>
</description>
<pubDate>${pubDate}</pubDate>
`;

      if (imageUrl) {
        rssXml += `<media:content url="${escapeXml(imageUrl)}" type="image/jpeg" width="1000" height="1000"/>
`;
      }

      rssXml += `</item>
`;
    }

    rssXml += `</channel>
</rss>`;

    res.set("Content-Type", "application/rss+xml; charset=utf-8");
    res.send(rssXml);
  } catch (error) {
    console.error("Error generating Real RSS:", error);
    res.status(500).send("Error generating RSS feed");
  }
};
