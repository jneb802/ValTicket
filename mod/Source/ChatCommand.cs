using System;
using HarmonyLib;

namespace ValTicket
{
    [HarmonyPatch(typeof(Chat), nameof(Chat.InputText))]
    public static class ChatCommand
    {
        static bool Prefix(Chat __instance)
        {
            var text = __instance.m_input.text.Trim();

            // Determine command and category
            string category;
            string commandPrefix;

            if (text.StartsWith("/bug", StringComparison.OrdinalIgnoreCase))
            {
                category = "bug";
                commandPrefix = "/bug";
            }
            else if (text.StartsWith("/suggest", StringComparison.OrdinalIgnoreCase))
            {
                category = "suggestion";
                commandPrefix = "/suggest";
            }
            else
            {
                return true; // Not our command, let the original method run
            }

            // Word boundary check: next char must be space or end-of-string
            if (text.Length > commandPrefix.Length && text[commandPrefix.Length] != ' ')
                return true;

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

            var args = text.Substring(commandPrefix.Length).Trim();

            if (string.IsNullOrEmpty(args))
            {
                AddChatMessage($"Usage: {commandPrefix} <title> - <description>");
                AddChatMessage(category == "bug"
                    ? "Example: /bug Mobs clipping - Greydwarves walk through walls"
                    : "Example: /suggest New biome - Add a volcanic biome with fire enemies");
                return false;
            }

            // Split on " - " for title/description
            string title;
            string description;
            var dashIndex = args.IndexOf(" - ", StringComparison.Ordinal);
            if (dashIndex >= 0)
            {
                title = args.Substring(0, dashIndex).Trim();
                description = args.Substring(dashIndex + 3).Trim();
            }
            else
            {
                title = args;
                description = args;
            }

            if (string.IsNullOrEmpty(title))
            {
                AddChatMessage($"Usage: {commandPrefix} <title> - <description>");
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
