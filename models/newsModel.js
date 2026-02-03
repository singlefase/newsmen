const { connectToDatabase } = require("../config/database");

// Get News Articles Collection
async function getNewsCollection() {
  const { mongodb } = await connectToDatabase();
  return mongodb.collection("news_articles");
}

module.exports = {
  getNewsCollection
};
