const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('channel')
        .setDescription('Create a temporary private channel')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .addSubcommand(subcommand =>
            subcommand
                .setName('private')
                .setDescription('Create a temporary private channel')
                .addStringOption(option => 
                    option.setName('name')
                        .setDescription('Name of the channel')
                        .setRequired(true))
                .addUserOption(option => 
                    option.setName('user')
                        .setDescription('User who can see the channel')
                        .setRequired(true))
                .addIntegerOption(option => 
                    option.setName('time')
                        .setDescription('Time in minutes until the channel is deleted')
                        .setRequired(true))
        ),
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels) && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            const embed = new EmbedBuilder()
                .setColor('Red')
                .setDescription('You do not have permission to use this command');
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        const name = interaction.options.getString('name');
        const user = interaction.options.getUser('user');
        const timeInMinutes = interaction.options.getInteger('time');

        const embed = new EmbedBuilder()
            .setColor('Green')
            .setTitle('Private Channel Created')
            .setDescription(`Creating private channel for ${user}...`)
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });

        try {
            const channel = await interaction.guild.channels.create({
                name: name,
                type: ChannelType.GuildText,
                permissionOverwrites: [
                    {
                        id: interaction.guild.id,
                        deny: [PermissionFlagsBits.ViewChannel],
                    },
                    {
                        id: user.id,
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
                    },
                    {
                        id: interaction.client.user.id,
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels],
                    }
                ],
            });

            const welcomeEmbed = new EmbedBuilder()
                .setColor('Blue')
                .setTitle(`Welcome to your private channel, ${user.username}`)
                .setDescription(`This channel is private and will be automatically deleted in ${timeInMinutes} minutes.`)
                .setTimestamp();

            await channel.send({ content: `${user}`, embeds: [welcomeEmbed] });

            setTimeout(async () => {
                try {
                    await channel.delete('Temporary private channel expired');
                } catch (error) {
                    console.error('Failed to delete temporary channel:', error);
                }
            }, timeInMinutes * 60 * 1000);

            const updatedEmbed = EmbedBuilder.from(embed)
                .setDescription(`Successfully created private channel ${channel} for ${user}. It will be deleted in ${timeInMinutes} minutes.`);
            
            await interaction.editReply({ embeds: [updatedEmbed] });

        } catch (error) {
            console.error('Error creating private channel:', error);
            await interaction.editReply({ content: 'There was an error creating the private channel.', embeds: [] });
        }
    },
};
