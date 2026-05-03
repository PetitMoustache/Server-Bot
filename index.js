require("dotenv").config();
const express = require("express");
const { client } = require("./src/client");
const loadEvents = require("./src/handlers/eventHandler");
const loadCommands = require("./src/handlers/commandHandler");

// 🧱 1. SISTEMA ANTI-CRASH
process.on("unhandledRejection", (reason, promise) => {
    console.error("[ANTI-CRASH] Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (err, origin) => {
    console.error("[ANTI-CRASH] Uncaught Exception:", err, "at:", origin);
});

// Web Server for Render 24/7
const app = express();
const port = process.env.PORT || 3000;
app.get("/", (req, res) => res.send("ServerBot is running 24/7! 🚀"));
app.listen(port, () => console.log(`[SERVER] Web Server listening on port ${port}`));

// Initialize Handlers
console.log("[LOADER] Initializing events...");
loadEvents(client);
console.log("[LOADER] Initializing commands...");
loadCommands(client);

client.login(process.env.BOT_TOKEN);
