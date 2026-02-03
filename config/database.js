const { MongoClient, ServerApiVersion } = require("mongodb");
const dotenv = require("dotenv");

dotenv.config(); // Load environment variables

const mongouri = process.env.MONGO_URL;

if (!mongouri) {
  console.error("❌ MONGO_URL is not set in environment variables");
  process.exit(1);
}

let client;
let mongodb;
let isConnected = false;

async function connectToDatabase() {
  if (!isConnected) {
    try {
      client = new MongoClient(mongouri, {
        serverApi: ServerApiVersion.v1,
        maxPoolSize: 10,
        connectTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        serverSelectionTimeoutMS: 10000,
      });

      await client.connect();
      mongodb = client.db();
      isConnected = true;

      console.log("✅ Connected to MongoDB");

      client.on("close", () => {
        console.warn("⚠️ MongoDB connection lost! Reconnecting...");
        isConnected = false;
      });

    } catch (error) {
      console.error("❌ MongoDB connection error:", error);
      throw new Error("Failed to connect to MongoDB");
    }
  }
  return { client, mongodb };
}

// Graceful shutdown
process.on('SIGINT', async () => {
  if (client) {
    await client.close();
    console.log('MongoDB connection closed');
    process.exit(0);
  }
});

module.exports = { connectToDatabase };
