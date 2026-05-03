const fs = require("fs");
const path = require("path");
const { REST, Routes } = require("discord.js");

module.exports = async (client) => {
  const commandsArray = [];
  const commandsPath = path.join(__dirname, "..", "commands");

  if (!fs.existsSync(commandsPath)) return;

  const folders = fs.readdirSync(commandsPath);

  for (const folder of folders) {
    const folderPath = path.join(commandsPath, folder);
    if (!fs.statSync(folderPath).isDirectory()) continue;

    const files = fs.readdirSync(folderPath).filter((f) => f.endsWith(".js"));

    for (const file of files) {
      const filePath = path.join(folderPath, file);
      const command = require(filePath);

      if ("data" in command && "execute" in command) {
        client.commands.set(command.data.name, command);
        commandsArray.push(command.data.toJSON());
      }
    }
  }

  const rest = new REST({ version: "10" }).setToken(process.env.BOT_TOKEN);

  if (process.env.BOT_TOKEN && process.env.CLIENT_ID) {
    try {
      console.log(`[LOADER] Syncing ${commandsArray.length} commands...`);
      await rest.put(
        Routes.applicationCommands(process.env.CLIENT_ID),
        { body: commandsArray }
      );
    } catch (error) {
      console.error("[LOADER] Command Sync Error:", error);
    }
  }
};
