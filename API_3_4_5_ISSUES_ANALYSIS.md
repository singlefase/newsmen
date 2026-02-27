# API 3, 4, 5 - Issues Analysis for WordPress Aggregator RSS Feed

## Overview
Analysis of APIs 3, 4, and 5 for creating automatic continuous RSS feeds for WordPress aggregators with different news sections (sports, politics, general, etc.).

**IMPORTANT REQUIREMENTS:**
- ✅ **Marathi News Only** - All news must be in Marathi language
- ✅ **Full Content** - Keep full content from RSS (not shortened summaries)
- ✅ **Title Rewriting** - Improve and rewrite titles for better readability
- ✅ **Category-Based Feeds** - Separate feeds for Sports, Politics, General, etc.

---

## 🔴 CRITICAL ISSUES

### 1. **Content is Being Shortened (60-80 words) Instead of Full Content**

**Problem:**
- API 4: Uses `rewriteMarathiInshortsStyle()` which creates **60-80 word summaries** (line 109)
- Prompt explicitly says: "खालील बातमी 60-80 शब्दांत" (Rewrite in 60-80 words)
- Only stores `rewrittenDescription` (short summary), not full content
- Original full content from RSS is lost or truncated

**Current Behavior:**
```javascript
// Line 109: rewriteMarathiInshortsStyle prompt
"खालील बातमी 60-80 शब्दांत, लहान, सोपी आणि तथ्यात्मक पद्धतीने पुन्हा लिहा."

// Line 578: Only stores shortened version
rewrittenDescription: rewrittenDescription, // 60-80 words only
```

**Impact:**
- WordPress aggregator gets shortened content, not full articles
- Users see incomplete news stories
- RSS feed doesn't contain full content from original sources
- Not suitable for full-content aggregation

**Solution Needed:**
- Change AI prompt to rewrite **FULL CONTENT** while maintaining clarity
- Store both `rewrittenDescription` (full rewritten content) AND `originalFullContent`
- Ensure rewritten content is similar length to original (not shortened)
- Keep all important details from original RSS content

---

### 2. **Title is NOT Being Rewritten**

**Problem:**
- API 4: Title is **passed through unchanged** (line 577: `title: unprocessedNews.title`)
- No title rewriting/improvement happening
- Titles may be too long, unclear, or not optimized

**Current Behavior:**
```javascript
// Line 577: Title not rewritten
title: unprocessedNews.title, // Original title passed through

// Line 558: Only description is rewritten
rewrittenDescription = await rewriteMarathiInshortsStyle({
  title: unprocessedNews.title, // Used in prompt but not rewritten
  summary: unprocessedNews.description,
  source: unprocessedNews.sourceName,
});
```

**Impact:**
- Titles remain as-is from RSS sources
- No optimization for readability
- Titles may be too long or unclear
- Missing opportunity to improve user experience

**Solution Needed:**
- Create separate function: `rewriteTitle()` or include in main rewrite
- Rewrite title to be: Clear, Concise, SEO-friendly, Better formatted
- Store both `originalTitle` and `rewrittenTitle`
- Use rewritten title in RSS feed

---

### 3. **No Marathi Language Filtering**

**Problem:**
- API 3: No Marathi language detection/filtering
- API 4: Language hardcoded to "mr" but doesn't verify content is Marathi
- Non-Marathi news might slip through

**Current Behavior:**
```javascript
// API 3: No language check
// API 4: Line 591
language: "mr", // Default to Marathi (but doesn't verify)
```

**Impact:**
- English or other language news might be included
- Not truly "Marathi only" feed
- Mixed language content in RSS feed

**Solution Needed:**
- Add Marathi language detection in API 3 (before storing)
- Filter out non-Marathi content
- Verify Marathi content in API 4 before processing
- Use existing `isProperMarathi()` function or improve it
- Store only Marathi news in both collections

---

### 4. **No Multi-Category Detection/Classification**

**Problem:**
- API 3: News is stored in `unprocessed_news_data` but **NO categories field is stored**
- API 4: Category is **hardcoded to "general"** (line 592: `category: "general"`)
- API 5: Can filter by single category, but doesn't support multiple categories
- Current schema uses single `category` field, not `categories` array

**Impact:**
- Cannot assign multiple categories to news (e.g., Pune + Political + Maharashtra)
- Cannot create category-specific RSS feeds
- Cannot query by multiple categories efficiently
- WordPress aggregator cannot subscribe to category-specific feeds
- All news appears in one feed regardless of topic

**Solution Needed:**
- Implement **multi-category detection** from title/description
- Use fixed category list: desh, videsh, maharastra, pune, mumbai, nashik, ahmednagar, aurangabad, political, sports, entertainment, tourism, lifestyle, agriculture, government, trade, health, horoscope
- Store `categories` array in both `unprocessed_news_data` and `processed_news_data`
- Store `primaryCategory` (main category) for sorting/display
- Use hybrid approach: Location detection + Topic detection + AI classification
- Support efficient querying: single category, multiple categories (OR), multiple categories (AND)

---

### 5. **No Category-Specific RSS Feeds (Multi-Category Support)**

**Problem:**
- API 5 generates only ONE RSS feed endpoint: `/api/v1/rss-feed`
- WordPress aggregators need separate feeds for each category:
  - `/api/v1/rss-feed/sports`
  - `/api/v1/rss-feed/political`
  - `/api/v1/rss-feed/pune`
  - `/api/v1/rss-feed/mumbai`
  - `/api/v1/rss-feed/maharastra`
  - etc. (19 category feeds)
- No support for multiple categories in single query
- Cannot query: `/api/v1/rss-feed?categories=sports,political` (news in either)
- Cannot query: `/api/v1/rss-feed?categories=sports+political` (news in both)

**Impact:**
- Cannot have separate WordPress aggregator subscriptions for different categories
- Users get all news mixed together
- No way to organize content by topic or location
- Cannot create combined category feeds

**Solution Needed:**
- Create category-specific RSS feed endpoints for all 19 categories
- Support multiple category queries:
  - Single: `/api/v1/rss-feed?category=sports`
  - Multiple (OR): `/api/v1/rss-feed?categories=sports,political` (news in sports OR political)
  - Multiple (AND): `/api/v1/rss-feed?categories=sports+political` (news in sports AND political)
- Each feed should have category-specific channel title/description
- Example: 
  - Sports feed: "Sports News Feed | क्रीडा बातम्या"
  - Pune feed: "Pune News Feed | पुणे बातम्या"
  - Pune + Political: "Pune Political News | पुणे राजकीय बातम्या"

---

### 6. **No Automatic Continuous Processing**

**Problem:**
- APIs 3, 4, 5 are **manual** - must be called via HTTP requests
- No automatic scheduling/cron jobs
- No continuous feed updates

**Impact:**
- WordPress aggregator won't get new content automatically
- Requires manual API calls every 25 minutes (API 3) and 1 minute (API 4)
- Not suitable for production WordPress aggregator setup

**Solution Needed:**
- Implement automatic scheduling (cron jobs or background workers)
- API 3: Auto-fetch every 25 minutes
- API 4: Auto-process every 1 minute
- API 5: Auto-updates when new content is processed

---

### 7. **Fixed Limit in API 3**

**Problem:**
- API 3 has hardcoded default `limit = 6` (line 401)
- Only fetches 6 news items per call
- May not be enough for continuous feed

**Impact:**
- Slow content generation
- May run out of content if processing is faster than fetching
- Not scalable for high-volume feeds

**Solution Needed:**
- Make limit configurable per category
- Different limits for different categories (e.g., Sports: 10, Politics: 15)
- Or remove limit and fetch all new items from sources

---

### 8. **No Category-Based RSS Source Selection**

**Problem:**
- API 3 fetches from all 4 sources regardless of category
- All sources may not have category-specific feeds
- No way to prioritize sources by category

**Impact:**
- Sports news might come from sources that don't specialize in sports
- Politics news mixed with entertainment
- Lower quality category-specific content

**Solution Needed:**
- Map RSS sources to categories
- Example: Sports sources, Politics sources, General sources
- Or fetch from category-specific RSS URLs if available

---

## 🟡 MEDIUM PRIORITY ISSUES

### 9. **Language Hardcoded (But Needs Verification)**

**Problem:**
- API 4: Language hardcoded to "mr" (Marathi) (line 591)
- No verification that content is actually Marathi
- May mark non-Marathi content as Marathi

**Impact:**
- Non-Marathi content might be marked as Marathi
- Need to verify Marathi content before processing
- Should filter out non-Marathi in API 3

**Solution Needed:**
- Verify Marathi content using `isProperMarathi()` function
- Filter non-Marathi content in API 3 before storing
- Only process Marathi content in API 4
- Store verified language in processed_news_data

---

### 10. **Generic Channel Metadata**

**Problem:**
- API 5: Channel title is always "News Feed" (line 658)
- Channel description is always "Latest news feed" (line 659)
- Not category-specific

**Impact:**
- WordPress aggregator shows generic feed name
- Users can't distinguish between category feeds
- Poor user experience

**Solution Needed:**
- Category-specific channel titles:
  - Sports: "Sports News Feed"
  - Politics: "Politics News Feed"
  - General: "General News Feed"
- Category-specific descriptions

---

### 11. **No Feed Update Frequency Metadata**

**Problem:**
- RSS feed doesn't include `<ttl>` (time to live) element
- No `<sy:updatePeriod>` or `<sy:updateFrequency>` for WordPress aggregators
- Aggregators don't know how often to check for updates

**Impact:**
- WordPress aggregator may check too frequently or too rarely
- Wasted resources or delayed updates

**Solution Needed:**
- Add `<ttl>` element (e.g., 60 minutes)
- Add `<sy:updatePeriod>` and `<sy:updateFrequency>` for better aggregator support

---

### 12. **No Error Recovery Mechanism**

**Problem:**
- If API 3 fails for one source, it continues but doesn't retry
- If API 4 fails (AI error), news stays unprocessed forever
- No queue or retry mechanism

**Impact:**
- Lost news items
- Unprocessed news accumulates
- Feed may have gaps

**Solution Needed:**
- Retry mechanism for failed fetches
- Queue system for failed processing
- Dead letter queue for permanently failed items

---

### 13. **No Duplicate Detection Across Categories**

**Problem:**
- Same news might appear in multiple categories
- No cross-category duplicate detection
- Could have same story in Sports and General

**Impact:**
- Duplicate content in different category feeds
- User sees same news multiple times

**Solution Needed:**
- Track processed news globally (not just per source)
- Prevent same link from appearing in multiple categories
- Or allow same news in multiple categories if it's truly relevant

---

## 🟢 MINOR ISSUES / ENHANCEMENTS

### 11. **No Feed Statistics/Monitoring**

**Problem:**
- No way to track:
  - How many items per category
  - Processing success rate
  - Feed update frequency
  - Last update time per category

**Solution Needed:**
- Add statistics endpoint
- Track feed health per category
- Monitor processing pipeline

---

### 12. **No Feed Customization**

**Problem:**
- Cannot customize:
  - Items per feed (always uses limit parameter)
  - Sort order (always newest first)
  - Date range filtering

**Solution Needed:**
- Allow more query parameters
- Custom sort options
- Date range filtering

---

### 13. **No Category Validation**

**Problem:**
- No validation that category exists
- Invalid category returns empty feed (no error)
- No list of available categories

**Solution Needed:**
- Validate category parameter
- Return error for invalid categories
- Provide list of available categories

---

## 📋 FIXED CATEGORIES (MULTI-CATEGORY SUPPORT)

**IMPORTANT:** Each news can belong to **ONE OR MORE categories**. News must be stored to support efficient querying by single or multiple categories.

### Fixed Category List (19 Categories):
1. **desh** (देश) - National/Country news
2. **videsh** (विदेश) - International/Foreign news
3. **maharastra** (महाराष्ट्र) - Maharashtra state news
4. **pune** (पुणे) - Pune city news
5. **mumbai** (मुंबई) - Mumbai city news
6. **nashik** (नाशिक) - Nashik city news
7. **ahmednagar** (अहमदनगर/अहिल्यानगर) - Ahmednagar/Ahilyanagar news
8. **aurangabad** (औरंगाबाद/संभाजीनगर) - Aurangabad/Sambhajinagar news
9. **political** (राजकारण) - Political news
10. **sports** (क्रीडा) - Sports news
11. **entertainment** (मनोरंजन) - Entertainment news
12. **tourism** (पर्यटन) - Tourism news
13. **lifestyle** (जीवनशैली) - Lifestyle news
14. **agriculture** (शेती) - Agriculture news
15. **government** (सरकार) - Government news
16. **trade** (व्यापार) - Trade/Business news
17. **health** (आरोग्य) - Health news
18. **horoscope** (भविष्य) - Horoscope/Astrology news

### Multi-Category Requirements:
- ✅ **One news can belong to multiple categories**
  - Example: A Pune political news → `["pune", "political", "maharastra"]`
  - Example: A Maharashtra sports news → `["sports", "maharastra"]`
- ✅ **Efficient querying needed**
  - Single category: `/api/v1/rss-feed?category=sports`
  - Multiple categories: `/api/v1/rss-feed?categories=sports,political`
  - Multiple categories (OR): `/api/v1/rss-feed?categories=sports|political` (news in either)
  - Multiple categories (AND): `/api/v1/rss-feed?categories=sports+political` (news in both)

### Database Schema for Multi-Category:

#### Current Schema (WRONG):
```javascript
{
  category: "general", // Single category only
  // ...
}
```

#### Required Schema (CORRECT):
```javascript
{
  categories: ["pune", "political", "maharastra"], // Array of categories
  primaryCategory: "pune", // Main category (for sorting/display)
  // ... other fields
}
```

### Category Detection Methods:
1. **Location-Based Detection:**
   - Keywords: "पुणे", "मुंबई", "नाशिक" → Location categories
   - "महाराष्ट्र" → maharastra category
   - "देश" → desh category
   - "विदेश" → videsh category

2. **Topic-Based Detection:**
   - Keywords: "राजकारण", "आमदार", "मंत्री" → political
   - Keywords: "क्रीडा", "खेळ", "स्पोर्ट्स" → sports
   - Keywords: "मनोरंजन", "चित्रपट" → entertainment
   - Keywords: "शेती", "पिक" → agriculture
   - Keywords: "आरोग्य", "रुग्णालय" → health
   - Keywords: "भविष्य", "राशी" → horoscope

3. **AI Classification:**
   - Use Gemini to classify news into multiple categories
   - Prompt: "खालील बातमी कोणत्या श्रेणींमध्ये येते? (एक किंवा अधिक)"

4. **Hybrid Approach (Recommended):**
   - Location detection (automatic from keywords)
   - Topic detection (keyword matching)
   - AI classification (for complex cases)
   - Combine all results into categories array

---

## 🔧 REQUIRED CHANGES SUMMARY

### API 3 Changes:
1. ✅ **Add Marathi language filtering** - Filter out non-Marathi content
2. ✅ **Store full content** - Store complete RSS content (not just snippets)
3. ✅ **Multi-category detection** - Detect multiple categories from title/description
4. ✅ **Store categories array** - Store `categories: ["pune", "political"]` in `unprocessed_news_data`
5. ✅ **Store primaryCategory** - Store main category for sorting
6. ✅ Use fixed category list (19 categories)
7. ✅ Hybrid detection: Location + Topic + AI classification
8. ✅ Support category-based source selection (optional)
9. ✅ Make limit configurable per category
10. ✅ Add category parameter to API (for filtering during fetch)

### API 4 Changes:
1. ✅ **Rewrite FULL CONTENT** - Change from 60-80 words to full content rewriting
2. ✅ **Rewrite Title** - Create title rewriting function
3. ✅ **Verify Marathi** - Ensure content is Marathi before processing
4. ✅ Store both `originalTitle` and `rewrittenTitle`
5. ✅ Store both `originalFullContent` and `rewrittenFullContent`
6. ✅ **Multi-category detection** - Detect/refine categories if not set in API 3
7. ✅ **Store categories array** - Store `categories: ["pune", "political"]` in `processed_news_data`
8. ✅ **Store primaryCategory** - Store main category
9. ✅ Verify language is Marathi (not just hardcode "mr")
10. ✅ Use AI for category classification if needed

### API 5 Changes:
1. ✅ **Support single category** - `/api/v1/rss-feed?category=sports`
2. ✅ **Support multiple categories (OR)** - `/api/v1/rss-feed?categories=sports,political` (news in either)
3. ✅ **Support multiple categories (AND)** - `/api/v1/rss-feed?categories=sports+political` (news in both)
4. ✅ **Category-specific endpoints** - `/api/v1/rss-feed/sports`, `/api/v1/rss-feed/pune`, etc.
5. ✅ **Category-specific channel titles/descriptions** - Based on category(ies)
6. ✅ **Efficient MongoDB queries** - Use `$in` for OR, `$all` for AND
7. ✅ Add RSS metadata (`<ttl>`, `<sy:updatePeriod>`)
8. ✅ Validate category parameter against fixed list
9. ✅ Return error for invalid categories
10. ✅ Support `primaryCategory` for sorting within category feeds

### Infrastructure Changes:
1. ✅ Implement automatic scheduling (cron/background jobs)
2. ✅ Add multi-category detection service/function
3. ✅ Create category mapping configuration (19 fixed categories)
4. ✅ Create category keyword mapping (location + topic keywords)
5. ✅ Add MongoDB indexes for efficient category queries:
   - Index on `categories` array field
   - Index on `primaryCategory`
   - Compound index: `categories + publishedAt`
6. ✅ Add monitoring/statistics per category

---

## 🎯 WORDPRESS AGGREGATOR REQUIREMENTS

For WordPress aggregator to work properly, you need:

1. **Separate RSS Feeds per Category (19 feeds):**
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

2. **Multi-Category Query Support:**
   ```
   /api/v1/rss-feed?category=sports (single category)
   /api/v1/rss-feed?categories=sports,political (OR - news in either)
   /api/v1/rss-feed?categories=sports+political (AND - news in both)
   /api/v1/rss-feed?categories=pune,political (Pune OR Political)
   /api/v1/rss-feed?categories=pune+political (Pune AND Political)
   ```

2. **Automatic Updates:**
   - Feed should update automatically every 15-60 minutes
   - No manual intervention needed

3. **Valid RSS 2.0 Format:**
   - ✅ Already correct (fixed in previous update)
   - Add `<ttl>` for better aggregator support

4. **Consistent Content:**
   - Regular new items
   - No gaps in feed
   - Fresh content daily

5. **Category-Specific Metadata:**
   - Each feed should have unique title/description
   - Helps users identify feed purpose

---

## 📊 EXPECTED WORKFLOW

### Current (Manual):
```
1. Call API 3 → Fetch 6 news → Store in unprocessed_news_data (no Marathi filter, no category)
2. Call API 4 → Process 1 news → Rewrite to 60-80 words → Title unchanged → Store
3. Repeat step 2 for each news
4. Call API 5 → Generate single RSS feed
```

### Required (Automatic with Full Content & Multi-Category):
```
1. [Auto] API 3 every 25 min → Fetch news → Filter Marathi only → Detect MULTIPLE categories → Store FULL content with categories array
2. [Auto] API 4 every 1 min → Process 1 news → Rewrite FULL content → Rewrite title → Verify Marathi → Refine/classify categories → Store with categories array
3. [Auto] API 5 → Generate category-specific RSS feeds (19 feeds) + multi-category queries with FULL content (always available)
4. WordPress aggregator subscribes to category feeds:
   - Single: /api/v1/rss-feed/sports
   - Multiple (OR): /api/v1/rss-feed?categories=sports,entertainment
   - Multiple (AND): /api/v1/rss-feed?categories=pune+political
5. Aggregator checks feeds every 15-60 minutes automatically
6. Users get full Marathi news articles with improved titles, organized by categories
```

### Content Flow (with Multi-Category):
```
RSS Source (Full Article)
    ↓
API 3: Filter Marathi → Detect MULTIPLE categories → Store FULL content + categories array in unprocessed_news_data
    ↓
API 4: Rewrite FULL content (maintain length) → Rewrite title → Refine categories → Store in processed_news_data with categories array
    ↓
API 5: Generate RSS feed by category(ies) with FULL rewritten content + rewritten titles
    ↓
WordPress Aggregator: Gets full articles, organized by categories (single or multiple)
```

### Category Detection Flow:
```
News Title/Description
    ↓
Location Detection → ["pune", "maharastra"] (if location keywords found)
    ↓
Topic Detection → ["political"] (if topic keywords found)
    ↓
AI Classification → ["sports"] (if AI detects additional categories)
    ↓
Combine → categories: ["pune", "maharastra", "political"]
    ↓
Set primaryCategory → "pune" (most specific or first)
    ↓
Store in database
```

---

## ⚠️ PRIORITY FIXES

### Must Fix (Blocking):
1. **Full Content Rewriting** (API 4) - Change from 60-80 words to full content
2. **Title Rewriting** (API 4) - Currently not happening
3. **Marathi Language Filtering** (API 3 & 4) - Ensure only Marathi content
4. **Multi-Category Detection & Storage** (API 3 & 4) - Support multiple categories per news
5. **Category-Specific RSS Feeds** (API 5) - Support single and multiple category queries
6. **Efficient Multi-Category Queries** (API 5) - MongoDB queries for categories array
7. **Automatic Scheduling** (Infrastructure)

### Should Fix (Important):
4. Category-based source selection (API 3)
5. Category-specific channel metadata (API 5)
6. RSS metadata for aggregators (API 5)

### Nice to Have:
7. Language detection (API 4)
8. Statistics/monitoring
9. Error recovery mechanisms

---

## 📝 NEXT STEPS

1. **Review this analysis** - Confirm all issues identified
2. **Decide on category list** - Which categories do you want?
3. **Choose category detection method** - Keyword matching, AI, or hybrid?
4. **Plan implementation** - What to fix first?
5. **Implement changes** - After your approval

---

---

## 📝 CONTENT REQUIREMENTS SUMMARY

### Current Issues with Content:
1. ❌ **Content shortened to 60-80 words** (should be full content)
2. ❌ **Title not rewritten** (passed through unchanged)
3. ❌ **No Marathi filtering** (non-Marathi content may slip through)
4. ❌ **Only summary stored** (full content from RSS not preserved)

### Required Content Handling:
1. ✅ **Full Content Rewriting**: Rewrite entire article while maintaining similar length
2. ✅ **Title Rewriting**: Improve and optimize titles for better readability
3. ✅ **Marathi Only**: Filter and verify all content is Marathi
4. ✅ **Full Content Storage**: Store complete rewritten articles, not summaries

### AI Prompt Changes Needed:

#### Current Content Rewriting (WRONG):
```javascript
// Line 109: Current prompt
"खालील बातमी 60-80 शब्दांत, लहान, सोपी आणि तथ्यात्मक पद्धतीने पुन्हा लिहा."
// Result: Only 60-80 words (summary)
```

#### Required Content Rewriting (CORRECT):
```javascript
// New prompt needed
"खालील संपूर्ण बातमी पुन्हा लिहा. मूळ लांबी जवळजवळ कायम ठेवा. 
सर्व महत्त्वाची माहिती समाविष्ट करा. फक्त स्पष्ट आणि वाचनीय करा."
// Result: Full article rewritten (similar length to original)
```

#### Current Title Handling (WRONG):
```javascript
// Line 577: Title not rewritten
title: unprocessedNews.title, // Passed through unchanged
```

#### Required Title Rewriting (CORRECT):
```javascript
// New function needed: rewriteTitle()
// Prompt: "खालील शीर्षक सुधारून, स्पष्ट आणि आकर्षक करा"
// Store: originalTitle and rewrittenTitle
```

### Database Schema Changes Needed:

#### Current `processed_news_data` Schema:
```javascript
{
  title: String,                    // Original (not rewritten)
  rewrittenDescription: String,     // Only 60-80 words
  originalDescription: String,       // Original summary
  // Missing: originalFullContent
  // Missing: rewrittenFullContent
  // Missing: rewrittenTitle
}
```

#### Required `processed_news_data` Schema:
```javascript
{
  originalTitle: String,            // Original title from RSS
  rewrittenTitle: String,           // Improved/rewritten title
  originalFullContent: String,      // Complete original content from RSS
  rewrittenFullContent: String,     // Full rewritten article (similar length)
  originalDescription: String,      // Original summary (for reference)
  
  // Multi-category support
  categories: [String],            // Array: ["pune", "political", "maharastra"]
  primaryCategory: String,         // Main category: "pune" (for sorting)
  
  // ... other fields
}
```

#### Required `unprocessed_news_data` Schema:
```javascript
{
  // ... existing fields
  
  // Multi-category support
  categories: [String],            // Array: ["pune", "political"] (detected in API 3)
  primaryCategory: String,         // Main category
  
  // ... other fields
}
```

### Content Length Comparison:

| Stage | Current | Required |
|-------|---------|----------|
| RSS Source | Full article (500-2000 words) | Full article (500-2000 words) |
| API 3 Storage | Full content stored ✅ | Full content stored ✅ |
| API 4 Rewriting | 60-80 words ❌ | Full article (500-2000 words) ✅ |
| API 5 RSS Feed | 60-80 words ❌ | Full article (500-2000 words) ✅ |

### Title Comparison:

| Stage | Current | Required |
|-------|---------|----------|
| RSS Source | "47 वर्षांपूर्वी कॅमेऱ्यासमोर..." | "47 वर्षांपूर्वी कॅमेऱ्यासमोर..." |
| API 4 Processing | Same (not rewritten) ❌ | Improved/rewritten ✅ |
| API 5 RSS Feed | Same (not rewritten) ❌ | Improved/rewritten ✅ |

### Example:

**Original RSS Title:**
```
"47 वर्षांपूर्वी कॅमेऱ्यासमोर पहिल्यांदा आलेला हा सुपरस्टार, ज्याने 'बॉर्डर 2'च्या वादळात दिला 300 कोटींचा चित्रपट"
```

**Rewritten Title (Expected):**
```
"चिरंजीवी: 47 वर्षांच्या करिअरमधून 300 कोटींचा 'बॉर्डर 2' चित्रपट"
```
(Shorter, clearer, more engaging)

---

## 🔍 DETAILED CODE ANALYSIS

### API 4 - Content Rewriting Function:

**Current Implementation (Line 97-137):**
```javascript
async function rewriteMarathiInshortsStyle({ title, summary, source }) {
  const prompt = `
  खालील बातमी 60-80 शब्दांत, लहान, सोपी आणि तथ्यात्मक पद्धतीने पुन्हा लिहा.
  // ... 60-80 words instruction
  `;
  // Returns: 60-80 word summary
}
```

**Issues:**
1. ❌ Explicitly limits to 60-80 words
2. ❌ Only receives `summary`, not full content
3. ❌ Title is in prompt but not rewritten
4. ❌ Returns shortened version

**Required Changes:**
1. ✅ Change function name: `rewriteMarathiFullContent()`
2. ✅ Accept full content, not just summary
3. ✅ Remove word limit from prompt
4. ✅ Add instruction to maintain similar length
5. ✅ Create separate `rewriteTitle()` function

### API 4 - Title Handling:

**Current Implementation (Line 577):**
```javascript
title: unprocessedNews.title, // Not rewritten
```

**Required Implementation:**
```javascript
// Rewrite title first
const rewrittenTitle = await rewriteTitle(unprocessedNews.title);

// Then store both
originalTitle: unprocessedNews.title,
rewrittenTitle: rewrittenTitle,
```

### API 3 - Marathi Filtering:

**Current Implementation:**
- No Marathi filtering in API 3
- All content stored regardless of language

**Required Implementation:**
```javascript
// Before storing in API 3
const title = item.title || "";
const description = item.description || "";
const text = `${title} ${description}`;

// Filter Marathi only
if (!isProperMarathi(text)) {
  console.log(`  ⏭️  Skipping non-Marathi: ${title.substring(0, 50)}...`);
  continue; // Skip non-Marathi content
}
```

---

**Document Created:** 2026-02-12  
**Last Updated:** 2026-02-12  
**Status:** ⚠️ Issues Identified - Awaiting Decision  
**Priority:** Content length and title rewriting are CRITICAL issues
