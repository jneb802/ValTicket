import {
  ActionRowBuilder,
  ButtonInteraction,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from 'discord.js';

export async function handleTicketButton(interaction: ButtonInteraction): Promise<void> {
  const select = new StringSelectMenuBuilder()
    .setCustomId('ticket-category')
    .setPlaceholder('Select a category')
    .addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel('Bug')
        .setDescription('Report a bug or issue')
        .setValue('bug')
        .setEmoji({ name: '\uD83D\uDC1B' }),
      new StringSelectMenuOptionBuilder()
        .setLabel('Suggestion')
        .setDescription('Suggest an improvement or feature')
        .setValue('suggestion')
        .setEmoji({ name: '\uD83D\uDCA1' }),
      new StringSelectMenuOptionBuilder()
        .setLabel('Question')
        .setDescription('Ask a question')
        .setValue('question')
        .setEmoji({ name: '\u2753' }),
    );

  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);

  await interaction.reply({
    content: 'What type of ticket would you like to create?',
    components: [row],
    ephemeral: true,
  });
}
