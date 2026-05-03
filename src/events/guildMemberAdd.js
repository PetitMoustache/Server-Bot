const { Events, EmbedBuilder, ChannelType } = require('discord.js');
const { getSettings } = require('../database/db');

module.exports = {
    name: Events.GuildMemberAdd,
    async execute(member) {
        const guild = member.guild;
        const settings = getSettings(guild.id);
        
        // Find a channel to welcome the user
        // Priority: 1. Configured welcome channel (if added to settings) 2. System channel 3. First text channel
        let channel = guild.systemChannel;
        
        if (!channel) {
            channel = guild.channels.cache.find(c => 
                c.type === ChannelType.GuildText && 
                c.permissionsFor(guild.members.me).has('SendMessages')
            );
        }

        if (!channel) return;

        const welcomeEmbed = new EmbedBuilder()
            .setTitle(`👋 Welcome to ${guild.name}!`)
            .setDescription(`Hello ${member}! We're glad to have you here.\n\n**Quick Start Guide:**\n🎫 Use \`/ticket open\` if you need help.\n🚨 Use \`/report user\` to report issues.\n💡 Use \`/suggest\` to share your ideas.\n⭐ Use \`/reputation give\` to thank others!`)
            .setColor('#5865F2')
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
            .setFooter({ text: `Member #${guild.memberCount}` })
            .setTimestamp();

        try {
            await channel.send({ content: `Hey ${member}, welcome!`, embeds: [welcomeEmbed] });
        } catch (err) {
            console.error('[WELCOME ERROR]', err);
        }
    }
};
