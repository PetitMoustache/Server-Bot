const mongoose = require("mongoose");

async function connectDB() {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) {
        console.warn("[DATABASE] MONGO_URI not found in .env. Skipping MongoDB connection.");
        return;
    }
    await mongoose.connect(uri);
    console.log("[DATABASE] MongoDB connected successfully ✅");
  } catch (err) {
    console.error("[DATABASE] MongoDB connection error ❌", err);
  }
}

module.exports = connectDB;
