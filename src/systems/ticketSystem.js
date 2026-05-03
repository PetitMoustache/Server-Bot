const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits } = require("discord.js");
const { load, save } = require("../database/db");

/**
 * 🎫 TICKET SYSTEM - LOGIC LAYER
 */

async function open(interaction) {
    const reason = interaction.options.getString("reason") || "No reason provided";
    const guild = interaction.guild;
    const db = load("guilds");
    
    // Inicializar DB si no existe
    if (!db[guild.id]) db[guild.id] = { settings: {}, tickets: [] };
    const settings = db[guild.id].settings || {};
    
    // 1. Buscar canal de destino
    const channelId = settings.ticketsChannel;
    let targetChannel = guild.channels.cache.get(channelId);

    if (!targetChannel) {
        return interaction.reply({ 
            content: "❌ **Setup Error:** The tickets channel is not configured. Use `/set channel` first.", 
            ephemeral: true 
        });
    }

    // 2. Generar Ticket
    const ticketId = Math.random().toString(16).slice(2, 10).toUpperCase();
    
    const ticketEmbed = new EmbedBuilder()
        .setTitle(`🆘 New Ticket • #${ticketId}`)
        .setDescription(`A user has requested support.`)
        .addFields(
            { name: "👤 User", value: `${interaction.user} (${interaction.user.tag})`, inline: true },
            { name: "🆔 User ID", value: `\`${interaction.user.id}\``, inline: true },
            { name: "📋 Reason", value: `\`\`\`${reason}\`\`\`` }
        )
        .setColor("Orange")
        .setFooter({ text: "Click the button below to claim this ticket." })
        .setTimestamp();

    const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`ticket_accept_${interaction.user.id}_${ticketId}`)
            .setLabel("Accept Ticket")
            .setStyle(ButtonStyle.Success)
            .setEmoji("✅"),
        new ButtonBuilder()
            .setCustomId(`ticket_deny_${interaction.user.id}_${ticketId}`)
            .setLabel("Deny")
            .setStyle(ButtonStyle.Danger)
            .setEmoji("✖️")
    );

    try {
        const msg = await targetChannel.send({ embeds: [ticketEmbed], components: [buttons] });

        // Guardar en DB
        if (!db[guild.id].tickets) db[guild.id].tickets = [];
        db[guild.id].tickets.push({
            id: ticketId,
            userId: interaction.user.id,
            reason: reason,
            status: "pending",
            messageId: msg.id,
            createdAt: Date.now()
        });
        save("guilds", db);

        return interaction.reply({ 
            content: `✅ **Success!** Your ticket (#${ticketId}) has been sent to the staff.`, 
            ephemeral: true 
        });
    } catch (err) {
        console.error("[TICKET SYSTEM] Error sending message:", err);
        return interaction.reply({ content: "❌ Error sending ticket to the staff channel.", ephemeral: true });
    }
}

async function close(interaction) {
    const id = interaction.options.getString("id").toUpperCase();
    const db = load("guilds");
    const tickets = db[interaction.guild.id]?.tickets || [];
    
    const ticket = tickets.find(t => t.id === id);
    if (!ticket) return interaction.reply({ content: "❌ Ticket not found.", ephemeral: true });

    ticket.status = "closed";
    ticket.closedAt = Date.now();
    save("guilds", db);

    // Si estamos en un canal de ticket, podemos intentar borrarlo
    if (interaction.channel.name.includes("ticket-")) {
        await interaction.reply("🔒 Closing ticket in 5 seconds...");
        setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
    } else {
        return interaction.reply({ content: `✅ Ticket #${id} marked as closed.`, ephemeral: true });
    }
}

async function list(interaction) {
    const db = load("guilds");
    const tickets = db[interaction.guild.id]?.tickets || [];
    
    if (tickets.length === 0) return interaction.reply({ content: "No tickets in database.", ephemeral: true });

    const recent = tickets.slice(-10).reverse();
    const listEmbed = new EmbedBuilder()
        .setTitle("🎫 Recent Tickets")
        .setColor("Blue")
        .setDescription(recent.map(t => `**#${t.id}** | <@${t.userId}> | \`${t.status}\``).join("\n"));

    return interaction.reply({ embeds: [listEmbed], ephemeral: true });
}

/**
 * 🖱️ Button Handler Logic
 */
async function handleButtons(interaction) {
    const [prefix, action, userId, ticketId] = interaction.customId.split("_");
    if (prefix !== "ticket") return;

    await interaction.deferReply({ ephemeral: true });
    const db = load("guilds");
    const guild = interaction.guild;

    // 1. ACEPTAR TICKET
    if (action === "accept") {
        const member = await guild.members.fetch(userId).catch(() => null);
        if (!member) return interaction.editReply("❌ User left the server.");

        try {
            const channel = await guild.channels.create({
                name: `ticket-${member.user.username}`,
                type: ChannelType.GuildText,
                permissionOverwrites: [
                    { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: userId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                    { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
                ]
            });

            // Update DB
            const t = db[guild.id].tickets.find(x => x.id === ticketId);
            if (t) {
                t.status = "active";
                t.channelId = channel.id;
                save("guilds", db);
            }

            const welcome = new EmbedBuilder()
                .setTitle(`🎫 Ticket #${ticketId}`)
                .setDescription(`Hello ${member}, staff is here to help.\n\n**Claimed by:** ${interaction.user}`)
                .setColor("Green")
                .setTimestamp();

            // Crear botón de cierre
            const closeButton = new ButtonBuilder()
                .setCustomId(`ticket_close_${ticketId}`)
                .setLabel("Close Ticket")
                .setStyle(ButtonStyle.Danger)
                .setEmoji("🔒");

            const row = new ActionRowBuilder().addComponents(closeButton);

            await channel.send({ 
                content: `👋 ${member}, un moderador ha aceptado tu ticket.`, 
                embeds: [welcome], 
                components: [row] 
            });

            await interaction.editReply(`✅ Ticket aceptado: ${channel}`);
            
            // Quitar botones del mensaje original de staff
            await interaction.message.edit({ components: [] }).catch(() => {});

        } catch (err) {
            console.error("[TICKET] Failed to create channel:", err);
            return interaction.editReply("❌ Internal error creating channel. Check bot permissions.");
        }
    }

    // 2. DENEGAR TICKET
    if (action === "deny") {
        const t = db[guild.id].tickets.find(x => x.id === ticketId);
        if (t) {
            t.status = "denied";
            save("guilds", db);
        }
        await interaction.message.delete().catch(() => {});
        await interaction.editReply("❌ Ticket denied and removed.");
    }

    // 3. CERRAR TICKET (Boton dentro del canal)
    if (action === "close") {
        // Solo moderadores
        if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return interaction.editReply("❌ Only staff can close tickets.");
        }

        const t = db[guild.id].tickets.find(x => x.id === userId); // En este caso, el ID del ticket viene en la posicion de userId por el split
        if (t) {
            t.status = "closed";
            t.closedAt = Date.now();
            save("guilds", db);
        }

        await interaction.editReply("🔒 **Closing ticket in 5 seconds...**");
        setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
    }
}


module.exports = { open, close, list, handleButtons };
