/**
 * Stock Image Service - Legal image fallback
 * Uses free stock photo APIs when RSS feeds don't provide images
 */

const axios = require('axios');

// Get stock image for a news topic (fallback when RSS has no image)
async function getStockImageForTopic(topic, category = 'general') {
  try {
    // Use Unsplash API (free, legal, requires attribution)
    // Note: You'll need to sign up for Unsplash API key (free tier available)
    const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;
    
    if (!UNSPLASH_ACCESS_KEY) {
      console.log('⚠️  Unsplash API key not configured, skipping stock images');
      return null;
    }

    // Map category to search terms
    const searchTerms = {
      'politics': 'politics government',
      'technology': 'technology innovation',
      'sports': 'sports competition',
      'business': 'business finance',
      'general': topic || 'news'
    };

    const searchQuery = searchTerms[category] || topic || 'news';
    
    const response = await axios.get('https://api.unsplash.com/photos/random', {
      params: {
        query: searchQuery,
        orientation: 'landscape',
        client_id: UNSPLASH_ACCESS_KEY
      },
      timeout: 5000
    });

    if (response.data && response.data.urls && response.data.urls.regular) {
      return {
        url: response.data.urls.regular,
        attribution: `Photo by ${response.data.user?.name || 'Unsplash'} on Unsplash`,
        source: 'Unsplash'
      };
    }

    return null;
  } catch (error) {
    console.log(`⚠️  Stock image fetch failed: ${error.message}`);
    return null;
  }
}

// Alternative: Use Pexels API (also free, legal)
async function getPexelsImageForTopic(topic, category = 'general') {
  try {
    const PEXELS_API_KEY = process.env.PEXELS_API_KEY;
    
    if (!PEXELS_API_KEY) {
      return null;
    }

    const searchTerms = {
      'politics': 'politics',
      'technology': 'technology',
      'sports': 'sports',
      'business': 'business',
      'general': topic || 'news'
    };

    const searchQuery = searchTerms[category] || topic || 'news';
    
    const response = await axios.get('https://api.pexels.com/v1/search', {
      params: {
        query: searchQuery,
        per_page: 1,
        orientation: 'landscape'
      },
      headers: {
        'Authorization': PEXELS_API_KEY
      },
      timeout: 5000
    });

    if (response.data && response.data.photos && response.data.photos[0]) {
      const photo = response.data.photos[0];
      return {
        url: photo.src.large,
        attribution: `Photo by ${photo.photographer} on Pexels`,
        source: 'Pexels'
      };
    }

    return null;
  } catch (error) {
    console.log(`⚠️  Pexels image fetch failed: ${error.message}`);
    return null;
  }
}

// Get placeholder image (no API key required) - for POC
function getPlaceholderImage(category = 'general') {
  // Use placeholder.com or similar free service
  const placeholderUrls = {
    'politics': 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=800&h=600&fit=crop',
    'technology': 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&h=600&fit=crop',
    'sports': 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=800&h=600&fit=crop',
    'business': 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop',
    'general': 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&h=600&fit=crop'
  };
  
  // These are direct Unsplash URLs (no API key needed for direct image access)
  return {
    url: placeholderUrls[category] || placeholderUrls['general'],
    attribution: 'Image from Unsplash (free stock photos)',
    source: 'Unsplash'
  };
}

// Get stock image (tries Unsplash API first, then Pexels, then placeholder)
async function getStockImage(topic, category = 'general') {
  // Try Unsplash API first (requires API key)
  let image = await getStockImageForTopic(topic, category);
  
  // Fallback to Pexels API if Unsplash fails (requires API key)
  if (!image) {
    image = await getPexelsImageForTopic(topic, category);
  }
  
  // Final fallback: Use placeholder images (no API key required)
  if (!image) {
    console.log(`  📸 Using placeholder image (no API keys configured)`);
    image = getPlaceholderImage(category);
  }
  
  return image;
}

module.exports = {
  getStockImage,
  getStockImageForTopic,
  getPexelsImageForTopic
};
