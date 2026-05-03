require("dotenv").config();
const express = require("express");
const { client } = require("./src/client");
const loadEvents = require("./src/handlers/eventHandler");
const loadCommands = require("./src/handlers/commandHandler");
const connectDB = require("./src/database/mongoose");

// Connect to Database
connectDB();


// 🛡️ 1. ANTI-CRASH SYSTEM
// Prevents the bot from crashing on unexpected errors
process.on("unhandledRejection", (reason, promise) => {
    console.error("[ANTI-CRASH] Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (err, origin) => {
    console.error("[ANTI-CRASH] Uncaught Exception:", err, "at:", origin);
});

// 🌐 2. KEEP-ALIVE SERVER
// Required by many hosting providers to keep the process active
const app = express();
const port = process.env.PORT || 3000;

app.get("/", (req, res) => {
    res.send("Bot is alive! 🚀");
});

app.listen(port, () => {
    console.log(`[SERVER] Web Server listening on port ${port}`);
});

// 🤖 3. INITIALIZE BOT
console.log("[LOADER] Initializing events...");
loadEvents(client);

console.log("[LOADER] Initializing commands...");
loadCommands(client);

// 🚀 4. LOGIN
// Uses TOKEN (Discloud preferred) or BOT_TOKEN (local legacy)
const token = process.env.TOKEN || process.env.BOT_TOKEN;

if (!token) {
    console.error("[ERROR] No token provided! Please set TOKEN or BOT_TOKEN in environment variables.");
    process.exit(1);
}

client.login(token).then(() => {
    // Basic console logging for ready event is handled in eventHandler, 
    // but we add a confirmation here too.
    console.log(`[BOT] Login successful!`);
}).catch(err => {
    console.error("[BOT] Login failed:", err);
});
