# Category Keywords Mapping for Multi-Category Detection

## Fixed Categories (19 Total)

### Location Categories (8):
1. **desh** (देश) - National/Country
2. **videsh** (विदेश) - International/Foreign
3. **maharastra** (महाराष्ट्र) - Maharashtra State
4. **pune** (पुणे) - Pune City
5. **mumbai** (मुंबई) - Mumbai City
6. **nashik** (नाशिक) - Nashik City
7. **ahmednagar** (अहमदनगर/अहिल्यानगर) - Ahmednagar/Ahilyanagar
8. **aurangabad** (औरंगाबाद/संभाजीनगर) - Aurangabad/Sambhajinagar

### Topic Categories (11):
9. **political** (राजकारण) - Politics
10. **sports** (क्रीडा) - Sports
11. **entertainment** (मनोरंजन) - Entertainment
12. **tourism** (पर्यटन) - Tourism
13. **lifestyle** (जीवनशैली) - Lifestyle
14. **agriculture** (शेती) - Agriculture
15. **government** (सरकार) - Government
16. **trade** (व्यापार) - Trade/Business
17. **health** (आरोग्य) - Health
18. **horoscope** (भविष्य) - Horoscope/Astrology

---

## Keyword Mapping for Category Detection

### Location Keywords:

#### desh (देश):
- देश, भारत, राष्ट्रीय, राष्ट्र, देशभर, देशात, देशाचा, देशातील
- National, India, country-wide

#### videsh (विदेश):
- विदेश, परदेश, आंतरराष्ट्रीय, जागतिक, विदेशी, विदेशात
- International, foreign, abroad, global

#### maharastra (महाराष्ट्र):
- महाराष्ट्र, महाराष्ट्रात, महाराष्ट्राचा, महाराष्ट्रातील, राज्य
- Maharashtra, state

#### pune (पुणे):
- पुणे, पुण्यात, पुण्याचा, पुण्यातील, पुण्याला, पुण्यामध्ये
- Pune, Poona

#### mumbai (मुंबई):
- मुंबई, मुंबईत, मुंबईचा, मुंबईतील, मुंबईला, मुंबईमध्ये, बॉम्बे
- Mumbai, Bombay

#### nashik (नाशिक):
- नाशिक, नाशिकात, नाशिकचा, नाशिकातील, नाशिकला, नाशिकमध्ये
- Nashik, Nasik

#### ahmednagar (अहमदनगर/अहिल्यानगर):
- अहमदनगर, अहिल्यानगर, अहमदनगरात, अहिल्यानगरात, अहमदनगरचा, अहिल्यानगरचा
- Ahmednagar, Ahilyanagar

#### aurangabad (औरंगाबाद/संभाजीनगर):
- औरंगाबाद, संभाजीनगर, औरंगाबादात, संभाजीनगरात, औरंगाबादचा, संभाजीनगरचा
- Aurangabad, Sambhajinagar

---

### Topic Keywords:

#### political (राजकारण):
- राजकारण, राजकीय, आमदार, खासदार, मंत्री, मुख्यमंत्री, पक्ष, निवडणूक, राज्यसभा, लोकसभा
- Politics, political, MLA, MP, minister, chief minister, party, election

#### sports (क्रीडा):
- क्रीडा, खेळ, स्पोर्ट्स, क्रिकेट, फुटबॉल, हॉकी, ऑलिम्पिक, खेळाडू, स्पर्धा
- Sports, game, cricket, football, hockey, olympics, player, competition

#### entertainment (मनोरंजन):
- मनोरंजन, चित्रपट, फिल्म, अभिनेता, अभिनेत्री, गायक, संगीत, नाटक, स्टेज
- Entertainment, movie, film, actor, actress, singer, music, drama, stage

#### tourism (पर्यटन):
- पर्यटन, पर्यटक, टूर, सफर, यात्रा, ठिकाण, दर्शनीय, हॉटेल, रिसॉर्ट
- Tourism, tourist, tour, travel, journey, place, sightseeing, hotel, resort

#### lifestyle (जीवनशैली):
- जीवनशैली, फॅशन, कपडे, सौंदर्य, ब्यूटी, फिटनेस, आहार, आरोग्य, वजन
- Lifestyle, fashion, clothes, beauty, fitness, diet, health, weight

#### agriculture (शेती):
- शेती, शेतकरी, पिक, धान्य, बियाणे, खते, सिंचन, शेत, कृषी
- Agriculture, farmer, crop, grain, seed, fertilizer, irrigation, farm, farming

#### government (सरकार):
- सरकार, सरकारी, प्रशासन, नगरपालिका, महापालिका, पालिका, सरकारी योजना, सरकारी निर्णय
- Government, administrative, municipality, corporation, government scheme, government decision

#### trade (व्यापार):
- व्यापार, व्यापारी, व्यवसाय, बाजार, दुकान, कंपनी, उद्योग, निर्यात, आयात
- Trade, business, market, shop, company, industry, export, import

#### health (आरोग्य):
- आरोग्य, आरोग्य सेवा, रुग्णालय, डॉक्टर, औषध, उपचार, रोग, आजार, वैद्यकीय
- Health, healthcare, hospital, doctor, medicine, treatment, disease, medical

#### horoscope (भविष्य):
- भविष्य, राशी, ज्योतिष, राशिफल, तारा, ग्रह, कुंडली, भविष्यवाणी
- Horoscope, zodiac, astrology, star, planet, prediction

---

## Detection Logic

### Step 1: Location Detection
```javascript
// Check title and description for location keywords
if (text.includes("पुणे") || text.includes("Pune")) {
  categories.push("pune");
  categories.push("maharastra"); // Pune is in Maharashtra
}
if (text.includes("मुंबई") || text.includes("Mumbai")) {
  categories.push("mumbai");
  categories.push("maharastra");
}
// ... for all locations
```

### Step 2: Topic Detection
```javascript
// Check for topic keywords
if (text.includes("राजकारण") || text.includes("आमदार")) {
  categories.push("political");
}
if (text.includes("क्रीडा") || text.includes("खेळ")) {
  categories.push("sports");
}
// ... for all topics
```

### Step 3: AI Classification (Optional)
```javascript
// Use Gemini to detect additional categories
const aiCategories = await classifyCategories(title, description);
categories = [...new Set([...categories, ...aiCategories])]; // Merge and deduplicate
```

### Step 4: Set Primary Category
```javascript
// Primary category = most specific location OR first topic
if (locationCategories.length > 0) {
  primaryCategory = locationCategories[0]; // Most specific location
} else if (topicCategories.length > 0) {
  primaryCategory = topicCategories[0]; // First topic
} else {
  primaryCategory = "general"; // Fallback
}
```

---

## MongoDB Query Examples

### Single Category:
```javascript
db.processed_news_data.find({ categories: "sports" })
```

### Multiple Categories (OR - news in any):
```javascript
db.processed_news_data.find({ categories: { $in: ["sports", "political"] } })
```

### Multiple Categories (AND - news in all):
```javascript
db.processed_news_data.find({ categories: { $all: ["pune", "political"] } })
```

### Single Category with Primary:
```javascript
db.processed_news_data.find({ 
  $or: [
    { categories: "sports" },
    { primaryCategory: "sports" }
  ]
})
```

---

## Indexes Required

```javascript
// Index for efficient category queries
db.processed_news_data.createIndex({ categories: 1, publishedAt: -1 })
db.processed_news_data.createIndex({ primaryCategory: 1, publishedAt: -1 })
db.unprocessed_news_data.createIndex({ categories: 1, fetchedAt: 1 })
```

---

**Document Created:** 2026-02-12  
**Purpose:** Category detection keyword mapping for multi-category support
