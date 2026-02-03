# News Generation Backend

A standalone Node.js backend service for generating news articles from RSS feeds, rewriting them with AI, storing in MongoDB, and providing RSS feeds for WordPress aggregator plugins.

## Features

- 📰 **RSS Feed Processing**: Fetch news from Google News RSS feeds
- 🤖 **AI-Powered Rewriting**: Rewrite news articles in Inshorts-style using Google Gemini AI
- 💾 **Database Storage**: Store processed news articles in MongoDB
- 📡 **RSS Feed Generation**: Generate valid RSS 2.0 feeds for WordPress aggregator plugins
- 🔍 **Search & Filter**: Search and filter news by category, language, etc.
- 🖼️ **Stock Images**: Automatic fallback to stock images when RSS feeds don't provide images

## Prerequisites

- Node.js >= 16.0.0
- MongoDB database (local or cloud)
- Google Gemini API key (for AI rewriting)

## Installation

1. **Clone or navigate to the project directory:**
   ```bash
   cd new_generation_backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your configuration:
   ```env
   PORT=8000
   MONGO_URL=mongodb+srv://username:password@cluster.mongodb.net/news_db
   GEMINI_API_KEY=your_gemini_api_key_here
   UNSPLASH_ACCESS_KEY=your_unsplash_key_here  # Optional
   PEXELS_API_KEY=your_pexels_key_here          # Optional
   ```

4. **Start the server:**
   ```bash
   npm start
   ```
   
   Or for development with auto-reload:
   ```bash
   npm run dev
   ```

## API Endpoints

### News Generation

- **POST `/news/fetch`** - Fetch and process news from RSS
  ```json
  {
    "query": "पुणे",
    "limit": 10,
    "language": "mr",
    "country": "IN",
    "category": "general",
    "strictFilter": false
  }
  ```

### News Retrieval

- **GET `/news`** or **GET `/api/news`** - Get all news (paginated)
  - Query params: `?page=1&limit=10&category=politics&language=mr`

- **GET `/news/:id`** - Get single news article by ID

- **GET `/news/latest`** - Get latest news
  - Query params: `?limit=5`

- **GET `/news/search?q=query`** - Search news
  - Query params: `?q=पुणे&page=1&limit=10`

### RSS Feed

- **GET `/news/rss`** or **GET `/news/rss.xml`** - Generate RSS feed
  - Query params: `?query=पुणे&limit=20&language=mr&country=IN`

### Admin

- **GET `/news/admin/stats`** - Get news statistics
- **DELETE `/news/:id`** - Delete news article
- **GET `/news/test-db`** - Test database connection

### Health Check

- **GET `/health`** - Server health check

## Usage Examples

### 1. Generate News

```bash
curl -X POST http://localhost:8000/news/fetch \
  -H "Content-Type: application/json" \
  -d '{
    "query": "पुणे",
    "limit": 10,
    "language": "mr",
    "category": "general"
  }'
```

### 2. Get All News

```bash
curl http://localhost:8000/news?page=1&limit=10
```

### 3. Get RSS Feed

```bash
curl http://localhost:8000/news/rss?query=पुणे&limit=20
```

### 4. Search News

```bash
curl http://localhost:8000/news/search?q=पुणे&page=1&limit=10
```

## WordPress Integration

Add the RSS feed to your WordPress aggregator plugin:

1. Copy the RSS feed URL: `http://your-domain.com/news/rss`
2. In WordPress, go to your aggregator plugin settings
3. Add the RSS feed URL
4. Configure update frequency and other settings

The RSS feed is validated and compatible with standard RSS 2.0 aggregators.

## Test Scripts

The project includes several test scripts in the `scripts/` directory:

- **`testnews.js`** - Test RSS feed fetching and Marathi filtering
- **`test-flow.js`** - Test complete flow with AI rewriting
- **`test-rewrite.js`** - Test AI rewriting functionality
- **`fetch-marathi-news.js`** - Fetch news from multiple Marathi sources

Run test scripts:
```bash
node scripts/testnews.js
node scripts/test-flow.js
node scripts/test-rewrite.js
node scripts/fetch-marathi-news.js
```

## Project Structure

```
new_generation_backend/
├── config/
│   └── database.js          # MongoDB connection
├── controllers/
│   └── newsController.js    # News processing logic
├── models/
│   └── newsModel.js         # Database model
├── routes/
│   └── newsRoutes.js        # API routes
├── services/
│   └── stockImageService.js # Stock image service
├── middleware/
│   ├── error.js              # Error handling
│   └── catchAsyncErrors.js   # Async error wrapper
├── utils/
│   └── ErrorHandler.js       # Error handler class
├── scripts/
│   ├── testnews.js          # Test scripts
│   ├── test-flow.js
│   ├── test-rewrite.js
│   └── fetch-marathi-news.js
├── .env.example             # Environment variables template
├── .gitignore               # Git ignore rules
├── package.json             # Dependencies
├── server.js               # Main server file
└── README.md               # This file
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Server port (default: 8000) |
| `MONGO_URL` | Yes | MongoDB connection string |
| `GEMINI_API_KEY` | Yes | Google Gemini API key for AI rewriting |
| `UNSPLASH_ACCESS_KEY` | No | Unsplash API key for stock images |
| `PEXELS_API_KEY` | No | Pexels API key for stock images |
| `ALLOWED_ORIGINS` | No | CORS allowed origins (comma-separated) |

## Legal Compliance

This project follows the Inshorts model for news aggregation:

- ✅ Content is rewritten using AI (not copied)
- ✅ Original source is always attributed
- ✅ Links to original articles are provided
- ✅ Legal disclaimers are included
- ✅ Stock images are used when RSS feeds don't provide images

## License

MIT

## Support

For issues and questions, please create an issue in the repository.
