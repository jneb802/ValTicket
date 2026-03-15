import 'dotenv/config';

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  discordToken: required('DISCORD_TOKEN'),
  guildId: required('GUILD_ID'),
  forumChannelId: required('FORUM_CHANNEL_ID'),
  apiPort: parseInt(process.env.API_PORT || '3847', 10),
  apiKey: required('API_KEY'),
} as const;
