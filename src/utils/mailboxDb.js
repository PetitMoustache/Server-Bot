const User = require("../models/User");

/**
 * 📬 MAILBOX DATABASE SERVICE (MongoDB Migration)
 */

async function addMessage(userId, guildId, type, content, senderId = 'System', subject = 'No Subject') {
    try {
        let user = await User.findOne({ userId, guildId });
        if (!user) {
            user = await User.create({ userId, guildId });
        }

        user.mailbox.push({
            id: Math.random().toString(36).substr(2, 9),
            senderId,
            subject,
            type,
            content,
            timestamp: Date.now(),
            status: 'unread'
        });

        await user.save();
        return true;
    } catch (err) {
        console.error(`[MAILBOX DB] Error adding message for ${userId}:`, err);
        return false;
    }
}

async function getMessages(userId, guildId) {
    const user = await User.findOne({ userId, guildId });
    return user?.mailbox || [];
}

async function markAllAsRead(userId, guildId) {
    const user = await User.findOne({ userId, guildId });
    if (user) {
        user.mailbox.forEach(m => m.status = 'read');
        await user.save();
    }
}

async function clearMailbox(userId, guildId) {
    const user = await User.findOne({ userId, guildId });
    if (user) {
        user.mailbox = [];
        await user.save();
    }
}

async function deleteMessage(userId, guildId, messageId) {
    const user = await User.findOne({ userId, guildId });
    if (user) {
        user.mailbox = user.mailbox.filter(m => m.id !== messageId);
        await user.save();
    }
}

async function getMessageById(userId, guildId, messageId) {
    const user = await User.findOne({ userId, guildId });
    return user?.mailbox.find(m => m.id === messageId);
}

async function markAsRead(userId, guildId, messageId) {
    const user = await User.findOne({ userId, guildId });
    if (user) {
        const message = user.mailbox.find(m => m.id === messageId);
        if (message) {
            message.status = 'read';
            await user.save();
        }
    }
}

module.exports = { addMessage, getMessages, markAllAsRead, clearMailbox, deleteMessage, getMessageById, markAsRead };
