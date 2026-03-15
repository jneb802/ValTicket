import {
  ActionRowBuilder,
  ModalBuilder,
  StringSelectMenuInteraction,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';

export async function handleCategorySelect(
  interaction: StringSelectMenuInteraction
): Promise<void> {
  const category = interaction.values[0];

  const modal = new ModalBuilder()
    .setCustomId(`ticket-modal:${category}`)
    .setTitle('Create a Ticket');

  const titleInput = new TextInputBuilder()
    .setCustomId('ticket-title')
    .setLabel('Title')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Brief summary of your issue')
    .setRequired(true)
    .setMaxLength(100);

  const descriptionInput = new TextInputBuilder()
    .setCustomId('ticket-description')
    .setLabel('Description')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('Provide as much detail as possible...')
    .setRequired(true)
    .setMaxLength(2000);

  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(titleInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(descriptionInput)
  );

  await interaction.showModal(modal);
}
