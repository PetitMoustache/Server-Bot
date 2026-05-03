const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const mod = require("../../systems/modSystem");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("user")
    .setDescription("User moderation management")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addSubcommand(s =>
      s.setName("mute")
        .setDescription("Mute a user")
        .addUserOption(o => o.setName("target").setDescription("User to mute").setRequired(true))
        .addStringOption(o => o.setName("time").setDescription("Duration (e.g., 10m, 2h, 1d)").setRequired(true))
        .addStringOption(o => o.setName("reason").setDescription("Reason for mute").setRequired(true))
    )
    .addSubcommand(s =>
      s.setName("unmute")
        .setDescription("Unmute a user")
        .addUserOption(o => o.setName("target").setDescription("User to unmute").setRequired(true))
        .addStringOption(o => o.setName("reason").setDescription("Reason for unmute").setRequired(false))
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === "mute") return mod.mute(interaction);
    if (sub === "unmute") return mod.unmute(interaction);
  }
};
