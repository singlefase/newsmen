const Parser = require("rss-parser");
const dotenv = require("dotenv");
const { GoogleGenAI } = require("@google/genai");

dotenv.config();

// ---------------- SETUP ----------------
const parser = new Parser();
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

const QUERY = encodeURIComponent(
  "पुणे राजकारण सरकार पालिका विकास प्रशासन"
);
const RSS_URL = `https://news.google.com/rss/search?q=${QUERY}&hl=mr&gl=IN&ceid=IN:mr`;
const LIMIT = 5;

// ---------------- KEYWORDS ----------------
const ALLOWED_KEYWORDS = [
  "सरकार",
  "राज्य",
  "महापालिका",
  "पालिका",
  "प्रशासन",
  "मंत्री",
  "आमदार",
  "खासदार",
  "निवडणूक",
  "विकास",
  "योजना",
  "सभा",
  "निर्णय"
];

const BLOCKED_KEYWORDS = [
  "खून",
  "हत्या",
  "आत्महत्या",
  "अपघात",
  "बलात्कार",
  "गोळीबार",
  "चाकू",
  "गुन्हा"
];

// ---------------- HELPERS ----------------
function isProperMarathi(text = "") {
  if (!text) return false;
  const mr = (text.match(/[\u0900-\u097F]/g) || []).length;
  return /^[\u0900-\u097F]/.test(text.trim()) && mr / text.length >= 0.6;
}

function containsAllowedTopic(text = "") {
  return ALLOWED_KEYWORDS.some(k => text.includes(k));
}

function containsBlockedTopic(text = "") {
  return BLOCKED_KEYWORDS.some(k => text.includes(k));
}

function cleanTitle(title = "") {
  return title.replace(/ - .*$/, "").replace(/\|.*$/, "").trim();
}

// ---------------- GEMINI ----------------
async function rewriteMarathi({ title, summary, source }) {
  const prompt = `
तुम्ही मराठी न्यूज एडिटर आहात.

खालील बातमी 80–100 शब्दांत
सरळ, तथ्यात्मक पद्धतीने पुन्हा लिहा.

नियम:
- मूळ मजकूर कॉपी करू नका
- 4–5 वाक्ये
- मत किंवा निष्कर्ष देऊ नका
- सरकारी / प्रशासकीय माहिती ठेवा

शीर्षक: ${title}
स्रोत: ${source}
सारांश: ${summary}

फक्त बातमी द्या.
`;

  const res = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt
  });

  return res.text.trim();
}

async function runFlow() {
  console.log("\n📰 Fetching Pune Politics / Government News...\n");

  const feed = await parser.parseURL(RSS_URL);
  const collected = [];

  for (const item of feed.items) {
    if (collected.length >= LIMIT) break;

    const title = cleanTitle(item.title || "");
    const summary = item.contentSnippet || "";
    const text = `${title} ${summary}`;

    if (
      isProperMarathi(title) &&
      containsAllowedTopic(text) &&
      !containsBlockedTopic(text)
    ) {
      collected.push({
        title,
        summary,
        source: item.source?.title || "Google News"
      });
    }
  }

  if (collected.length === 0) {
    console.log("⚠️ No relevant political/government news found.");
    return;
  }

  for (let i = 0; i < collected.length; i++) {
    console.log("══════════════════════════════════════");
    console.log(`🟠 ORIGINAL (${i + 1})`);
    console.log(collected[i].title);

    const rewritten = await rewriteMarathi(collected[i]);

    console.log("\n🟢 REWRITTEN MARATHI NEWS");
    console.log(rewritten);
  }

  console.log(`\n✅ Completed (${collected.length} news printed)\n`);
}

// ---------------- RUN ----------------
runFlow().catch(err => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
