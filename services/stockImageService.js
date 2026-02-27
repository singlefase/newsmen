/**
 * Stock Image Service - Unsplash + Pexels fallback
 * When RSS feeds don't provide images, fetch from stock photo APIs
 */

const axios = require("axios");

const CATEGORY_SEARCH_TERMS = {
  desh: "india news delhi parliament",
  videsh: "world news international",
  maharastra: "maharashtra india",
  pune: "pune city india",
  mumbai: "mumbai skyline india",
  nashik: "nashik india",
  ahmednagar: "ahmednagar india",
  aurangabad: "aurangabad india",
  political: "indian parliament politics",
  sports: "cricket sports stadium",
  entertainment: "bollywood cinema india",
  tourism: "travel tourism india",
  lifestyle: "lifestyle wellness",
  agriculture: "farming agriculture india",
  government: "government office india",
  trade: "stock market business india",
  health: "hospital healthcare india",
  horoscope: "astrology zodiac stars",
  general: "india news",
};

async function searchUnsplash(query) {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return null;

  try {
    const res = await axios.get("https://api.unsplash.com/photos/random", {
      params: { query, orientation: "landscape", client_id: key },
      timeout: 8000,
    });
    if (res.data?.urls?.regular) {
      return {
        url: res.data.urls.regular,
        source: "unsplash",
        attribution: `Photo by ${res.data.user?.name || "Unsplash"} on Unsplash`,
      };
    }
  } catch (err) {
    console.log(`  ⚠️  Unsplash search failed: ${err.message}`);
  }
  return null;
}

async function searchPexels(query) {
  const key = process.env.PEXELS_API_KEY;
  if (!key) return null;

  try {
    const res = await axios.get("https://api.pexels.com/v1/search", {
      params: { query, per_page: 1, orientation: "landscape" },
      headers: { Authorization: key },
      timeout: 8000,
    });
    const photo = res.data?.photos?.[0];
    if (photo?.src?.large) {
      return {
        url: photo.src.large,
        source: "pexels",
        attribution: `Photo by ${photo.photographer} on Pexels`,
      };
    }
  } catch (err) {
    console.log(`  ⚠️  Pexels search failed: ${err.message}`);
  }
  return null;
}

/**
 * Get a stock image for given categories array
 * Tries Unsplash first, then Pexels
 * @param {string[]} categories - array of category keys
 * @returns {Promise<{url, source, attribution}|null>}
 */
async function getStockImage(categories = []) {
  const primaryCat = categories[0] || "general";
  const query = CATEGORY_SEARCH_TERMS[primaryCat] || CATEGORY_SEARCH_TERMS.general;

  console.log(`  🖼️  No RSS image — searching stock photos for "${primaryCat}"...`);

  let image = await searchUnsplash(query);
  if (!image) {
    image = await searchPexels(query);
  }
  return image;
}

module.exports = {
  getStockImage,
  searchUnsplash,
  searchPexels,
};
