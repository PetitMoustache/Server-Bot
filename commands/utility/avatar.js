const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('avatar')
        .setDescription('Show detailed user profile information')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('The user whose profile you want to see')
                .setRequired(false)),
    async execute(interaction) {
        const user = interaction.options.getUser('user') || interaction.user;
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);

        const embed = new EmbedBuilder()
            .setTitle(`👤 User Profile: ${user.username}`)
            .setThumbnail(user.displayAvatarURL({ size: 1024, dynamic: true }))
            .setColor(member?.displayHexColor || 'Blue')
            .setTimestamp();

        // User Information
        let userInfo = `**ID:** ${user.id}\n**Tag:** ${user.tag}`;
        embed.addFields({ name: '👤 USER INFO', value: userInfo, inline: false });

        // Server Information
        if (member) {
            const joinedAt = Math.floor(member.joinedTimestamp / 1000);
            const createdAt = Math.floor(user.createdTimestamp / 1000);
            
            let serverInfo = `**Joined:** <t:${joinedAt}:F> (<t:${joinedAt}:R>)\n**Created:** <t:${createdAt}:F> (<t:${createdAt}:R>)`;
            
            if (member.premiumSince) {
                serverInfo += `\n**Boosting since:** <t:${Math.floor(member.premiumSinceTimestamp / 1000)}:R>`;
            }

            embed.addFields({ name: '📅 SERVER INFO', value: serverInfo, inline: false });

            // Roles
            const roles = member.roles.cache
                .filter(role => role.name !== '@everyone')
                .sort((a, b) => b.position - a.position)
                .map(role => role.toString());

            let rolesDisplay = 'None';
            if (roles.length > 0) {
                const limit = 15;
                rolesDisplay = roles.slice(0, limit).join(', ');
                if (roles.length > limit) {
                    rolesDisplay += ` and ${roles.length - limit} more...`;
                }
            }

            embed.addFields(
                { name: `🎭 ROLES [${roles.length}]`, value: rolesDisplay, inline: false },
                { name: '📊 EXTRA INFO', value: `**Highest Role:** ${member.roles.highest}\n**Permissions:** ${member.permissions.has(PermissionFlagsBits.Administrator) ? 'Administrator' : 'Member'}`, inline: true }
            );
        } else {
            // Fallback for users not in the server
            const createdAt = Math.floor(user.createdTimestamp / 1000);
            embed.addFields({ name: '📅 ACCOUNT INFO', value: `**Created:** <t:${createdAt}:F> (<t:${createdAt}:R>)\n*User is not in this server.*`, inline: false });
        }

        // Main Image (Avatar)
        embed.setImage(user.displayAvatarURL({ size: 1024, dynamic: true }));

        await interaction.reply({ embeds: [embed] });
    },
};

