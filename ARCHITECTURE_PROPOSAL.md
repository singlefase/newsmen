# News Aggregation System Architecture Proposal

## Overview

This document outlines a 6-API news aggregation system that processes news from multiple RSS sources, rewrites content using AI, and serves it through various endpoints while maintaining legal compliance.

---

## System Architecture

### Data Flow Overview

```
Google News RSS → [API 1] → google_rss_news_legal (MongoDB)
                                    ↓
                            [API 2] → Filtered Legal News (JSON)

External RSS Sources → [API 3] → unprocessed_news_data (MongoDB)
                                        ↓
                                [API 4] → processed_news_data (MongoDB)
                                        ↓
                            [API 5] → Valid RSS Feed
                            [API 6] → JSON News Feed
```

---

## API 1: Google News RSS Fetcher & Storage

### Purpose
Fetch news from Google News RSS feeds and store in MongoDB with deduplication.

### Endpoint
`POST /api/v1/fetch-google-news` or `GET /api/v1/fetch-google-news` (scheduled)

### Functionality
1. **Fetch from Google News RSS**
   - Use existing RSS URL construction logic
   - Support query, language, country, category parameters
   - Apply existing filters (Marathi detection, allowed/blocked keywords)

2. **Deduplication Logic**
   - Check if news already exists in `google_rss_news_legal` collection
   - Use `link` field as unique identifier (primary)
   - Fallback: Use `title + source + publishedAt` as composite key
   - Only insert if news doesn't exist

3. **Storage Schema** (`google_rss_news_legal`)
   ```javascript
   {
     _id: ObjectId,
     title: String,
     originalSummary: String,
     source: String,
     link: String,                    // UNIQUE - used for deduplication
     imageUrl: String,                 // Inline URL from RSS (not downloaded)
     reporterName: String,
     publishedAt: Date,
     fetchedAt: Date,
     category: String,
     language: String,
     query: String,                    // Search query used
     // Legal compliance fields
     originalSource: String,
     hasOriginalLink: Boolean,
     isFromGoogleNews: Boolean
   }
   ```

4. **Filters Applied**
   - Marathi language detection (≥60% Marathi characters)
   - Allowed keywords filter (सरकार, राज्य, etc.)
   - Blocked keywords filter (खून, हत्या, etc.) - optional based on strictFilter
   - Category filtering

5. **Scheduling**
   - Called every 20 minutes
   - Use cron job or scheduler (node-cron)
   - Never delete old data - only append

### Key Points
- ✅ **No duplicates**: Check `link` field before insert
- ✅ **Preserve all data**: Never delete, only add
- ✅ **All filters**: Apply existing filtering logic
- ✅ **Legal compliance**: Store source attribution and original links

---

## API 2: Legal News Retrieval from Google News Collection

### Purpose
Retrieve and filter news from `google_rss_news_legal` collection with legal compliance features for Inshorts/Google News-like app.

### Endpoint
`GET /api/v1/google-news` or `GET /api/v1/google-news/legal`

### Functionality
1. **Query Parameters**
   - `page`: Pagination (default: 1)
   - `limit`: Items per page (default: 10)
   - `category`: Filter by category
   - `language`: Filter by language (default: mr)
   - `search`: Search in title/summary
   - `dateFrom`: Filter by date range
   - `dateTo`: Filter by date range

2. **Response Format** (Legal Compliance)
   ```json
   {
     "success": true,
     "news": [
       {
         "id": "mongodb_id",
         "title": "News Title",
         "summary": "Original summary from RSS",
         "source": "Source Name",
         "sourceLink": "https://original-article-link.com",  // REQUIRED for legal
         "imageUrl": "https://rss-image-url.com",
         "publishedAt": "2026-02-12T08:54:26Z",
         "category": "politics",
         "language": "mr",
         // Legal compliance fields
         "attribution": {
           "source": "Source Name",
           "originalLink": "https://original-article-link.com",
           "publishedDate": "2026-02-12T08:54:26Z"
         },
         "navigation": {
           "detailUrl": "/news/google-news/{id}",  // Your app's detail page
           "sourceUrl": "https://original-article-link.com",  // Original article
           "shareUrl": "/share/google-news/{id}"
         },
         "disclaimer": "This is a summary of publicly available news. Click source link for full article."
       }
     ],
     "pagination": {
       "page": 1,
       "limit": 10,
       "total": 150,
       "pages": 15
     }
   }
   ```

3. **Legal Requirements**
   - ✅ Always include `sourceLink` (original article URL)
   - ✅ Include source attribution
   - ✅ Include disclaimer text
   - ✅ Provide navigation links (your app + original source)
   - ✅ Include published date from original source

### Key Points
- ✅ **All filters**: Support all existing filter parameters
- ✅ **Legal compliance**: Every response includes attribution and original links
- ✅ **App-ready**: Includes navigation URLs for your app
- ✅ **Pagination**: Efficient pagination for large datasets

---

## API 3: External RSS Fetcher with Image Download

### Purpose
Fetch news from 4 external RSS sources, download images to Cloudflare R2, and store in MongoDB maintaining exact RSS structure for validation.

### Endpoint
`POST /api/v1/fetch-external-rss` or `GET /api/v1/fetch-external-rss` (scheduled)

### RSS Sources
```javascript
const RSS_SOURCES = [
  { name: 'TV9 Marathi', url: 'https://www.tv9marathi.com/feed' },
  { name: 'Zee News Marathi', url: 'https://zeenews.india.com/marathi/rss.xml' },
  { name: 'Saam TV', url: 'https://www.saamtv.com/feed/' },
  { name: 'Divya Marathi', url: 'https://divyamarathi.bhaskar.com/rss-v1--category-12019.xml' }
];
```

### Functionality
1. **Fetch Logic**
   - Fetch from all 4 sources (or specified source)
   - Parse RSS feed using `rss-parser`
   - Extract 6 news items at a time (total, not per source)
   - Maintain exact RSS structure (for validation)

2. **Image Handling**
   - Extract image URL from RSS item (media:content, media:thumbnail, enclosure, or HTML content)
   - Download image from source URL
   - Upload to Cloudflare R2 storage
   - Replace original image URL with R2 public URL
   - Store both: `originalImageUrl` and `r2ImageUrl`

3. **Deduplication Logic**
   - Track fetched news per source (separate logs)
   - Use `link` field as unique identifier per source
   - Store in separate collection: `rss_fetch_log` or use `fetchedLinks` array
   - Never fetch same news from same source twice
   - Example log structure:
     ```javascript
     {
       source: "TV9 Marathi",
       fetchedLinks: ["link1", "link2", ...],  // Array of fetched links
       lastFetchedAt: Date
     }
     ```

4. **Storage Schema** (`unprocessed_news_data`)
   ```javascript
   {
     _id: ObjectId,
     // RSS Feed Metadata
     sourceName: String,              // "TV9 Marathi", "Zee News Marathi", etc.
     sourceUrl: String,               // RSS feed URL
     
     // RSS Item Data (exact structure)
     title: String,
     link: String,                    // Original article link
     guid: String,                    // RSS GUID
     description: String,            // Full description (may contain HTML)
     content: String,                // content:encoded if available
     contentSnippet: String,
     pubDate: String,                // Original RSS pubDate string
     publishedAt: Date,               // Parsed date
     
     // Image Data
     originalImageUrl: String,        // Original image URL from RSS
     r2ImageUrl: String,              // Cloudflare R2 public URL
     imageDownloaded: Boolean,
     imageUploaded: Boolean,
     
     // RSS Extensions
     mediaContent: Object,            // media:content data
     mediaThumbnail: Object,          // media:thumbnail data
     enclosure: Object,               // enclosure data
     
     // Metadata
     fetchedAt: Date,
     processed: Boolean,              // false initially
     processedAt: Date,               // null initially
     
     // Raw RSS data (for exact reconstruction)
     rawRssData: Object               // Complete RSS item object
   }
   ```

5. **Image Upload to R2**
   ```javascript
   // Download image
   const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
   const imageBuffer = Buffer.from(imageResponse.data);
   
   // Generate unique filename
   const fileExt = path.extname(new URL(imageUrl).pathname) || '.jpg';
   const fileName = `news-images/${Date.now()}-${Math.random().toString(36).substr(2, 9)}${fileExt}`;
   
   // Upload to R2
   await s3.send(new PutObjectCommand({
     Bucket: process.env.R2_BUCKET_NAME,
     Key: fileName,
     Body: imageBuffer,
     ContentType: imageResponse.headers['content-type'] || 'image/jpeg',
   }));
   
   const r2PublicUrl = `${process.env.R2_PUBLIC_URL}/${fileName}`;
   ```

6. **Scheduling**
   - Called every 25 minutes
   - Fetch 6 news items total (distributed across sources)
   - Track fetched links per source to avoid duplicates

### Key Points
- ✅ **Image download**: Download and upload to R2 (no hotlinking)
- ✅ **RSS structure**: Maintain exact structure for validation
- ✅ **No duplicates**: Track fetched links per source
- ✅ **6 items per call**: Fetch 6 news items total
- ✅ **Legal**: Use own images, not third-party

---

## API 4: News Processing with AI Rewriting

### Purpose
Fetch one unprocessed news item, rewrite with Gemini AI, and store in processed collection.

### Endpoint
`POST /api/v1/process-news` or `GET /api/v1/process-news` (scheduled)

### Functionality
1. **Fetch Logic**
   - Query `unprocessed_news_data` where `processed: false`
   - Sort by `fetchedAt` ASC (oldest first)
   - Limit: 1 item
   - If no unprocessed news, return early (do nothing)

2. **AI Rewriting**
   - Use existing Gemini rewriting logic
   - Rewrite description/content to 60-80 words (Inshorts style)
   - Maintain factual tone, no opinions
   - Marathi language support

3. **Storage Schema** (`processed_news_data`)
   ```javascript
   {
     _id: ObjectId,
     // Source Information
     sourceName: String,
     sourceUrl: String,
     
     // Processed Content
     title: String,                   // Original title (may be cleaned)
     rewrittenDescription: String,     // AI-rewritten description (60-80 words)
     originalDescription: String,     // Original description from RSS
     link: String,                    // Original article link
     guid: String,                    // RSS GUID
     
     // Image (from R2)
     imageUrl: String,                // R2 public URL (our image)
     originalImageUrl: String,         // Original image URL (for reference)
     
     // Dates
     pubDate: String,                 // Original RSS pubDate
     publishedAt: Date,               // Parsed published date
     processedAt: Date,               // When AI processing completed
     
     // RSS Structure (for feed generation)
     mediaContent: Object,
     mediaThumbnail: Object,
     enclosure: Object,
     
     // Metadata
     language: String,                // Detected or from RSS
     category: String,                // Detected or from RSS
     
     // Legal Compliance
     originalSource: String,          // Source name
     originalLink: String,            // Original article link
     isRewritten: Boolean,           // true
     disclaimer: String,             // Legal disclaimer
     
     // Reference to unprocessed
     unprocessedNewsId: ObjectId      // Reference to unprocessed_news_data
   }
   ```

4. **Processing Steps**
   - Fetch one unprocessed news
   - Rewrite description with Gemini
   - Use R2 image URL (already uploaded in API 3)
   - Mark original as processed: `processed: true, processedAt: new Date()`
   - Insert into `processed_news_data`

5. **Scheduling**
   - Called every 1 minute
   - If no unprocessed news, return immediately (no error)

### Key Points
- ✅ **One at a time**: Process single news item per call
- ✅ **AI rewriting**: Use Gemini for content rewriting
- ✅ **Use R2 images**: Already uploaded images from API 3
- ✅ **Mark processed**: Update unprocessed collection
- ✅ **Idle handling**: Do nothing if no unprocessed news

---

## API 5: Valid RSS Feed Generator

### Purpose
Generate valid RSS 2.0 feed from `processed_news_data` that validates on RSS Board validator.

### Endpoint
`GET /api/v1/rss-feed` or `GET /api/v1/rss-feed.xml`

### Functionality
1. **RSS Structure** (Based on Divya Marathi format)
   ```xml
   <?xml version="1.0" encoding="UTF-8"?>
   <rss xmlns:media="http://search.yahoo.com/mrss/" 
        xmlns:atom="http://www.w3.org/2005/Atom" 
        version="2.0">
     <channel>
       <title><![CDATA[Channel Title]]></title>
       <link>https://your-domain.com</link>
       <atom:link href="https://your-domain.com/api/v1/rss-feed" 
                  rel="self" 
                  type="application/rss+xml"/>
       <description><![CDATA[Channel Description]]></description>
       <language>mr</language>
       <lastBuildDate>Thu, 12 Feb 2026 08:54:26 +0000</lastBuildDate>
       <pubDate>Thu, 12 Feb 2026 08:54:26 +0000</pubDate>
       <image>
         <title><![CDATA[Channel Title]]></title>
         <url>https://your-domain.com/logo.png</url>
         <link>https://your-domain.com</link>
       </image>
       <item>
         <title><![CDATA[News Title]]></title>
         <link>https://original-article-link.com</link>
         <guid isPermaLink="true">https://original-article-link.com</guid>
         <atom:link href="https://original-article-link.com"/>
         <description><![CDATA[Rewritten description...]]></description>
         <pubDate>Tue, 03 Feb 2026 04:18:00 +0000</pubDate>
         <media:content url="https://r2-public-url.com/image.jpg" 
                        type="image/jpeg" 
                        width="1000" 
                        height="1000"/>
       </item>
       <!-- More items -->
     </channel>
   </rss>
   ```

2. **Query Parameters**
   - `limit`: Number of items (default: 20)
   - `category`: Filter by category
   - `language`: Filter by language
   - `source`: Filter by source name

3. **Data Source**
   - Fetch from `processed_news_data` collection
   - Sort by `publishedAt` DESC (newest first)
   - Apply filters if provided

4. **RSS Validation Requirements**
   - ✅ Valid XML structure
   - ✅ Proper namespaces (media, atom)
   - ✅ CDATA for title and description
   - ✅ RFC 822 date format (Thu, 12 Feb 2026 08:54:26 +0000)
   - ✅ Valid GUID (URL when isPermaLink="true")
   - ✅ Proper media:content structure
   - ✅ All required channel elements

5. **Response**
   - Content-Type: `application/rss+xml; charset=utf-8`
   - Return XML string

### Key Points
- ✅ **Valid RSS**: Must pass RSS Board validator
- ✅ **Exact format**: Match Divya Marathi RSS structure
- ✅ **R2 images**: Use our R2 image URLs in media:content
- ✅ **Original links**: Link to original articles (legal compliance)

---

## API 6: JSON News Feed

### Purpose
Get all processed news in JSON format with title, description, and images.

### Endpoint
`GET /api/v1/news` or `GET /api/v1/news/json`

### Functionality
1. **Query Parameters**
   - `page`: Pagination (default: 1)
   - `limit`: Items per page (default: 20)
   - `category`: Filter by category
   - `language`: Filter by language
   - `source`: Filter by source name
   - `search`: Search in title/description

2. **Response Format**
   ```json
   {
     "success": true,
     "news": [
       {
         "id": "mongodb_id",
         "title": "News Title",
         "description": "AI-rewritten description (60-80 words)",
         "image": "https://r2-public-url.com/image.jpg",
         "source": "TV9 Marathi",
         "publishedAt": "2026-02-12T08:54:26Z",
         "category": "politics",
         "language": "mr",
         "originalLink": "https://original-article-link.com"
       }
     ],
     "pagination": {
       "page": 1,
       "limit": 20,
       "total": 500,
       "pages": 25
     }
   }
   ```

3. **Data Source**
   - Fetch from `processed_news_data` collection
   - Return only: title, description (rewritten), image (R2 URL)
   - Include pagination metadata

### Key Points
- ✅ **Simple format**: Only essential fields (title, description, image)
- ✅ **R2 images**: Use our R2 image URLs
- ✅ **Pagination**: Efficient pagination
- ✅ **Filters**: Support all filter parameters

---

## MongoDB Collections Summary

### 1. `google_rss_news_legal`
- Stores Google News RSS fetched data
- Never deleted, only appended
- Deduplication by `link` field

### 2. `unprocessed_news_data`
- Stores external RSS news with downloaded images
- Images uploaded to R2
- Maintains exact RSS structure
- `processed: false` initially

### 3. `processed_news_data`
- Stores AI-rewritten news
- Uses R2 image URLs
- Ready for RSS feed generation and JSON API

### 4. `rss_fetch_log` (Optional - for deduplication)
- Tracks fetched links per source
- Prevents duplicate fetching
- Structure:
  ```javascript
  {
    source: String,
    fetchedLinks: [String],  // Array of links
    lastFetchedAt: Date,
    totalFetched: Number
  }
  ```

---

## Scheduling Summary

| API | Frequency | Purpose |
|-----|-----------|---------|
| API 1 | Every 20 min | Fetch Google News RSS → `google_rss_news_legal` |
| API 2 | On-demand | Get filtered news from `google_rss_news_legal` |
| API 3 | Every 25 min | Fetch external RSS → Download images → `unprocessed_news_data` |
| API 4 | Every 1 min | Process one news → AI rewrite → `processed_news_data` |
| API 5 | On-demand | Generate RSS feed from `processed_news_data` |
| API 6 | On-demand | Get JSON news from `processed_news_data` |

---

## Legal Compliance Checklist

### ✅ All APIs Include:
- Source attribution
- Original article links
- Published dates from sources
- Disclaimers where appropriate
- No content copying (AI rewriting)
- Own image hosting (R2)

### ✅ RSS Feed Compliance:
- Valid RSS 2.0 structure
- Proper namespaces
- CDATA encoding
- RFC 822 dates
- Valid GUIDs
- Media content structure

---

## Potential Issues & Considerations

### 1. **Image Download Failures**
- **Issue**: Some images may fail to download
- **Solution**: 
  - Retry logic with exponential backoff
  - Fallback to placeholder image
  - Log failures for manual review

### 2. **RSS Feed Validation**
- **Issue**: RSS may not validate if structure is incorrect
- **Solution**: 
  - Test with RSS Board validator after implementation
  - Ensure all required fields are present
  - Proper XML escaping

### 3. **Deduplication Logic**
- **Issue**: Same news from different sources
- **Solution**: 
  - Track per-source (API 3 requirement)
  - Use composite key: `source + link`
  - Allow same news from different sources

### 4. **Rate Limiting**
- **Issue**: Too many API calls may hit rate limits
- **Solution**: 
  - Implement delays between calls
  - Use queue system for processing
  - Monitor API usage

### 5. **Storage Costs**
- **Issue**: R2 storage costs for images
- **Solution**: 
  - Optimize image sizes before upload
  - Implement image compression
  - Monitor storage usage

### 6. **Gemini API Costs**
- **Issue**: AI rewriting costs per request
- **Solution**: 
  - Monitor API usage
  - Implement caching if possible
  - Batch processing if API supports

### 7. **MongoDB Indexing**
- **Issue**: Slow queries without proper indexes
- **Solution**: 
  - Index on `link` field (deduplication)
  - Index on `processed` field (API 4)
  - Index on `publishedAt` (sorting)
  - Index on `sourceName` (filtering)

---

## Implementation Priority

### Phase 1: Core Functionality
1. API 1: Google News RSS fetcher
2. API 3: External RSS fetcher with image download
3. API 4: News processor with AI rewriting

### Phase 2: Data Retrieval
4. API 2: Legal news retrieval
5. API 6: JSON news feed

### Phase 3: RSS Generation
6. API 5: Valid RSS feed generator

---

## Questions for Clarification

1. **API 1 Deduplication**: Should we allow same news if it appears in different queries, or global deduplication?

2. **API 3 Image Download**: What if image download fails? Use placeholder or skip news?

3. **API 4 Processing**: Should we process news in order (oldest first) or prioritize certain sources?

4. **RSS Feed Link**: In API 5 RSS feed, should `<link>` point to original article or your app's detail page?

5. **Error Handling**: What should happen if Gemini API fails during rewriting? Skip or retry?

6. **Image Optimization**: Should we resize/compress images before uploading to R2?

---

## Next Steps

1. **Review this document** - Confirm all requirements are correct
2. **Clarify questions** - Answer the questions above
3. **Confirm implementation** - Approve to proceed
4. **Implementation** - Start with Phase 1 APIs

---

## References

- [RSS 2.0 Specification](https://www.rssboard.org/rss-specification)
- [RSS Validator](https://www.rssboard.org/rss-validator/)
- [Divya Marathi RSS Example](https://divyamarathi.bhaskar.com/rss-v1--category-12019.xml)
- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)

---

**Document Version**: 1.0  
**Created**: 2026-02-12  
**Status**: Pending Review
