import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ForumChannel,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from 'discord.js';
import { config } from '../config.js';
import { closeTicketRecord, getTicketByThread } from '../db.js';

const REQUIRED_TAGS = [
  { name: 'Bug', moderated: false, emoji: { name: '\uD83D\uDC1B', id: null } },
  { name: 'Suggestion', moderated: false, emoji: { name: '\uD83D\uDCA1', id: null } },
  { name: 'Question', moderated: false, emoji: { name: '\u2753', id: null } },
  { name: 'Open', moderated: true, emoji: { name: '\uD83D\uDFE2', id: null } },
  { name: 'In Progress', moderated: true, emoji: { name: '\uD83D\uDFE1', id: null } },
  { name: 'Resolved', moderated: true, emoji: { name: '\u2705', id: null } },
];

export const commands = [
  new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Set up the ticket system in this channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  new SlashCommandBuilder()
    .setName('close')
    .setDescription('Close this ticket')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageThreads),
];

export async function handleSetup(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  // Ensure forum tags exist
  const forum = interaction.client.channels.cache.get(config.forumChannelId);
  if (!forum || forum.type !== ChannelType.GuildForum) {
    await interaction.editReply('Forum channel not found. Check FORUM_CHANNEL_ID in .env');
    return;
  }

  const forumChannel = forum as ForumChannel;
  const existingTags = forumChannel.availableTags;
  const existingNames = new Set(existingTags.map((t) => t.name.toLowerCase()));

  const missingTags = REQUIRED_TAGS.filter(
    (t) => !existingNames.has(t.name.toLowerCase())
  );

  if (missingTags.length > 0) {
    const updatedTags = [
      ...existingTags.map((t) => ({
        id: t.id,
        name: t.name,
        moderated: t.moderated,
        emoji: t.emoji,
      })),
      ...missingTags,
    ];
    await forumChannel.setAvailableTags(updatedTags);
  }

  // Send the ticket button message
  const embed = new EmbedBuilder()
    .setTitle('Praetoris Support')
    .setDescription(
      'Need help or want to report an issue? Click the button below to create a support ticket.\n\n' +
      'Your ticket will be posted as a public thread so others can benefit from the answers.'
    )
    .setColor(0x5865f2);

  const button = new ButtonBuilder()
    .setCustomId('open-ticket')
    .setLabel('Open a Ticket')
    .setStyle(ButtonStyle.Primary);

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);

  const channel = interaction.channel;
  if (!channel || !('send' in channel)) {
    await interaction.editReply('Cannot send messages in this channel.');
    return;
  }

  await channel.send({
    embeds: [embed],
    components: [row],
  });

  const tagStatus = missingTags.length > 0
    ? `Created ${missingTags.length} missing tag(s): ${missingTags.map((t) => t.name).join(', ')}`
    : 'All forum tags already exist';

  await interaction.editReply(`Ticket system set up. ${tagStatus}`);
}

export async function handleClose(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const channel = interaction.channel;
  if (!channel || !channel.isThread() || channel.parentId !== config.forumChannelId) {
    await interaction.reply({
      content: 'This command can only be used inside a ticket thread.',
      ephemeral: true,
    });
    return;
  }

  const ticket = getTicketByThread(channel.id);
  if (!ticket) {
    await interaction.reply({
      content: 'This thread is not a tracked ticket.',
      ephemeral: true,
    });
    return;
  }

  if (ticket.status === 'resolved') {
    await interaction.reply({
      content: 'This ticket is already resolved.',
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply();

  const forum = interaction.client.channels.cache.get(config.forumChannelId) as ForumChannel;
  const resolvedTag = forum.availableTags.find(
    (t) => t.name.toLowerCase() === 'resolved'
  );
  const openTag = forum.availableTags.find(
    (t) => t.name.toLowerCase() === 'open'
  );
  const inProgressTag = forum.availableTags.find(
    (t) => t.name.toLowerCase() === 'in progress'
  );

  // Replace status tags with Resolved
  const currentTags = channel.appliedTags.filter(
    (id) => id !== openTag?.id && id !== inProgressTag?.id
  );
  if (resolvedTag) {
    currentTags.push(resolvedTag.id);
  }

  await channel.setAppliedTags(currentTags);
  await channel.setArchived(true);

  closeTicketRecord(channel.id);

  await interaction.editReply('Ticket resolved and archived.');
}
