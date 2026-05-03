const mongoose = require("mongoose");

const guildSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },

  settings: {
    ticketsChannel: String,
    logsChannel: String,
    reportsChannel: String,
    statsEnabled: { type: Boolean, default: false },
    modRole: String,
    adminRole: String,
    supportRole: String
  },

  roles: {
    owner: String,
    moderator: String,
    helper: String
  },

  tickets: [{
    id: String,
    userId: String,
    reason: String,
    status: { type: String, default: 'pending' },
    messageId: String,
    channelId: String,
    createdAt: { type: Number, default: Date.now },
    closedAt: Number
  }]
});

module.exports = mongoose.model("Guild", guildSchema);
