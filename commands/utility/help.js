const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Show all available commands'),
    async execute(interaction, client) {
        const commands = client.commands;

        const embed = new EmbedBuilder()
            .setColor('Blurple')
            .setTitle('ServerBot Commands')
            .setDescription('Here is a list of all available commands:')
            .setTimestamp()
            .setFooter({ text: 'ServerBot Help', iconURL: client.user.displayAvatarURL() });

        // Iterate through commands to build the help list
        commands.forEach(command => {
            const commandName = command.data.name;
            const description = command.data.description;
            // Provide simple usage based on options if present, otherwise just the command name
            const usage = `/${commandName}`;
            
            embed.addFields({ name: usage, value: description, inline: false });
        });

        await interaction.reply({ embeds: [embed] });
    },
};
