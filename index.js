require('dotenv').config();
const express = require('express');
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Web Server for Render 24/7
const app = express();
const port = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('ServerBot is running 24/7! 🚀'));
app.listen(port, () => console.log(`Web Server listening on port ${port}`));

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Collections for commands and cooldowns
client.commands = new Collection();
client.cooldowns = new Collection();

// Load handlers
const handlersPath = path.join(__dirname, 'handlers');
const handlerFiles = fs.readdirSync(handlersPath).filter(file => file.endsWith('.js'));

for (const file of handlerFiles) {
    require(path.join(handlersPath, file))(client);
}

// Map for active role claim messages (In-memory)
// Format: messageId -> { roleId, expiresAt }
client.roleClaims = new Map();

client.login(process.env.BOT_TOKEN);
