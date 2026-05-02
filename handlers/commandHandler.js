const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');

module.exports = async (client) => {
    const commandsArray = [];
    const commandsPath = path.join(__dirname, '..', 'commands');

    if (!fs.existsSync(commandsPath)) {
        fs.mkdirSync(commandsPath);
    }

    const commandFolders = fs.readdirSync(commandsPath);

    for (const folder of commandFolders) {
        const folderPath = path.join(commandsPath, folder);
        if (fs.statSync(folderPath).isDirectory()) {
            const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));
            for (const file of commandFiles) {
                const filePath = path.join(folderPath, file);
                const command = require(filePath);
                
                if ('data' in command && 'execute' in command) {
                    client.commands.set(command.data.name, command);
                    commandsArray.push(command.data.toJSON());
                } else {
                    console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
                }
            }
        }
    }

    const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);

    // Only attempt to register if token and client ID are present
    if (process.env.BOT_TOKEN && process.env.CLIENT_ID && process.env.BOT_TOKEN !== 'YOUR_BOT_TOKEN_HERE') {
        try {
            console.log(`Started refreshing ${commandsArray.length} application (/) commands.`);

            const data = await rest.put(
                Routes.applicationCommands(process.env.CLIENT_ID),
                { body: commandsArray },
            );

            console.log(`Successfully reloaded ${data.length} application (/) commands.`);
        } catch (error) {
            console.error(error);
        }
    }
};
