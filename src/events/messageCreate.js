const { Events, PermissionFlagsBits } = require('discord.js');
const { addXP } = require('../systems/xpSystem');
const { getGuildData } = require('../database/db');
const { updateMemory, incrementMention } = require('../utils/userMemory');

module.exports = {
    name: Events.MessageCreate,
    async execute(message, client) {
        if (message.author.bot || !message.guild) return;

        // 1. XP System
        const xpRes = await addXP(message.author.id, message.guild.id);

        if (xpRes && xpRes.leveledUp) {
            message.channel.send(`🎉 ${message.author} reached level **${xpRes.level}**!`);
        }

        // 2. Natural Auto-Responses
        const msg = message.content.toLowerCase();
        if (msg.includes("thanks") || msg.includes("thx")) {
            await message.react("❤️");
            return message.reply("you’re welcome ❤️");
        }
        if (msg.includes("good bot")) {
            await message.react("😊");
            return message.reply("appreciate it ❤️");
        }
        if (msg === "hi" || msg === "hello") {
            await message.react("👋");
            return message.reply("hey 👋");
        }

        // 3. User Memory & Staff Check
        const guildData = await getGuildData(message.guild.id);
        const settings = guildData?.settings || {};

        const isStaff = message.member.permissions.has(PermissionFlagsBits.ManageMessages) || 
                       message.member.roles.cache.has(settings.modRole) ||
                       message.member.roles.cache.has(settings.adminRole);
        
        updateMemory(message.author.id, message.guild.id, isStaff);

        if (message.mentions.has(client.user)) {
            incrementMention(message.author.id, message.guild.id);
        }
    }
};
