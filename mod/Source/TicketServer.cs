using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.IO.Compression;
using System.Text;
using BepInEx;
using UnityEngine.Networking;

namespace ValTicket
{
    public static class TicketServer
    {
        // Called when a client sends a ticket to the server
        public static IEnumerator OnServerReceive(long sender, ZPackage package)
        {
            // Only process on the server
            if (ZNet.instance == null || !ZNet.instance.IsServer())
                yield break;

            string category = package.ReadString();
            string title = package.ReadString();
            string description = package.ReadString();
            string playerName = package.ReadString();
            string worldName = package.ReadString();
            string biome = package.ReadString();
            string position = package.ReadString();
            int fps = package.ReadInt();
            string modListJson = package.ReadString();
            byte[] compressedPlayerLog = package.ReadByteArray();

            ValTicketPlugin.Log.LogInfo($"Received ticket from {playerName}: [{category}] {title}");

            // Decompress player log
            byte[] playerLogBytes = Decompress(compressedPlayerLog);

            // Read server's own log
            byte[] serverLogBytes = ReadServerLog();

            // POST to the bot API
            yield return PostTicket(
                sender, category, title, description,
                playerName, worldName, biome, position,
                fps, modListJson, playerLogBytes, serverLogBytes
            );
        }

        private static IEnumerator PostTicket(
            long senderPeerId,
            string category, string title, string description,
            string playerName, string worldName, string biome, string position,
            int fps, string modListJson,
            byte[] playerLogBytes, byte[] serverLogBytes)
        {
            string apiUrl = ValTicketPlugin.ApiUrl.Value;
            string apiKey = ValTicketPlugin.ApiKey.Value;

            if (string.IsNullOrEmpty(apiKey))
            {
                ValTicketPlugin.Log.LogWarning("API key not configured. Cannot submit ticket.");
                SendResponse(senderPeerId, false, "Server API key not configured.");
                yield break;
            }

            var formData = new List<IMultipartFormSection>
            {
                new MultipartFormDataSection("category", category),
                new MultipartFormDataSection("title", title),
                new MultipartFormDataSection("description", description),
                new MultipartFormDataSection("player", playerName),
                new MultipartFormDataSection("world", worldName),
                new MultipartFormDataSection("biome", biome),
                new MultipartFormDataSection("position", position),
                new MultipartFormDataSection("fps", fps.ToString()),
                new MultipartFormDataSection("mods", modListJson),
            };

            if (playerLogBytes.Length > 0)
            {
                formData.Add(new MultipartFormFileSection("playerLog", playerLogBytes, "player-log.txt", "text/plain"));
            }

            if (serverLogBytes.Length > 0)
            {
                formData.Add(new MultipartFormFileSection("serverLog", serverLogBytes, "server-log.txt", "text/plain"));
            }

            using var request = UnityWebRequest.Post($"{apiUrl}/api/ticket", formData);
            request.SetRequestHeader("x-api-key", apiKey);
            request.timeout = 30;

            yield return request.SendWebRequest();

            if (request.result == UnityWebRequest.Result.Success)
            {
                ValTicketPlugin.Log.LogInfo($"Ticket posted successfully for {playerName}");
                SendResponse(senderPeerId, true, "Check #support on Discord");
            }
            else
            {
                ValTicketPlugin.Log.LogError($"Failed to post ticket: {request.error} — {request.downloadHandler?.text}");
                SendResponse(senderPeerId, false, $"Server error: {request.error}");
            }
        }

        private static void SendResponse(long peerPeerId, bool success, string message)
        {
            var response = new ZPackage();
            response.Write(success);
            response.Write(message);

            // Find the peer to send the response to
            var peer = ZNet.instance?.GetPeer(peerPeerId);
            if (peer != null)
            {
                ValTicketPlugin.TicketResponseRPC.SendPackage(
                    new List<ZNetPeer> { peer },
                    response
                );
            }
        }

        private static byte[] ReadServerLog()
        {
            var logPath = Path.Combine(Paths.BepInExRootPath, "LogOutput.log");
            if (!File.Exists(logPath))
                return Array.Empty<byte>();

            try
            {
                using var fs = new FileStream(logPath, FileMode.Open, FileAccess.Read, FileShare.ReadWrite);
                var bytes = new byte[fs.Length];
                fs.Read(bytes, 0, bytes.Length);
                return bytes;
            }
            catch (Exception ex)
            {
                ValTicketPlugin.Log.LogWarning($"Failed to read server log: {ex.Message}");
                return Encoding.UTF8.GetBytes($"Failed to read server log: {ex.Message}");
            }
        }

        private static byte[] Decompress(byte[] compressedData)
        {
            if (compressedData.Length == 0)
                return Array.Empty<byte>();

            using var input = new MemoryStream(compressedData);
            using var gzip = new GZipStream(input, CompressionMode.Decompress);
            using var output = new MemoryStream();
            gzip.CopyTo(output);
            return output.ToArray();
        }

        // Not used — response RPC is client→server direction not needed
        public static IEnumerator OnResponseServerReceive(long sender, ZPackage package)
        {
            yield break;
        }
    }
}
