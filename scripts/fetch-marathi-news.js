const Parser = require("rss-parser");
const axios = require("axios");
const { decode } = require("html-entities");

const parser = new Parser();

// ---------------- CONFIG ----------------
const TOTAL_LIMIT = 50;          // total news to collect
const PER_SOURCE_LIMIT = 5;      // max news per source

const SOURCES = [
  { name: "Loksatta", rss: "https://news.google.com/rss/search?q=पुणे+site:loksatta.com&hl=mr&gl=IN&ceid=IN:mr" },
  { name: "Sakal", rss: "https://news.google.com/rss/search?q=पुणे+site:esakal.com&hl=mr&gl=IN&ceid=IN:mr" },
  { name: "Maharashtra Times", rss: "https://news.google.com/rss/search?q=पुणे+site:maharashtratimes.com&hl=mr&gl=IN&ceid=IN:mr" },
  { name: "Lokmat", rss: "https://news.google.com/rss/search?q=पुणे+site:lokmat.com&hl=mr&gl=IN&ceid=IN:mr" },
  { name: "Divya Marathi", rss: "https://news.google.com/rss/search?q=पुणे+site:divyamarathi.com&hl=mr&gl=IN&ceid=IN:mr" },
  { name: "ABP Majha", rss: "https://news.google.com/rss/search?q=पुणे+site:abpmajha.abplive.com&hl=mr&gl=IN&ceid=IN:mr" },
  { name: "TV9 Marathi", rss: "https://news.google.com/rss/search?q=पुणे+site:tv9marathi.com&hl=mr&gl=IN&ceid=IN:mr" },
  { name: "Zee 24 Taas", rss: "https://news.google.com/rss/search?q=पुणे+site:zeenews.india.com/marathi&hl=mr&gl=IN&ceid=IN:mr" },
  { name: "News18 Lokmat", rss: "https://news.google.com/rss/search?q=पुणे+site:news18.com/marathi&hl=mr&gl=IN&ceid=IN:mr" },
  { name: "Saam TV", rss: "https://news.google.com/rss/search?q=पुणे+site:saamtv.com&hl=mr&gl=IN&ceid=IN:mr" }
];

// ---------------- HELPERS ----------------
function decodeText(text = "") {
  return decode(text)
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchAndParse(url) {
  const res = await axios.get(url, {
    headers: { "User-Agent": "Mozilla/5.0 (News Aggregator)" }
  });

  let xml = res.data;

  // fix malformed entities (Google RSS issue)
  xml = xml.replace(/&(?!(amp|lt|gt|quot|apos);)/g, "&amp;");

  return parser.parseString(xml);
}

// ---------------- FLOW ----------------
async function run() {
  console.log("\n📰 Pune Marathi News via Google RSS\n");

  const collected = [];
  const seenLinks = new Set();

  for (const src of SOURCES) {
    if (collected.length >= TOTAL_LIMIT) break;

    let feed;
    try {
      feed = await fetchAndParse(src.rss);
    } catch (err) {
      console.warn(`⚠️ Skipped ${src.name}: ${err.message}`);
      continue;
    }

    let pickedFromSource = 0;

    for (const item of feed.items || []) {
      if (pickedFromSource >= PER_SOURCE_LIMIT) break;
      if (collected.length >= TOTAL_LIMIT) break;
      if (!item.link || seenLinks.has(item.link)) continue;

      seenLinks.add(item.link);

      collected.push({
        title: decodeText(item.title),
        snippet: decodeText(item.contentSnippet),
        link: item.link,
        source: src.name
      });

      pickedFromSource++;
    }
  }

  if (!collected.length) {
    console.log("⚠️ No news found.");
    return;
  }

  collected.forEach((n, i) => {
    console.log("────────────────────────────────────────");
    console.log(`🟠 NEWS ${i + 1}`);
    console.log(`शीर्षक: ${n.title}`);
    console.log(`सारांश: ${n.snippet}`);
    console.log(`📰 स्रोत: ${n.source}`);
    console.log(`🔗 मूळ बातमी: ${n.link}`);
  });

  console.log(`\n✅ Done (${collected.length} news printed)\n`);
}

run().catch(err => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
