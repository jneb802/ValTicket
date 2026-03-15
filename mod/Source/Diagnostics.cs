using System.Collections.Generic;
using System.Linq;
using BepInEx.Bootstrap;
using UnityEngine;

namespace ValTicket
{
    public static class Diagnostics
    {
        public struct PlayerDiagnostics
        {
            public string PlayerName;
            public string WorldName;
            public string Biome;
            public string Position;
            public int Fps;
            public string ModListJson;
        }

        public static PlayerDiagnostics Collect()
        {
            var diag = new PlayerDiagnostics();

            // Player name
            if (Player.m_localPlayer != null)
            {
                diag.PlayerName = Player.m_localPlayer.GetPlayerName();
                var pos = Player.m_localPlayer.transform.position;
                diag.Position = $"{pos.x:F0}, {pos.y:F0}, {pos.z:F0}";

                // Biome
                if (WorldGenerator.instance != null)
                {
                    var biome = WorldGenerator.instance.GetBiome(pos);
                    diag.Biome = biome.ToString();
                }
                else
                {
                    diag.Biome = "Unknown";
                }
            }
            else
            {
                diag.PlayerName = "Unknown";
                diag.Position = "0, 0, 0";
                diag.Biome = "Unknown";
            }

            // World name
            if (ZNet.instance != null)
            {
                diag.WorldName = ZNet.instance.GetWorldName();
            }
            else
            {
                diag.WorldName = "Unknown";
            }

            // FPS
            diag.Fps = (int)(1f / Time.deltaTime);

            // Mod list
            var mods = new List<string>();
            foreach (var plugin in Chainloader.PluginInfos.Values)
            {
                mods.Add($"{plugin.Metadata.Name} {plugin.Metadata.Version}");
            }
            diag.ModListJson = "[" + string.Join(",", mods.Select(m => $"\"{m}\"")) + "]";

            return diag;
        }
    }
}
