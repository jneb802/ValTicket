using System.Reflection;
using BepInEx;
using BepInEx.Configuration;
using BepInEx.Logging;
using HarmonyLib;
using Jotunn;
using Jotunn.Entities;
using Jotunn.Managers;
using Jotunn.Utils;

namespace ValTicket
{
    [BepInPlugin(ModGUID, ModName, ModVersion)]
    [BepInDependency(Main.ModGuid)]
    [NetworkCompatibility(CompatibilityLevel.EveryoneMustHaveMod, VersionStrictness.Minor)]
    public class ValTicketPlugin : BaseUnityPlugin
    {
        private const string ModName = "ValTicket";
        private const string ModVersion = "1.0.0";
        private const string Author = "warpalicious";
        private const string ModGUID = Author + "." + ModName;

        private readonly Harmony HarmonyInstance = new(ModGUID);
        public static readonly ManualLogSource Log = BepInEx.Logging.Logger.CreateLogSource(ModName);

        // Config entries
        public static ConfigEntry<bool> Enabled = null!;
        public static ConfigEntry<string> ApiUrl = null!;
        public static ConfigEntry<string> ApiKey = null!;

        // RPC
        public static CustomRPC TicketRPC = null!;
        public static CustomRPC TicketResponseRPC = null!;

        public void Awake()
        {
            BindConfig();

            TicketRPC = NetworkManager.Instance.AddRPC(
                "ValTicket_Submit",
                TicketServer.OnServerReceive,
                TicketClient.OnClientReceive
            );

            TicketResponseRPC = NetworkManager.Instance.AddRPC(
                "ValTicket_Response",
                TicketServer.OnResponseServerReceive,
                TicketClient.OnResponseClientReceive
            );

            Assembly assembly = Assembly.GetExecutingAssembly();
            HarmonyInstance.PatchAll(assembly);

            Log.LogInfo($"{ModName} v{ModVersion} loaded");
        }

        private void BindConfig()
        {
            // Synced config — clients need this to know if the feature is enabled
            Enabled = Config.Bind("General", "Enabled", true,
                new ConfigDescription("Enable or disable the ticket system",
                    null,
                    new ConfigurationManagerAttributes { IsAdminOnly = true }));

            // Server-only config — never synced to clients
            ApiUrl = Config.Bind("Server", "ApiUrl", "http://localhost:3847",
                "Bot API endpoint URL. Server-only setting.");

            ApiKey = Config.Bind("Server", "ApiKey", "",
                "API key for authenticating with the bot. Server-only setting.");
        }

        private void OnDestroy()
        {
            Config.Save();
        }
    }
}
