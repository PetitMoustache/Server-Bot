const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('post')
        .setDescription('Create a role claim message with button')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
        .addRoleOption(option => 
            option.setName('role')
                .setDescription('The role to be claimed')
                .setRequired(true))
        .addIntegerOption(option => 
            option.setName('time')
                .setDescription('Time in minutes until the button expires')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('note')
                .setDescription('Optional note to include in the message')
                .setRequired(false)),
    async execute(interaction, client) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageRoles) && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            const embed = new EmbedBuilder()
                .setColor('Red')
                .setDescription('You do not have permission to use this command');
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        const role = interaction.options.getRole('role');
        const timeInMinutes = interaction.options.getInteger('time');
        const note = interaction.options.getString('note');

        const expiresAt = Date.now() + timeInMinutes * 60 * 1000;
        const timestamp = Math.round(expiresAt / 1000);

        const embed = new EmbedBuilder()
            .setColor('Blurple')
            .setTitle('Role Claim')
            .setDescription(`Click the button below to claim the ${role} role!\n\n**Expires:** <t:${timestamp}:R>`)
            .setTimestamp();

        if (note) {
            embed.addFields({ name: 'Note', value: note });
        }

        const button = new ButtonBuilder()
            .setCustomId(`claim_role_${role.id}`)
            .setLabel('Claim Role')
            .setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder().addComponents(button);

        const message = await interaction.reply({ 
            embeds: [embed], 
            components: [row],
            fetchReply: true 
        });

        // Store claim data
        client.roleClaims.set(message.id, {
            roleId: role.id,
            expiresAt: expiresAt
        });

        // Disable button after time expires
        setTimeout(async () => {
            const disabledButton = ButtonBuilder.from(button).setDisabled(true);
            const disabledRow = new ActionRowBuilder().addComponents(disabledButton);
            
            const expiredEmbed = EmbedBuilder.from(embed)
                .setDescription(`This role claim has expired.`)
                .setColor('NotQuiteBlack');

            try {
                await interaction.editReply({ embeds: [expiredEmbed], components: [disabledRow] });
                client.roleClaims.delete(message.id);
            } catch (error) {
                console.error('Failed to disable role claim button:', error);
            }
        }, timeInMinutes * 60 * 1000);
    },
};
