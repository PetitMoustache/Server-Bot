require("dotenv").config();
const express = require("express");
const { client } = require("./src/client");
const loadEvents = require("./src/handlers/eventHandler");
const loadCommands = require("./src/handlers/commandHandler");

// Web Server for Render 24/7
const app = express();
const port = process.env.PORT || 3000;
app.get("/", (req, res) => res.send("ServerBot is running 24/7! 🚀"));
app.listen(port, () => console.log(`[SERVER] Web Server listening on port ${port}`));

client.once("ready", () => {
  console.log(`[BOT] Logged in as ${client.user.tag}`);
});

// Initialize Handlers
loadEvents(client);
loadCommands(client);

client.login(process.env.BOT_TOKEN);
