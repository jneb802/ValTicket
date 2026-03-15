using System;
using HarmonyLib;

namespace ValTicket
{
    [HarmonyPatch(typeof(Chat), nameof(Chat.InputText))]
    public static class ChatCommand
    {
        private static readonly string[] ValidCategories = { "bug", "suggestion", "question" };

        static bool Prefix(Chat __instance)
        {
            var text = __instance.m_input.text.Trim();

            if (!text.StartsWith("/ticket", StringComparison.OrdinalIgnoreCase))
                return true; // Not our command, let the original method run

            if (!ValTicketPlugin.Enabled.Value)
            {
                AddChatMessage("Ticket system is currently disabled.");
                return false;
            }

            if (Player.m_localPlayer == null)
            {
                AddChatMessage("You must be in-game to submit a ticket.");
                return false;
            }

            // Parse: /ticket [category] title - description
            var args = text.Substring("/ticket".Length).Trim();

            if (string.IsNullOrEmpty(args))
            {
                AddChatMessage("Usage: /ticket <bug|suggestion|question> <title> - <description>");
                AddChatMessage("Example: /ticket bug Mobs clipping - Greydwarves walk through walls");
                return false;
            }

            // Try to extract category
            string category = "bug";
            string remainder = args;

            var firstSpace = args.IndexOf(' ');
            if (firstSpace > 0)
            {
                var potentialCategory = args.Substring(0, firstSpace).ToLower();
                if (Array.IndexOf(ValidCategories, potentialCategory) >= 0)
                {
                    category = potentialCategory;
                    remainder = args.Substring(firstSpace + 1).Trim();
                }
            }
            else
            {
                // Single word after /ticket — check if it's just a category with no content
                var singleWord = args.ToLower();
                if (Array.IndexOf(ValidCategories, singleWord) >= 0)
                {
                    AddChatMessage("Please provide a title. Example: /ticket bug Mobs clipping - Description here");
                    return false;
                }
                // Otherwise treat the single word as the title
            }

            if (string.IsNullOrEmpty(remainder))
            {
                AddChatMessage("Please provide a title. Example: /ticket bug Mobs clipping - Description here");
                return false;
            }

            // Split on " - " for title/description
            string title;
            string description;
            var dashIndex = remainder.IndexOf(" - ", StringComparison.Ordinal);
            if (dashIndex >= 0)
            {
                title = remainder.Substring(0, dashIndex).Trim();
                description = remainder.Substring(dashIndex + 3).Trim();
            }
            else
            {
                title = remainder;
                description = remainder;
            }

            if (string.IsNullOrEmpty(title))
            {
                AddChatMessage("Please provide a title. Example: /ticket bug Mobs clipping - Description here");
                return false;
            }

            AddChatMessage($"Submitting {category} ticket...");
            TicketClient.Submit(category, title, description);

            return false; // Suppress the chat message from broadcasting
        }

        public static void AddChatMessage(string message)
        {
            if (Chat.instance != null)
            {
                Chat.instance.AddString($"<color=#5865F2>[ValTicket]</color> {message}");
            }
        }
    }
}
