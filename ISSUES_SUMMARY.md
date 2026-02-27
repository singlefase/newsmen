# Issues Summary - APIs 3, 4, 5 for WordPress Aggregator

## 🎯 Requirements

1. ✅ **Marathi News Only** - All content must be in Marathi
2. ✅ **Full Content** - Keep full articles from RSS (not 60-80 word summaries)
3. ✅ **Title Rewriting** - Improve and rewrite titles
4. ✅ **19 Fixed Categories** - Multi-category support (news can belong to multiple categories)
5. ✅ **Efficient Category Queries** - Support single and multiple category filtering
6. ✅ **Automatic Continuous Feed** - For WordPress aggregator

---

## 🔴 CRITICAL ISSUES (Must Fix)

### 1. Content Shortened to 60-80 Words ❌
- **Current**: AI prompt says "60-80 शब्दांत" (60-80 words)
- **Problem**: Only summaries stored, not full articles
- **Required**: Rewrite full content while maintaining similar length
- **Code Location**: `controllers/v1NewsController.js` line 109

### 2. Title NOT Being Rewritten ❌
- **Current**: Title passed through unchanged (line 577)
- **Problem**: No title improvement/optimization
- **Required**: Create `rewriteTitle()` function
- **Code Location**: `controllers/v1NewsController.js` line 577

### 3. No Marathi Language Filtering ❌
- **Current**: No filtering in API 3, language hardcoded in API 4
- **Problem**: Non-Marathi content may slip through
- **Required**: Filter Marathi-only content in API 3, verify in API 4
- **Code Location**: API 3 (no filtering), API 4 line 591

### 4. No Multi-Category Support ❌
- **Current**: Single `category: "general"` field
- **Problem**: Cannot assign multiple categories to news
- **Required**: 
  - Store `categories: ["pune", "political", "maharastra"]` array
  - Store `primaryCategory: "pune"` for sorting
  - Support 19 fixed categories
- **Code Location**: API 3 (no category), API 4 line 592

### 5. No Category-Specific RSS Feeds ❌
- **Current**: Only one generic RSS feed endpoint
- **Problem**: Cannot create separate feeds per category
- **Required**: 
  - 19 category-specific endpoints: `/api/v1/rss-feed/sports`, `/api/v1/rss-feed/pune`, etc.
  - Multi-category queries: `?categories=sports,political` (OR) or `?categories=sports+political` (AND)
- **Code Location**: `controllers/v1NewsController.js` line 639

### 6. No Automatic Scheduling ❌
- **Current**: All APIs are manual (require HTTP calls)
- **Problem**: WordPress aggregator won't get automatic updates
- **Required**: Automatic scheduling (cron jobs)
  - API 3: Every 25 minutes
  - API 4: Every 1 minute
  - API 5: Always available (auto-updates)

---

## 📋 Fixed Categories (19 Total)

### Location Categories (8):
1. **desh** (देश)
2. **videsh** (विदेश)
3. **maharastra** (महाराष्ट्र)
4. **pune** (पुणे)
5. **mumbai** (मुंबई)
6. **nashik** (नाशिक)
7. **ahmednagar** (अहमदनगर/अहिल्यानगर)
8. **aurangabad** (औरंगाबाद/संभाजीनगर)

### Topic Categories (11):
9. **political** (राजकारण)
10. **sports** (क्रीडा)
11. **entertainment** (मनोरंजन)
12. **tourism** (पर्यटन)
13. **lifestyle** (जीवनशैली)
14. **agriculture** (शेती)
15. **government** (सरकार)
16. **trade** (व्यापार)
17. **health** (आरोग्य)
18. **horoscope** (भविष्य)

---

## 📊 Database Schema Changes Required

### Current Schema (WRONG):
```javascript
// unprocessed_news_data
{
  // ... fields
  // NO category field
}

// processed_news_data
{
  title: String,                    // Original (not rewritten)
  rewrittenDescription: String,     // Only 60-80 words
  category: "general",              // Single category only
  language: "mr",                   // Hardcoded
  // ...
}
```

### Required Schema (CORRECT):
```javascript
// unprocessed_news_data
{
  // ... existing fields
  categories: [String],            // ["pune", "political", "maharastra"]
  primaryCategory: String,         // "pune"
  originalFullContent: String,     // Complete RSS content
  isMarathi: Boolean,              // Verified Marathi content
}

// processed_news_data
{
  originalTitle: String,            // Original title from RSS
  rewrittenTitle: String,           // Improved/rewritten title
  originalFullContent: String,      // Complete original content
  rewrittenFullContent: String,     // Full rewritten article (similar length)
  originalDescription: String,      // Original summary (for reference)
  categories: [String],            // ["pune", "political", "maharastra"]
  primaryCategory: String,         // "pune"
  language: "mr",                   // Verified Marathi
  // ... other fields
}
```

---

## 🔧 Required Code Changes

### API 3 Changes:
1. ✅ Add Marathi language filtering (use `isProperMarathi()`)
2. ✅ Store full content from RSS (not just snippets)
3. ✅ Detect multiple categories from title/description
4. ✅ Store `categories` array and `primaryCategory`
5. ✅ Use keyword mapping for category detection

### API 4 Changes:
1. ✅ Change AI prompt from "60-80 words" to "full content"
2. ✅ Create `rewriteTitle()` function
3. ✅ Verify Marathi content before processing
4. ✅ Store `originalTitle` and `rewrittenTitle`
5. ✅ Store `originalFullContent` and `rewrittenFullContent`
6. ✅ Refine/classify categories if not set in API 3
7. ✅ Store `categories` array and `primaryCategory`

### API 5 Changes:
1. ✅ Support single category: `?category=sports`
2. ✅ Support multiple categories (OR): `?categories=sports,political`
3. ✅ Support multiple categories (AND): `?categories=sports+political`
4. ✅ Create 19 category-specific endpoints
5. ✅ Category-specific channel titles/descriptions
6. ✅ Efficient MongoDB queries using `$in` (OR) and `$all` (AND)

### Infrastructure Changes:
1. ✅ Implement automatic scheduling (cron jobs)
2. ✅ Create category detection service
3. ✅ Add MongoDB indexes for `categories` array
4. ✅ Create category keyword mapping configuration

---

## 📝 MongoDB Indexes Required

```javascript
// For efficient category queries
db.processed_news_data.createIndex({ categories: 1, publishedAt: -1 })
db.processed_news_data.createIndex({ primaryCategory: 1, publishedAt: -1 })
db.unprocessed_news_data.createIndex({ categories: 1, fetchedAt: 1 })
db.unprocessed_news_data.createIndex({ isMarathi: 1, processed: 1 })
```

---

## 🎯 Expected RSS Feed Endpoints

### Category-Specific Endpoints (19):
```
/api/v1/rss-feed/desh
/api/v1/rss-feed/videsh
/api/v1/rss-feed/maharastra
/api/v1/rss-feed/pune
/api/v1/rss-feed/mumbai
/api/v1/rss-feed/nashik
/api/v1/rss-feed/ahmednagar
/api/v1/rss-feed/aurangabad
/api/v1/rss-feed/political
/api/v1/rss-feed/sports
/api/v1/rss-feed/entertainment
/api/v1/rss-feed/tourism
/api/v1/rss-feed/lifestyle
/api/v1/rss-feed/agriculture
/api/v1/rss-feed/government
/api/v1/rss-feed/trade
/api/v1/rss-feed/health
/api/v1/rss-feed/horoscope
```

### Multi-Category Query Support:
```
/api/v1/rss-feed?category=sports (single)
/api/v1/rss-feed?categories=sports,political (OR - news in either)
/api/v1/rss-feed?categories=sports+political (AND - news in both)
/api/v1/rss-feed?categories=pune,political (Pune OR Political)
/api/v1/rss-feed?categories=pune+political (Pune AND Political)
```

---

## 📚 Documentation Files

1. **API_3_4_5_ISSUES_ANALYSIS.md** - Detailed issues analysis
2. **CATEGORY_KEYWORDS_MAPPING.md** - Category keywords and detection logic
3. **ARCHITECTURE_PROPOSAL.md** - Original architecture (updated)
4. **IMPLEMENTATION_SUMMARY.md** - Implementation summary (updated)

---

## ✅ Next Steps

1. **Review all issues** - Confirm understanding
2. **Decide implementation order** - What to fix first?
3. **Approve changes** - Give go-ahead to implement
4. **Implementation** - Start fixing issues

---

**Document Created:** 2026-02-12  
**Status:** ⚠️ Issues Identified - Awaiting Approval to Implement
