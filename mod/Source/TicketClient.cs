using System;
using System.Collections;
using System.IO;
using System.IO.Compression;

namespace ValTicket
{
    public static class TicketClient
    {
        public static void Submit(string category, string title, string description)
        {
            try
            {
                var diag = Diagnostics.Collect();

                // Only include logs for bug reports
                byte[] compressedLog = category == "bug"
                    ? ReadAndCompressLog()
                    : Array.Empty<byte>();

                // Build ZPackage with all fields
                var package = new ZPackage();
                package.Write(category);
                package.Write(title);
                package.Write(description);
                package.Write(diag.PlayerName);
                package.Write(diag.WorldName);
                package.Write(diag.Biome);
                package.Write(diag.Position);
                package.Write(diag.Fps);
                package.Write(diag.ModListJson);
                package.Write(compressedLog);

                // Send to server via RPC
                ValTicketPlugin.TicketRPC.SendPackage(
                    ZRoutedRpc.instance.GetServerPeerID(),
                    package
                );

                ValTicketPlugin.Log.LogInfo($"Ticket submitted: [{category}] {title}");
            }
            catch (Exception ex)
            {
                ValTicketPlugin.Log.LogError($"Failed to submit ticket: {ex}");
                ChatCommand.AddChatMessage("Failed to submit ticket. Check the log for details.");
            }
        }

        private static byte[] ReadAndCompressLog()
        {
            var logPath = Path.Combine(BepInEx.Paths.BepInExRootPath, "LogOutput.log");
            if (!File.Exists(logPath))
                return Array.Empty<byte>();

            byte[] logBytes;
            using (var fs = new FileStream(logPath, FileMode.Open, FileAccess.Read, FileShare.ReadWrite))
            {
                logBytes = new byte[fs.Length];
                fs.Read(logBytes, 0, logBytes.Length);
            }

            return Compress(logBytes);
        }

        private static byte[] Compress(byte[] data)
        {
            using var output = new MemoryStream();
            using (var gzip = new GZipStream(output, CompressionMode.Compress))
            {
                gzip.Write(data, 0, data.Length);
            }
            return output.ToArray();
        }

        // Called when server sends the submit RPC to client (not used — server handles it)
        public static IEnumerator OnClientReceive(long sender, ZPackage package)
        {
            yield break;
        }

        // Called when server sends the response RPC back to this client
        public static IEnumerator OnResponseClientReceive(long sender, ZPackage package)
        {
            bool success = package.ReadBool();
            string message = package.ReadString();

            if (success)
            {
                ChatCommand.AddChatMessage($"Ticket created! {message}");
            }
            else
            {
                ChatCommand.AddChatMessage($"Ticket failed: {message}");
            }

            yield break;
        }
    }
}
