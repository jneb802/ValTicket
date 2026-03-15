import {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
} from 'discord.js';
import { config } from './config.js';
import { commands, handleSetup, handleClose } from './interactions/commands.js';
import { handleTicketButton } from './interactions/button.js';
import { handleCategorySelect } from './interactions/selectMenu.js';
import { handleTicketModal } from './interactions/modal.js';

export async function startBot(): Promise<Client> {
  const client = new Client({
    intents: [GatewayIntentBits.Guilds],
  });

  // Login first so client.application is populated
  await client.login(config.discordToken);
  console.log(`Bot logged in as ${client.user?.tag}`);

  // Register slash commands
  const rest = new REST().setToken(config.discordToken);
  await rest.put(
    Routes.applicationGuildCommands(client.user!.id, config.guildId),
    { body: commands.map((c) => c.toJSON()) }
  );
  console.log('Slash commands registered');

  client.on('interactionCreate', async (interaction) => {
    try {
      if (interaction.isChatInputCommand()) {
        if (interaction.commandName === 'setup') return handleSetup(interaction);
        if (interaction.commandName === 'close') return handleClose(interaction);
      }

      if (interaction.isButton() && interaction.customId === 'open-ticket') {
        return handleTicketButton(interaction);
      }

      if (
        interaction.isStringSelectMenu() &&
        interaction.customId === 'ticket-category'
      ) {
        return handleCategorySelect(interaction);
      }

      if (
        interaction.isModalSubmit() &&
        interaction.customId.startsWith('ticket-modal:')
      ) {
        return handleTicketModal(interaction);
      }
    } catch (error) {
      console.error('Interaction error:', error);
    }
  });

  return client;
}
