/**
 * Cloudflare R2 Image Upload Service
 * Downloads images from URLs and uploads to Cloudflare R2 storage
 */

const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const axios = require("axios");
const path = require("path");

// Cloudflare R2 S3 Client
let s3Client = null;

function getS3Client() {
  if (!s3Client) {
    const endpoint = process.env.R2_ENDPOINT_URL?.replace(/\/$/, "");
    if (!endpoint) {
      throw new Error("R2_ENDPOINT_URL not configured");
    }

    s3Client = new S3Client({
      region: "auto",
      endpoint: endpoint,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
    });
  }
  return s3Client;
}

/**
 * Download image from URL and upload to R2
 * @param {string} imageUrl - Original image URL
 * @param {string} sourceName - Source name for folder organization
 * @returns {Promise<{url: string, originalUrl: string, success: boolean, error?: string}>}
 */
async function downloadAndUploadImage(imageUrl, sourceName = "news") {
  try {
    if (!imageUrl || !imageUrl.startsWith("http")) {
      return {
        url: null,
        originalUrl: imageUrl,
        success: false,
        error: "Invalid image URL",
      };
    }

    // Download image
    console.log(`  📥 Downloading image: ${imageUrl.substring(0, 80)}...`);
    const imageResponse = await axios.get(imageUrl, {
      responseType: "arraybuffer",
      timeout: 10000,
      headers: {
        "User-Agent": "Mozilla/5.0 (News Aggregator)",
      },
    });

    if (!imageResponse.data) {
      return {
        url: null,
        originalUrl: imageUrl,
        success: false,
        error: "Failed to download image",
      };
    }

    const imageBuffer = Buffer.from(imageResponse.data);
    const contentType = imageResponse.headers["content-type"] || "image/jpeg";

    // Generate unique filename
    const fileExt =
      path.extname(new URL(imageUrl).pathname) ||
      (contentType.includes("png") ? ".png" : ".jpg");
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substr(2, 9);
    const fileName = `news-images/${sourceName}/${timestamp}-${randomStr}${fileExt}`;

    // Upload to R2
    console.log(`  📤 Uploading to R2: ${fileName}`);
    const s3 = getS3Client();
    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: fileName,
        Body: imageBuffer,
        ContentType: contentType,
      })
    );

    const r2PublicUrl = `${process.env.R2_PUBLIC_URL}/${fileName}`;
    console.log(`  ✅ Image uploaded: ${r2PublicUrl}`);

    return {
      url: r2PublicUrl,
      originalUrl: imageUrl,
      success: true,
    };
  } catch (error) {
    console.error(`  ❌ Image upload failed: ${error.message}`);
    return {
      url: null,
      originalUrl: imageUrl,
      success: false,
      error: error.message,
    };
  }
}

/**
 * Extract image URL from RSS item
 * @param {Object} item - RSS item object
 * @returns {string|null} - Image URL or null
 */
function extractImageUrlFromRSSItem(item) {
  // Method 1: Check media:content
  if (item["media:content"]) {
    const mediaContent = item["media:content"];
    const url = mediaContent.url || mediaContent.$?.url;
    if (url) return url;
  }

  // Method 2: Check media:thumbnail
  if (item["media:thumbnail"]) {
    const thumbnail = item["media:thumbnail"];
    const url = thumbnail.url || thumbnail.$?.url;
    if (url) return url;
  }

  // Method 3: Check enclosure
  if (item.enclosure && item.enclosure.type?.startsWith("image/")) {
    if (item.enclosure.url) return item.enclosure.url;
  }

  // Method 4: Extract from HTML content
  const contentSources = [
    item["content:encoded"],
    item.content,
    item.description,
  ];

  for (const content of contentSources) {
    if (content && typeof content === "string") {
      const imgMatch = content.match(/<img[^>]+src=["']([^"']+)["']/i);
      if (imgMatch && imgMatch[1]) {
        return imgMatch[1];
      }
    }
  }

  return null;
}

module.exports = {
  downloadAndUploadImage,
  extractImageUrlFromRSSItem,
};
