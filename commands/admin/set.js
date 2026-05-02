const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType } = require('discord.js');
const db = require('../../utils/db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('set')
        .setDescription('Configure bot settings')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(subcommand =>
            subcommand
                .setName('channels')
                .setDescription('Set a specific channel for the bot to use')
                .addStringOption(option =>
                    option.setName('type')
                        .setDescription('The type of channel to configure')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Welcome', value: 'welcomeChannel' },
                            { name: 'Logs', value: 'logsChannel' },
                            { name: 'Suggestions', value: 'suggestionsChannel' },
                            { name: 'Reports', value: 'reportsChannel' },
                            { name: 'Tickets', value: 'ticketsChannel' }
                        ))
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('The channel to assign')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('stats')
                .setDescription('Setup the automated server stats channels')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('roles')
                .setDescription('Configure staff and admin roles')
                .addStringOption(option =>
                    option.setName('type')
                        .setDescription('The type of role to configure')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Admin', value: 'adminRole' },
                            { name: 'Moderator', value: 'modRole' },
                            { name: 'Support', value: 'supportRole' }
                        ))
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('The role to assign')
                        .setRequired(true))
        ),
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild) && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            const embed = new EmbedBuilder()
                .setColor('Red')
                .setDescription('You do not have permission to use this command');
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'channels') {
            const type = interaction.options.getString('type');
            const channel = interaction.options.getChannel('channel');

            // Check if bot has permissions in the selected channel
            const botPermissions = channel.permissionsFor(interaction.client.user);
            if (!botPermissions || !botPermissions.has(PermissionFlagsBits.ViewChannel) || !botPermissions.has(PermissionFlagsBits.SendMessages)) {
                return interaction.reply({ 
                    content: `I do not have permission to view or send messages in ${channel}. Please grant me "View Channel" and "Send Messages" permissions there first.`, 
                    ephemeral: true 
                });
            }

            const newSettings = {};
            newSettings[type] = channel.id;

            const success = db.saveSettings(interaction.guild.id, newSettings);

            if (success) {
                const typeNames = {
                    'welcomeChannel': 'Welcome',
                    'logsChannel': 'Moderation Logs',
                    'suggestionsChannel': 'Suggestions',
                    'reportsChannel': 'Reports',
                    'ticketsChannel': 'Tickets'
                };

                const embed = new EmbedBuilder()
                    .setColor('Green')
                    .setTitle('Settings Updated')
                    .setDescription(`The **${typeNames[type]}** channel has been successfully set to ${channel}.`);
                await interaction.reply({ embeds: [embed] });
            } else {
                await interaction.reply({ content: 'There was an error saving the settings.', ephemeral: true });
            }
        } else if (subcommand === 'stats') {
            await interaction.deferReply({ ephemeral: true });

            try {
                const guild = interaction.guild;
                
                // Create Category
                const category = await guild.channels.create({
                    name: '📊 SERVER STATS',
                    type: ChannelType.GuildCategory,
                    permissionOverwrites: [
                        {
                            id: guild.roles.everyone.id,
                            deny: [PermissionFlagsBits.Connect],
                        }
                    ]
                });

                // Create Total Members Channel
                const totalChannel = await guild.channels.create({
                    name: `👥 Total: ${guild.memberCount.toLocaleString()}`,
                    type: ChannelType.GuildVoice,
                    parent: category.id,
                    permissionOverwrites: [
                        {
                            id: guild.roles.everyone.id,
                            deny: [PermissionFlagsBits.Connect],
                        }
                    ]
                });

                // Fetch members for online count
                await guild.members.fetch();
                const onlineCount = guild.members.cache.filter(m => 
                    m.presence && (m.presence.status === 'online' || m.presence.status === 'idle' || m.presence.status === 'dnd')
                ).size;

                // Create Online Members Channel
                const onlineChannel = await guild.channels.create({
                    name: `🟢 Online: ${onlineCount.toLocaleString()}`,
                    type: ChannelType.GuildVoice,
                    parent: category.id,
                    permissionOverwrites: [
                        {
                            id: guild.roles.everyone.id,
                            deny: [PermissionFlagsBits.Connect],
                        }
                    ]
                });

                // Save to DB
                db.saveSettings(guild.id, {
                    statsEnabled: true,
                    statsCategoryId: category.id,
                    statsTotalChannelId: totalChannel.id,
                    statsOnlineChannelId: onlineChannel.id
                });

                const embed = new EmbedBuilder()
                    .setColor('Green')
                    .setTitle('Server Stats Setup')
                    .setDescription(`Stats channels have been successfully created!\n\n- **Category:** ${category.name}\n- **Total Channel:** ${totalChannel.name}\n- **Online Channel:** ${onlineChannel.name}\n\n*Channels will update every 10 minutes.*`);
                
                await interaction.editReply({ embeds: [embed] });

            } catch (error) {
                console.error('Error setting up stats channels:', error);
                await interaction.editReply({ content: 'There was an error creating the stats channels. Please check my permissions (Manage Channels).' });
            }
        } else if (subcommand === 'roles') {
            const type = interaction.options.getString('type');
            const role = interaction.options.getRole('role');

            const newSettings = {};
            newSettings[type] = role.id;

            const success = db.saveSettings(interaction.guild.id, newSettings);

            if (success) {
                const typeNames = {
                    'adminRole': 'Admin',
                    'modRole': 'Moderator',
                    'supportRole': 'Support'
                };

                const embed = new EmbedBuilder()
                    .setColor('Green')
                    .setTitle('Roles Configured')
                    .setDescription(`The **${typeNames[type]}** role has been set to ${role}.`);
                await interaction.reply({ embeds: [embed] });
            } else {
                await interaction.reply({ content: 'Error saving roles.', ephemeral: true });
            }
        }
    },
};
