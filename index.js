const { 
  Client, 
  GatewayIntentBits, 
  EmbedBuilder, 
  ActionRowBuilder, 
  StringSelectMenuBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  PermissionFlagsBits,
  ChannelType,
  SlashCommandBuilder,
  REST,
  Routes
} = require('discord.js');
const axios = require('axios');
const express = require('express');

// ==========================================
// 1. SERVER EXPRESS PER RENDER
// ==========================================
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Bot Nova Vita RP è online e funzionante!');
});

app.listen(PORT, () => {
  console.log(`Server web Express avviato sulla porta ${PORT}`);
});

// ==========================================
// 2. CONFIGURAZIONE ID DISCORD
// ==========================================
const LOG_CHANNEL_ID = '1552335163378376796';
const STAFF_ROLE_ID = '1551554018982240269';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// ==========================================
// 3. FUNZIONE HELPER API ROBLOX
// ==========================================
async function getRobloxUserInfo(username) {
  try {
    const res = await axios.post('https://users.roblox.com/v1/usernames/users', {
      usernames: [username],
      excludeBannedUsers: false
    });
    
    if (res.data.data && res.data.data.length > 0) {
      const user = res.data.data[0];
      const avatarRes = await axios.get(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${user.id}&size=150x150&format=Png&isCircular=false`);
      const avatarUrl = avatarRes.data.data[0]?.imageUrl || null;
      
      return { id: user.id, name: user.name, displayName: user.displayName, avatarUrl };
    }
    return null;
  } catch (error) {
    console.error('Errore durante la chiamata API Roblox:', error);
    return null;
  }
}

// ==========================================
// 4. REGISTRAZIONE COMANDI SLASH
// ==========================================
const commands = [
  // SSU / SSD
  new SlashCommandBuilder()
    .setName('ssu')
    .setDescription('Avvia la sessione di gioco (Server Start Up)')
    .addStringOption(opt => opt.setName('codice').setDescription('Codice di accesso al server').setRequired(true)),
  new SlashCommandBuilder()
    .setName('ssd')
    .setDescription('Chiudi la sessione di gioco (Server Shut Down)'),

  // Moderazione (Ban, Warn, Unban, Unwarn)
  new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Banna un utente da Roblox')
    .addStringOption(opt => opt.setName('username').setDescription('Username Roblox dell\'utente').setRequired(true))
    .addStringOption(opt => opt.setName('motivo').setDescription('Motivo del ban').setRequired(true)),
  new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Avverta un utente su Roblox')
    .addStringOption(opt => opt.setName('username').setDescription('Username Roblox dell\'utente').setRequired(true))
    .addStringOption(opt => opt.setName('motivo').setDescription('Motivo del warn').setRequired(true)),
  new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Sblocco ban per un utente Roblox')
    .addStringOption(opt => opt.setName('username').setDescription('Username Roblox').setRequired(true))
    .addStringOption(opt => opt.setName('motivo').setDescription('Motivo dello sbann').setRequired(true)),
  new SlashCommandBuilder()
    .setName('unwarn')
    .setDescription('Rimuovi un warn ad un utente Roblox')
    .addStringOption(opt => opt.setName('username').setDescription('Username Roblox').setRequired(true))
    .addStringOption(opt => opt.setName('motivo').setDescription('Motivo della rimozione').setRequired(true)),

  // Roleplay (Arrestati, Multe)
  new SlashCommandBuilder()
    .setName('arresta')
    .setDescription('Registra l\'arresto di un utente Roblox')
    .addStringOption(opt => opt.setName('username').setDescription('Username Roblox del fermato').setRequired(true))
    .addStringOption(opt => opt.setName('reati').setDescription('Elenco dei reati commessi').setRequired(true))
    .addStringOption(opt => opt.setName('tempo').setDescription('Tempo di detenzione (es. 15 minuti)').setRequired(true)),
  new SlashCommandBuilder()
    .setName('multa')
    .setDescription('Emetti una sanzione pecuniaria ad un utente Roblox')
    .addStringOption(opt => opt.setName('username').setDescription('Username Roblox').setRequired(true))
    .addStringOption(opt => opt.setName('reati').setDescription('Motivazione/Reati').setRequired(true))
    .addNumberOption(opt => opt.setName('importo').setDescription('Importo della multa').setRequired(true)),

  // Pannello Ticket
  new SlashCommandBuilder()
    .setName('setup-ticket')
    .setDescription('Invia il pannello dei ticket nel canale corrente')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
];

client.once('ready', async () => {
  console.log(`Bot avviato con successo come ${client.user.tag}!`);
  
  const token = process.env.DISCORD_TOKEN;
  if (!token) {
    return console.error('ERRORE CRITICO: La variabile d\'ambiente DISCORD_TOKEN non è impostata!');
  }

  const rest = new REST({ version: '10' }).setToken(token);
  try {
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands }
    );
    console.log('Comandi slash registrati con successo in modo globale!');
  } catch (err) {
    console.error('Errore nella registrazione dei comandi slash:', err);
  }
});

// ==========================================
// 5. GESTIONE INTERAZIONI DISCORD
// ==========================================
client.on('interactionCreate', async interaction => {
  
  // --- A. COMANDI SLASH ---
  if (interaction.isChatInputCommand()) {
    const { commandName, options, user, guild } = interaction;
    const logChannel = guild.channels.cache.get(LOG_CHANNEL_ID);

    // SSU
    if (commandName === 'ssu') {
      const codice = options.getString('codice');
      const embed = new EmbedBuilder()
        .setTitle('🚨 SERVER START UP (SSU)')
        .setColor(0x2ecc71)
        .addFields(
          { name: 'Nome Server', value: '```Nova Vita RP```' },
          { name: 'Codice Server', value: `\`\`\`${codice}\`\`\`` },
          { name: 'Note', value: 'La sessione è ufficialmente aperta! Entrate nel server rispettando il regolamento. Buon Roleplay!' }
        )
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    // SSD
    if (commandName === 'ssd') {
      const embed = new EmbedBuilder()
        .setTitle('🛑 SERVER SHUT DOWN (SSD)')
        .setColor(0xe74c3c)
        .addFields(
          { name: 'Nome Server', value: '```Nova Vita RP```' },
          { name: 'Note', value: 'La sessione di gioco è terminata ed il server è attualmente SPENTO. È severamente vietato rientrare fino al prossimo SSU.' }
        )
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    // BAN, WARN, UNBAN, UNWARN
    if (['ban', 'warn', 'unban', 'unwarn'].includes(commandName)) {
      await interaction.deferReply({ ephemeral: true });
      const username = options.getString('username');
      const motivo = options.getString('motivo');
      const robloxData = await getRobloxUserInfo(username);

      if (!robloxData) {
        return interaction.editReply({ content: `❌ Impossibile trovare l'utente Roblox \`${username}\`. Verificare che il nome sia corretto.` });
      }

      let color = 0x000000;
      let title = '';

      if (commandName === 'ban') { color = 0x990000; title = '🔨 BAN ESEGUITO'; }
      if (commandName === 'warn') { color = 0xf1c40f; title = '⚠️ WARN EMESSO'; }
      if (commandName === 'unban') { color = 0x2ecc71; title = '🟢 UNBAN ESEGUITO'; }
      if (commandName === 'unwarn') { color = 0x3498db; title = '🔵 UNWARN ESEGUITO'; }

      const logEmbed = new EmbedBuilder()
        .setTitle(title)
        .setColor(color)
        .addFields(
          { name: 'Utente Roblox', value: `**${robloxData.displayName}** (@${robloxData.name})\nID: \`${robloxData.id}\``, inline: true },
          { name: 'Motivazione', value: motivo, inline: true },
          { name: 'Staffer', value: `<@${user.id}>`, inline: true }
        )
        .setTimestamp();

      if (robloxData.avatarUrl) logEmbed.setThumbnail(robloxData.avatarUrl);

      if (['ban', 'warn'].includes(commandName)) {
        logEmbed.addFields({ name: 'Note', value: 'Le sanzioni sono state registrate nel sistema del server.' });
      }

      if (logChannel) {
        await logChannel.send({ embeds: [logEmbed] });
        return interaction.editReply({ content: `✅ Registrato con successo nel canale log (<#${LOG_CHANNEL_ID}>)!` });
      } else {
        return interaction.editReply({ content: '❌ Canale di log non trovato. Verifica l\'ID nel codice.' });
      }
    }

    // ARRESTA & MULTA
    if (['arresta', 'multa'].includes(commandName)) {
      await interaction.deferReply({ ephemeral: true });
      const username = options.getString('username');
      const reati = options.getString('reati');
      const robloxData = await getRobloxUserInfo(username);

      if (!robloxData) {
        return interaction.editReply({ content: `❌ Impossibile trovare l'utente Roblox \`${username}\`.` });
      }

      const logEmbed = new EmbedBuilder().setTimestamp();
      if (robloxData.avatarUrl) logEmbed.setThumbnail(robloxData.avatarUrl);

      if (commandName === 'arresta') {
        const tempo = options.getString('tempo');
        logEmbed
          .setTitle('⚖️ REGISTRO ARRESTI')
          .setColor(0x34495e)
          .addFields(
            { name: 'Cittadino', value: `**${robloxData.displayName}** (@${robloxData.name})\nID: \`${robloxData.id}\``, inline: true },
            { name: 'Tempo Detenzione', value: tempo, inline: true },
            { name: 'Agente/Staffer', value: `<@${user.id}>`, inline: true },
            { name: 'Reati Commessi', value: reati }
          );
      } else if (commandName === 'multa') {
        const importo = options.getNumber('importo');
        logEmbed
          .setTitle('💳 VERBALE DI MULTA')
          .setColor(0xe67e22)
          .addFields(
            { name: 'Cittadino', value: `**${robloxData.displayName}** (@${robloxData.name})\nID: \`${robloxData.id}\``, inline: true },
            { name: 'Importo', value: `$${importo}`, inline: true },
            { name: 'Ufficiale/Staffer', value: `<@${user.id}>`, inline: true },
            { name: 'Motivo/Reati', value: reati }
          );
      }

      if (logChannel) {
        await logChannel.send({ embeds: [logEmbed] });
        return interaction.editReply({ content: `✅ Verbale inserito nel canale log (<#${LOG_CHANNEL_ID}>)!` });
      }
    }

    // SETUP TICKET
    if (commandName === 'setup-ticket') {
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('ticket_select')
        .setPlaceholder('Seleziona la categoria del ticket...')
        .addOptions([
          { label: 'Assistenza Gradi Alti Amministrazione', value: 'ticket_gradi_alti', description: 'Richiedi supporto alla direzione dell\'amministrazione' },
          { label: 'Supporto in gioco', value: 'ticket_ingame', description: 'Problemi o assistenza per il server Roblox' },
          { label: 'Supporto Discord', value: 'ticket_discord', description: 'Problemi con i ruoli o la community Discord' },
          { label: 'Partnership', value: 'ticket_partnership', description: 'Proposte di collaborazione e partnership' },
          { label: 'Gestione', value: 'ticket_gestione', description: 'Contatta il dipartimento di gestione' }
        ]);

      const row = new ActionRowBuilder().addComponents(selectMenu);

      const embed = new EmbedBuilder()
        .setTitle('🎫 APERTURA TICKET - NOVA VITA RP')
        .setDescription('Hai bisogno di assistenza? Seleziona dal menu sottostante la categoria più adatta alla tua richiesta per aprire un ticket con lo staff.')
        .setColor(0x3498db);

      await interaction.channel.send({ embeds: [embed], components: [row] });
      return interaction.reply({ content: 'Pannello ticket inviato con successo!', ephemeral: true });
    }
  }

  // --- B. GESTIONE SELEZIONE MENU TICKET ---
  if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_select') {
    const { guild, member, values } = interaction;
    const categoryName = values[0].replace('ticket_', '').replace('_', ' ').toUpperCase();

    const ticketChannel = await guild.channels.create({
      name: `ticket-${member.user.username}`,
      type: ChannelType.GuildText,
      permissionOverviews: [
        { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
        { id: member.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
        { id: STAFF_ROLE_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
      ]
    });

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('ticket_claim').setLabel('Prendi in carico').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('ticket_release').setLabel('Rilascia').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('ticket_close').setLabel('Chiudi').setStyle(ButtonStyle.Danger)
    );

    const ticketEmbed = new EmbedBuilder()
      .setTitle(`TICKET - ${categoryName}`)
      .setDescription(`Ciao ${member}, un membro dello staff prenderà in carico la tua richiesta a breve.\nSpiega chiaramente il tuo problema.`)
      .setColor(0x3498db)
      .setTimestamp();

    await ticketChannel.send({ content: `<@&${STAFF_ROLE_ID}>`, embeds: [ticketEmbed], components: [buttons] });
    return interaction.reply({ content: `✅ Il tuo ticket è stato aperto in: ${ticketChannel}`, ephemeral: true });
  }

  // --- C. GESTIONE PULSANTI TICKET ---
  if (interaction.isButton()) {
    const { customId, member, channel } = interaction;

    if (['ticket_claim', 'ticket_release', 'ticket_close'].includes(customId)) {
      // Verifica Ruolo Staff
      if (!member.roles.cache.has(STAFF_ROLE_ID)) {
        return interaction.reply({ content: '❌ Non hai il permesso per gestire questo ticket!', ephemeral: true });
      }

      if (customId === 'ticket_claim') {
        const claimEmbed = new EmbedBuilder()
          .setDescription(`📌 Il ticket è stato **preso in carico** da ${member}.`)
          .setColor(0x2ecc71);
        await channel.send({ embeds: [claimEmbed] });
        return interaction.reply({ content: 'Hai preso in carico il ticket.', ephemeral: true });
      }

      if (customId === 'ticket_release') {
        const releaseEmbed = new EmbedBuilder()
          .setDescription(`🔄 Il ticket è stato **rilasciato** da ${member} ed è nuovamente disponibile per lo staff.`)
          .setColor(0xe67e22);
        await channel.send({ embeds: [releaseEmbed] });
        return interaction.reply({ content: 'Hai rilasciato il ticket.', ephemeral: true });
      }

      if (customId === 'ticket_close') {
        await interaction.reply({ content: '🔒 Il ticket verrà eliminato a breve...' });
        setTimeout(() => {
          channel.delete().catch(() => {});
        }, 3000);
      }
    }
  }
});

// Avvio Bot con la variabile d'ambiente
client.login(process.env.DISCORD_TOKEN);
