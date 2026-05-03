const { PermissionFlagsBits } = require('discord.js');

function isOwner(member, db, guildId) {
    // Safety check: Server Owner always has owner permissions
    if (member.id === member.guild.ownerId) return true;
    
    // In MongoDB, db is the Guild document
    const ownerRoleId = db?.roles?.owner;
    return ownerRoleId ? member.roles.cache.has(ownerRoleId) : false;
}

function isModerator(member, db, guildId) {
    // Hierarchy: Owner and Administrators are also Moderators
    if (isOwner(member, db, guildId)) return true;
    if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
    
    const modRoleId = db?.roles?.moderator;
    return modRoleId ? member.roles.cache.has(modRoleId) : false;
}

function isHelper(member, db, guildId) {
    // Hierarchy: Moderators are also Helpers
    if (isModerator(member, db, guildId)) return true;
    
    const helperRoleId = db?.roles?.helper;
    return helperRoleId ? member.roles.cache.has(helperRoleId) : false;
}

module.exports = { isOwner, isModerator, isHelper };
