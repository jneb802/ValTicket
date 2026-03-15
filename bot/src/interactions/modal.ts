import { ModalSubmitInteraction } from 'discord.js';
import { createTicket } from '../services/ticket.js';

export async function handleTicketModal(
  interaction: ModalSubmitInteraction
): Promise<void> {
  const category = interaction.customId.split(':')[1];
  const title = interaction.fields.getTextInputValue('ticket-title');
  const description = interaction.fields.getTextInputValue('ticket-description');

  await interaction.deferReply({ ephemeral: true });

  try {
    const result = await createTicket(interaction.client, {
      category,
      title,
      description,
      userId: interaction.user.id,
      username: interaction.user.tag,
      source: 'discord',
    });

    await interaction.editReply({
      content: `Ticket created! <#${result.threadId}>`,
    });
  } catch (error) {
    console.error('Failed to create ticket:', error);
    await interaction.editReply({
      content: 'Failed to create ticket. Please try again or contact a moderator.',
    });
  }
}
