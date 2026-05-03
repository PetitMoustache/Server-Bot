const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { getGuildData } = require("../../database/db");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("set")
    .setDescription("Server configuration")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName("role")
        .setDescription("Set server roles")
        .addRoleOption(o =>
          o.setName("owner")
            .setDescription("Owner role")
        )
        .addRoleOption(o =>
          o.setName("moderator")
            .setDescription("Moderator role")
        )
        .addRoleOption(o =>
          o.setName("helper")
            .setDescription("Helper role")
        )
    ),

  async execute(interaction) {
    const db = await getGuildData(interaction.guild.id);
    if (!db) return interaction.reply({ content: "❌ Database error.", ephemeral: true });

    const owner = interaction.options.getRole("owner");
    const mod = interaction.options.getRole("moderator");
    const helper = interaction.options.getRole("helper");

    let updated = false;
    if (owner) { db.roles.owner = owner.id; updated = true; }
    if (mod) { db.roles.moderator = mod.id; updated = true; }
    if (helper) { db.roles.helper = helper.id; updated = true; }

    if (!updated) {
        return interaction.reply({ content: "❌ Please specify at least one role to set.", ephemeral: true });
    }

    await db.save();

    interaction.reply("Roles configured successfully ✅");
  }
};
