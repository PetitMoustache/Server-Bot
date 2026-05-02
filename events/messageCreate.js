const { Events } = require('discord.js');

const responses = [
  "Hey 👋 I'm here",
  "Yes? Tell me",
  "How can I help you?",
  "I’m listening",
  "Go ahead 😄",
  "Need something?",
  "I’m online and ready",
  "What’s up?",
  "Yes, I saw you",
  "Talk to me"
];

const reactions = ["👍", "❤️", "🔥", "✨", "👀"];

let lastResponse = null;

function getRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getSmartResponse() {
  let response;
  // Prevent repeating the same response if there are enough options
  do {
    response = getRandom(responses);
  } while (response === lastResponse && responses.length > 1);
  
  lastResponse = response;
  return response;
}

module.exports = {
    name: Events.MessageCreate,
    async execute(message, client) {
        // Ignore bot messages
        if (message.author.bot) return;

        // Check if the bot was mentioned
        if (message.mentions.has(client.user)) {
            const content = message.content.toLowerCase();

            // Level Pro: Context-aware responses
            if (content.includes("help")) {
                const msg = await message.reply("Use /ticket to get support 👇");
                await msg.react(getRandom(reactions));
                return;
            }

            if (content.includes("hello") || content.includes("hi")) {
                const msg = await message.reply("Hello there 👋");
                await msg.react(getRandom(reactions));
                return;
            }

            // Standard random response
            const reply = getSmartResponse();
            const msg = await message.reply(reply);

            // Random reaction
            await msg.react(getRandom(reactions));
        }
    }
};
