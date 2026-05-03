const { SlashCommandBuilder } = require('discord.js');
const mailboxSystem = require('../../systems/mailboxSystem');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mailbox')
        .setDescription('Access your personal MailX dashboard and messages')
        .addSubcommand(sub => 
            sub.setName('open')
                .setDescription('Open your interactive MailX dashboard'))
        .addSubcommand(sub => 
            sub.setName('read')
                .setDescription('Read your messages directly'))
        .addSubcommand(sub => 
            sub.setName('compose')
                .setDescription('Compose a new message to a user')
                .addUserOption(opt => opt.setName('target').setDescription('The user to message').setRequired(true))),
    
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'open') {
            return mailboxSystem.open(interaction);
        }

        if (subcommand === 'read') {
            return mailboxSystem.read(interaction);
        }

        if (subcommand === 'compose') {
            return mailboxSystem.compose(interaction);
        }
    }
};


