const dotenv = require("dotenv");
const { GoogleGenAI } = require("@google/genai");

dotenv.config();

async function rewriteMarathiNews({ title, summary, source } = {}) {
  if (!title || !summary) {
    throw new Error("title and summary are required");
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY missing in .env");

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
तुम्ही मराठी न्यूज एडिटर आहात.

खालील बातमी 120–130 शब्दांत
"Inshorts-style" लहान, सोपी आणि तथ्यात्मक पद्धतीने पुन्हा लिहा.

नियम:
- मूळ मजकूर कॉपी करू नका
- मत मांडू नका
- 5–6 वाक्ये
- साधी, स्पष्ट मराठी
- शेवटी निष्कर्ष / opinion देऊ नका
- फक्त बातमी द्या

मूळ बातमी:
शीर्षक: ${title}
स्रोत: ${source}
सारांश: ${summary}

फक्त पुन्हा लिहिलेली बातमी द्या.
`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt
  });

  return response.text.trim();
}

// ✅ TEST CALL
(async () => {
  try {
    const output = await rewriteMarathiNews({
      title: "पुणे-नागपूर 'वंदे भारत' दौंड मार्गावर साडेचार तास ठप्प",
      summary: "तांत्रिक बिघाडामुळे वंदे भारत एक्सप्रेस बराच वेळ थांबली.",
      source: "Loksatta"
    });

    console.log("✅ Rewritten News:");
    console.log(output);
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
})();
