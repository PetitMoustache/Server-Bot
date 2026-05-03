const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  userId: { type: String, required: true },

  level: { type: Number, default: 1 },
  xp: { type: Number, default: 0 },
  rep: { type: Number, default: 0 },

  mailbox: [{
    id: String,
    senderId: String,
    subject: String,
    type: String,
    content: String,
    timestamp: { type: Number, default: Date.now },
    status: { type: String, default: 'unread' }
  }]
});

// Index for faster lookups
userSchema.index({ guildId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model("User", userSchema);
