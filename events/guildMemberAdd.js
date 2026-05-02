const { Events, EmbedBuilder } = require('discord.js');
const db = require('../utils/db');

module.exports = {
    name: Events.GuildMemberAdd,
    async execute(member) {
        const settings = db.getSettings(member.guild.id);
        const welcomeChannelId = settings.welcomeChannel;

        if (!welcomeChannelId) return; // No welcome channel configured

        try {
            const channel = await member.guild.channels.fetch(welcomeChannelId);
            if (!channel) return;

            const welcomeEmbed = new EmbedBuilder()
                .setColor('Gold')
                .setTitle(`Welcome to ${member.guild.name}!`)
                .setDescription(`Hello ${member}, welcome to the server! We are glad to have you here.`)
                .setThumbnail(member.user.displayAvatarURL())
                .setTimestamp()
                .setFooter({ text: `Member #${member.guild.memberCount}` });

            await channel.send({ content: `${member}`, embeds: [welcomeEmbed] });
        } catch (error) {
            console.error('Error sending welcome message:', error);
        }
    },
};
