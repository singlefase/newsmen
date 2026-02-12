/**
 * RSS Utility Functions
 * Helper functions for RSS feed generation and validation
 */

/**
 * Escape XML entities
 */
function escapeXml(unsafe) {
  if (!unsafe) return "";
  return unsafe
    .toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Clean HTML from description
 */
function cleanDescription(html) {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, "").trim();
}

/**
 * Format date to RFC 822 format (required for RSS validation)
 */
function formatRFC822Date(date) {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const d = new Date(date);
  const day = days[d.getUTCDay()];
  const dayNum = String(d.getUTCDate()).padStart(2, "0");
  const month = months[d.getUTCMonth()];
  const year = d.getUTCFullYear();
  const hours = String(d.getUTCHours()).padStart(2, "0");
  const minutes = String(d.getUTCMinutes()).padStart(2, "0");
  const seconds = String(d.getUTCSeconds()).padStart(2, "0");

  return `${day}, ${dayNum} ${month} ${year} ${hours}:${minutes}:${seconds} +0000`;
}

/**
 * Get base URL with proper protocol
 */
function getBaseUrl(req) {
  const protocol =
    req.secure || req.headers["x-forwarded-proto"] === "https"
      ? "https"
      : req.protocol;
  return `${protocol}://${req.get("host")}`;
}

/**
 * Check if a string is a valid URL
 */
function isValidUrl(string) {
  try {
    const url = new URL(string);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch (_) {
    return false;
  }
}

module.exports = {
  escapeXml,
  cleanDescription,
  formatRFC822Date,
  getBaseUrl,
  isValidUrl,
};
