const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../database/db');
const { checkAbuse } = require('../../utils/antiAbuse');

module.exports = {
    cooldown: 120,
    data: new SlashCommandBuilder()
        .setName('suggest')
        .setDescription('Send a structured suggestion')
        .addStringOption(option => 
            option.setName('title')
                .setDescription('The title of your suggestion')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('description')
                .setDescription('Detailed explanation of your suggestion')
                .setRequired(true)),
    async execute(interaction) {
        const title = interaction.options.getString('title');
        const description = interaction.options.getString('description');
        
        if (checkAbuse(interaction, 'suggestion', description)) return;

        const settings = db.getSettings(interaction.guild.id);
        const suggestionChannelId = settings.suggestionsChannel;

        if (!suggestionChannelId) {
            return interaction.reply({ content: 'Suggestion channel is not configured for this server. Please ask an admin to set it up using `/set channels`.', ephemeral: true });
        }

        const channel = interaction.guild.channels.cache.get(suggestionChannelId);
        
        if (!channel) {
            return interaction.reply({ content: 'Could not find the suggestions channel. Check my permissions.', ephemeral: true });
        }

        const suggestEmbed = new EmbedBuilder()
            .setColor('Gold')
            .setTitle(`💡 Suggestion: ${title}`)
            .setDescription(description)
            .addFields(
                { name: 'Author', value: `${interaction.user} (${interaction.user.tag})`, inline: true },
                { name: 'Server', value: interaction.guild.name, inline: true }
            )
            .setThumbnail(interaction.user.displayAvatarURL())
            .setTimestamp();

        try {
            const message = await channel.send({ embeds: [suggestEmbed] });
            await message.react('👍');
            await message.react('👎');
            
            const replyEmbed = new EmbedBuilder()
                .setColor('Green')
                .setTitle('Suggestion Sent Successfully')
                .setDescription('Your suggestion has been sent to the community.\nThank you for your feedback!')
                .setTimestamp();
                
            await interaction.reply({ embeds: [replyEmbed], ephemeral: true });
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'There was an error sending the suggestion. Please check my permissions in that channel.', ephemeral: true });
        }
    },
};
