/**
 * Stock Image Service
 * Fetches images from Unsplash / Pexels when RSS items have no image
 */

const axios = require("axios");

const CATEGORY_SEARCH_TERMS = {
  desh: "india news delhi",
  videsh: "world news globe",
  maharastra: "maharashtra india landscape",
  pune: "pune city india",
  mumbai: "mumbai skyline india",
  nashik: "nashik india temple",
  ahmednagar: "indian city",
  aurangabad: "aurangabad india fort",
  political: "indian parliament politics",
  sports: "cricket sports stadium",
  entertainment: "bollywood cinema film",
  tourism: "india travel landscape",
  lifestyle: "lifestyle wellness modern",
  agriculture: "farming agriculture india field",
  government: "government building india",
  trade: "business market stock",
  health: "health medical hospital",
  horoscope: "astrology zodiac stars",
  general: "india news newspaper",
};

async function searchUnsplash(query) {
  try {
    const accessKey = process.env.UNSPLASH_ACCESS_KEY;
    if (!accessKey) return null;

    const response = await axios.get("https://api.unsplash.com/search/photos", {
      params: { query, per_page: 1, orientation: "landscape" },
      headers: { Authorization: `Client-ID ${accessKey}` },
      timeout: 8000,
    });

    const photo = response.data?.results?.[0];
    if (photo?.urls) {
      return {
        url: photo.urls.regular || photo.urls.small,
        attribution: `Photo by ${photo.user?.name || "Unsplash"} on Unsplash`,
        source: "unsplash",
      };
    }
    return null;
  } catch (error) {
    console.error("  Unsplash search error:", error.message);
    return null;
  }
}

async function searchPexels(query) {
  try {
    const apiKey = process.env.PEXELS_API_KEY;
    if (!apiKey) return null;

    const response = await axios.get("https://api.pexels.com/v1/search", {
      params: { query, per_page: 1, orientation: "landscape" },
      headers: { Authorization: apiKey },
      timeout: 8000,
    });

    const photo = response.data?.photos?.[0];
    if (photo?.src) {
      return {
        url: photo.src.large || photo.src.medium,
        attribution: `Photo by ${photo.photographer} on Pexels`,
        source: "pexels",
      };
    }
    return null;
  } catch (error) {
    console.error("  Pexels search error:", error.message);
    return null;
  }
}

/**
 * Get a stock image URL based on detected categories.
 * Tries Unsplash first, then Pexels.
 * @param {string[]} categories - Array of detected category keys
 * @returns {Promise<{url: string, attribution: string, source: string}|null>}
 */
async function getStockImage(categories = []) {
  const primaryCategory = categories[0] || "general";
  const query = CATEGORY_SEARCH_TERMS[primaryCategory] || CATEGORY_SEARCH_TERMS.general;

  let result = await searchUnsplash(query);
  if (result) return result;

  result = await searchPexels(query);
  if (result) return result;

  return null;
}

module.exports = { getStockImage };
