# How the System Works Right Now

This document describes the **current** behavior of APIs 3, 4, and 5 as implemented today (no planned changes).

---

## High-Level Flow

```
RSS Sources (TV9, Zee, Saam TV, Divya Marathi)
         ↓
   [API 3] Fetch → Per-source duplicate check → Download images to R2 → Store
         ↓
   unprocessed_news_data (MongoDB)
         ↓
   [API 4] Pick 1 unprocessed → Rewrite 60–80 words (Gemini) → Store
         ↓
   processed_news_data (MongoDB)
         ↓
   [API 5] Query by category/language/source → Build RSS 2.0 XML → Return
         ↓
   WordPress / aggregator consumes RSS
```

Everything is **manual**: you must call API 3 and API 4 yourself (e.g. from cron or a scheduler). There is no built-in cron.

---

## API 3: Fetch External RSS (`POST /api/v1/fetch-external-rss`)

**Purpose:** Pull items from 4 Marathi RSS feeds, avoid re-fetching the same link from the same source, download images to R2, and save into `unprocessed_news_data`.

**How it works:**

1. **Input**
   - Body: `{ source?: string, limit?: number }`
   - `source`: optional, filters which of the 4 sources to use (e.g. `"TV9 Marathi"`). If omitted, all 4 are used.
   - `limit`: max items to save in this run (default **6**).

2. **Per source**
   - Fetches the RSS URL with `rss-parser`.
   - Loops over `feed.items` until `limit` is reached.

3. **Per item**
   - **Link required:** if `item.link` is missing, skip.
   - **Per-source duplicate check:** `isLinkFetched(sourceName, link)` checks the `rss_fetch_log` collection for that source. If this exact link was already fetched from this source, skip.
   - **No global duplicate check:** it does **not** check `unprocessed_news_data` or `processed_news_data`. So the same article from two different sources (e.g. TV9 and Divya Marathi) can be stored twice.
   - **No language filter:** all items are stored; there is no Marathi-only filter.
   - **Image:** `extractImageUrlFromRSSItem(item)` gets the image URL from the item. If present, `downloadAndUploadImage()` downloads it and uploads to Cloudflare R2; the stored doc uses the R2 URL (or null if no image / upload failed).
   - **Save:** one document per item is inserted into `unprocessed_news_data` (with `processed: false`, full RSS fields, `rawRssData`, etc.).
   - **Log:** `markLinkAsFetched(sourceName, link)` adds this link to that source’s list in `rss_fetch_log` so the same link is not fetched again from the same source.

4. **Output**
   - JSON: `{ success, message, count, news: [{ id, title, source, link, imageUrl }] }`.

**Collections used:**
- **Read:** `rss_fetch_log` (per-source fetched links).
- **Write:** `unprocessed_news_data`, `rss_fetch_log`.

**Current limitations:**
- Duplicate avoidance is **per source**, not global.
- No categories; no `categories` or `primaryCategory` fields.
- No Marathi-only filtering.
- No automatic scheduling; you must call the API (e.g. every 25 minutes).

---

## API 4: Process One News (`POST /api/v1/process-news`)

**Purpose:** Take one unprocessed item from `unprocessed_news_data`, rewrite the text with Gemini (short summary), then save to `processed_news_data` and mark the original as processed.

**How it works:**

1. **Pick one item**
   - Query: `{ processed: false }`, sort: `{ fetchedAt: 1 }` (oldest first), `limit` 1.
   - If none found, respond with `{ success: true, processed: false, message: "No unprocessed news to process" }` and stop.

2. **Rewrite text**
   - Uses `rewriteMarathiInshortsStyle({ title, summary, source })`.
   - **Input:** `title` = item title, `summary` = `description` or `contentSnippet` (not full article body).
   - **Gemini prompt:** asks for a **60–80 word** Marathi summary (Inshorts style). So the stored content is a short summary, not the full article.
   - **Output:** one short paragraph; on API failure, fallback is first 200 chars of summary + `"..."` or the title.

3. **Title**
   - **Not rewritten.** The stored title is the original RSS title (`unprocessedNews.title`).

4. **Build processed document**
   - Copies: source, link, guid, dates, media/enclosure, R2 image URL, etc.
   - **Content:** `rewrittenDescription` = Gemini output; `originalDescription` = original description/snippet.
   - **Fixed values:** `language: "mr"`, `category: "general"`. No multi-category; no category detection.

5. **Save and mark processed**
   - Insert into `processed_news_data`.
   - Update the document in `unprocessed_news_data`: `processed: true`, `processedAt: new Date()`.

6. **Response**
   - JSON with `processed: true` and a small `news` object (id, title, description, imageUrl).

**Collections used:**
- **Read/Write:** `unprocessed_news_data`.
- **Write:** `processed_news_data`.

**Current limitations:**
- Only **one** item is processed per API call.
- Content is **short (60–80 words)**, not full article.
- **Title is unchanged.**
- **No categorization;** every item gets `category: "general"`.
- No automatic scheduling; you must call repeatedly (e.g. every 1 minute) to process the queue.

---

## API 5: Generate RSS Feed (`GET /api/v1/rss-feed`)

**Purpose:** Read from `processed_news_data` and return a valid RSS 2.0 XML feed for aggregators.

**How it works:**

1. **Query params**
   - `limit` (default 20), `category`, `language` (default `"mr"`), `source`.

2. **MongoDB query**
   - Filter: if `category` → `query.category = category`; if `language` → `query.language = language`; if `source` → `query.sourceName = source`.
   - Sort: `publishedAt: -1`.
   - Limit: `parseInt(limit)`.

3. **RSS XML**
   - Single channel: title “News Feed”, description “Latest news feed”, link to `/api/v1/rss-feed`.
   - For each item: `<title>` = stored title (original), `<link>` = article link, `<description>` = `rewrittenDescription` (or `originalDescription`), truncated to 10,000 chars if longer, `<pubDate>` RFC 822, `<media:content>` if `imageUrl` (R2) exists.
   - No `<ttl>` or syndication update hints in the current code.

4. **Response**
   - `Content-Type: application/rss+xml; charset=utf-8`, body = RSS 2.0 XML.

**Collections used:**
- **Read:** `processed_news_data` only.

**Current limitations:**
- Only **one** feed URL; no per-category URLs like `/api/v1/rss-feed/sports`.
- Filtering is by single `category` (and everyone is `"general"` until you implement categories), plus `language` and `source`.
- No support for “multiple categories” (OR/AND) in one request.
- Description is the short rewritten summary (60–80 words), not full article.

---

## Deduplication (Current Behavior)

- **API 3**
  - **Per source:** `rss_fetch_log` stores, per source, an array of fetched `link` values. Before inserting, it checks `isLinkFetched(sourceName, link)`. So the same URL is not fetched twice from the **same** source.
  - **Not global:** it does not check `unprocessed_news_data` or `processed_news_data`. So the same story from two different sources can create two unprocessed and then two processed items.
- **API 4**
  - No extra deduplication; it just consumes whatever is in `unprocessed_news_data` with `processed: false`.

So today: **no duplicate within one source**; **duplicates across sources are possible**.

---

## Data Stored

**unprocessed_news_data (per item):**
- sourceName, sourceUrl, title, link, guid, description, content, contentSnippet, pubDate, publishedAt
- originalImageUrl, r2ImageUrl, imageDownloaded, imageUploaded
- mediaContent, mediaThumbnail, enclosure, rawRssData
- fetchedAt, processed (false), processedAt (null)
- No `categories`, no `primaryCategory`, no `isMarathi`.

**processed_news_data (per item):**
- Same source/link/guid/image/date fields
- title (original), rewrittenDescription (60–80 words), originalDescription
- language: `"mr"`, category: `"general"`
- originalSource, originalLink, isRewritten, disclaimer, unprocessedNewsId
- No `rewrittenTitle`, no `originalFullContent` / `rewrittenFullContent`, no `categories` array.

---

## How to Use It Today

1. **Feed the pipeline**
   - Call **API 3** periodically (e.g. every 25 min):  
     `POST /api/v1/fetch-external-rss` with `{ "limit": 6 }` (or with `source` to limit to one source).

2. **Process the queue**
   - Call **API 4** repeatedly (e.g. every 1 min):  
     `POST /api/v1/process-news`  
     until you get `processed: false` (no more unprocessed items).

3. **Consume the feed**
   - Give aggregators:  
     `GET /api/v1/rss-feed?limit=20&language=mr`  
     (optionally `category=general` and `source=...`).

4. **Optional: frontend**
   - Open `http://localhost:8000/` to use the tester UI for all 6 APIs plus Real RSS.

---

## Summary Table

| Aspect              | Current behavior                                      |
|---------------------|--------------------------------------------------------|
| **API 3 duplicates**| Per-source only (`rss_fetch_log`); cross-source possible |
| **API 3 language**  | No filter; all items stored                           |
| **API 3 categories**| None; no category fields                              |
| **API 4 content**   | 60–80 word summary (Gemini)                            |
| **API 4 title**     | Original RSS title (no rewrite)                         |
| **API 4 category**  | Always `"general"`                                     |
| **API 5 feed**      | Single URL; filter by category, language, source       |
| **API 5 description**| Short rewritten summary (max 10k chars)                |
| **Scheduling**      | Manual only; no cron in app                            |

This is how it works **for now**. The implementation guide (`API_3_4_5_IMPLEMENTATION_GUIDE.md`) describes the intended changes (full content, title rewrite, categories, global dedup, optional cron).
