import {
  AttachmentBuilder,
  ChannelType,
  Client,
  EmbedBuilder,
  ForumChannel,
} from 'discord.js';
import { config } from '../config.js';
import { createTicketRecord } from '../db.js';

export interface TicketData {
  category: string;
  title: string;
  description: string;
  userId: string;
  username: string;
  source: 'discord' | 'mod';
  // Mod-specific diagnostic fields
  player?: string;
  world?: string;
  biome?: string;
  position?: string;
  mods?: string[];
  fps?: number;
  playerLog?: Buffer;
  serverLog?: Buffer;
}

const CATEGORY_PREFIXES: Record<string, string> = {
  bug: 'BUG',
  suggestion: 'SUGGESTION',
  question: 'QUESTION',
};

export async function createTicket(
  client: Client,
  data: TicketData
): Promise<{ threadId: string; threadUrl: string }> {
  const forum = client.channels.cache.get(config.forumChannelId);
  if (!forum || forum.type !== ChannelType.GuildForum) {
    throw new Error('Forum channel not found or is not a forum channel');
  }

  const forumChannel = forum as ForumChannel;
  const tags = forumChannel.availableTags;

  const categoryTag = tags.find(
    (t) => t.name.toLowerCase() === data.category.toLowerCase()
  );
  const openTag = tags.find((t) => t.name.toLowerCase() === 'open');
  const appliedTags = [categoryTag?.id, openTag?.id].filter(
    (id): id is string => !!id
  );

  const prefix = CATEGORY_PREFIXES[data.category.toLowerCase()] || data.category.toUpperCase();

  const embed = new EmbedBuilder()
    .setTitle(`${data.title}`)
    .setDescription(data.description)
    .setColor(
      data.category === 'bug'
        ? 0xe74c3c
        : data.category === 'suggestion'
          ? 0x3498db
          : 0x2ecc71
    )
    .addFields(
      { name: 'Category', value: data.category, inline: true },
      { name: 'Submitted by', value: data.username, inline: true },
      { name: 'Source', value: data.source, inline: true }
    )
    .setTimestamp();

  // Add mod diagnostic fields if present
  if (data.player) embed.addFields({ name: 'Player', value: data.player, inline: true });
  if (data.world) embed.addFields({ name: 'World', value: data.world, inline: true });
  if (data.biome) embed.addFields({ name: 'Biome', value: data.biome, inline: true });
  if (data.position) embed.addFields({ name: 'Position', value: data.position, inline: true });
  if (data.fps !== undefined) embed.addFields({ name: 'FPS', value: String(data.fps), inline: true });
  if (data.mods && data.mods.length > 0) {
    const modList = data.mods.join(', ');
    embed.addFields({
      name: `Mods (${data.mods.length})`,
      value: modList.length > 1024 ? modList.slice(0, 1021) + '...' : modList,
    });
  }

  // Build file attachments for logs
  const files: AttachmentBuilder[] = [];
  if (data.playerLog) {
    files.push(new AttachmentBuilder(data.playerLog, { name: 'player-log.txt' }));
  }
  if (data.serverLog) {
    files.push(new AttachmentBuilder(data.serverLog, { name: 'server-log.txt' }));
  }

  const thread = await forumChannel.threads.create({
    name: `[${prefix}] ${data.title}`,
    message: {
      embeds: [embed],
      files,
    },
    appliedTags,
  });

  createTicketRecord({
    thread_id: thread.id,
    user_id: data.userId,
    username: data.username,
    category: data.category,
    title: data.title,
    source: data.source,
  });

  return {
    threadId: thread.id,
    threadUrl: `https://discord.com/channels/${config.guildId}/${thread.id}`,
  };
}
