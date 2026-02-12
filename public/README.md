# Frontend API Tester

This is a web-based interface to test all 6 APIs of the News Aggregation System.

## Features

- **Two Tabs**: 
  - Tab 1: Google News APIs (API 1 & 2)
  - Tab 2: External RSS & Processing APIs (API 3-6)

- **Real-time Testing**: 
  - Test each API with customizable parameters
  - See responses in formatted JSON
  - Status indicators for each API call

- **User-friendly Interface**:
  - Modern, responsive design
  - Color-coded status indicators
  - Easy-to-use form inputs
  - Clear response display

## Usage

1. Start the server: `npm start`
2. Open browser: `http://localhost:8000/`
3. Select a tab (Google News or External RSS & Processing)
4. Fill in the parameters for the API you want to test
5. Click the button to call the API
6. View the response in the response box

## API Endpoints Tested

### Tab 1: Google News APIs
- **API 1**: Fetch Google News RSS and store in MongoDB
- **API 2**: Get Google News from MongoDB with legal format

### Tab 2: External RSS & Processing
- **API 3**: Fetch External RSS with image download to R2
- **API 4**: Process news with AI rewriting
- **API 5**: Generate RSS feed from processed news
- **API 6**: Get news in JSON format

## Notes

- All API calls are made to the same server (no CORS issues)
- Responses are displayed in formatted JSON
- Status indicators show: Ready, Loading, Success, or Error
- You can clear responses using the "Clear" button
- For API 5 (RSS Feed), you can open the feed in a new tab
