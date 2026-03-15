import express from 'express';
import multer from 'multer';
import { Client } from 'discord.js';
import { config } from './config.js';
import { createTicket } from './services/ticket.js';
import { getRecentTicketCount } from './db.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

export function createApi(client: Client): express.Express {
  const app = express();
  app.use(express.json());

  // Auth middleware
  function requireApiKey(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ): void {
    const key = req.headers['x-api-key'];
    if (key !== config.apiKey) {
      res.status(401).json({ success: false, error: 'Invalid API key' });
      return;
    }
    next();
  }

  app.post(
    '/api/ticket',
    requireApiKey,
    upload.fields([
      { name: 'playerLog', maxCount: 1 },
      { name: 'serverLog', maxCount: 1 },
    ]),
    async (req, res) => {
      try {
        const { category, title, description, player, world, biome, position, mods, fps } = req.body;

        // Validate required fields
        if (!category || !title || !description || !player) {
          res.status(400).json({
            success: false,
            error: 'Missing required fields: category, title, description, player',
          });
          return;
        }

        const validCategories = ['bug', 'suggestion', 'question'];
        if (!validCategories.includes(category)) {
          res.status(400).json({
            success: false,
            error: `Invalid category. Must be one of: ${validCategories.join(', ')}`,
          });
          return;
        }

        // Rate limit check
        const recentCount = getRecentTicketCount(player);
        if (recentCount >= 3) {
          res.status(429).json({
            success: false,
            error: 'Rate limit exceeded. Maximum 3 tickets per player per hour.',
          });
          return;
        }

        // Extract uploaded log files
        const files = req.files as Record<string, Express.Multer.File[]> | undefined;
        const playerLogBuffer = files?.playerLog?.[0]?.buffer;
        const serverLogBuffer = files?.serverLog?.[0]?.buffer;

        // Parse mods array
        let parsedMods: string[] | undefined;
        if (mods) {
          try {
            parsedMods = typeof mods === 'string' ? JSON.parse(mods) : mods;
          } catch {
            parsedMods = undefined;
          }
        }

        const result = await createTicket(client, {
          category,
          title,
          description,
          userId: 'mod-api',
          username: player,
          source: 'mod',
          player,
          world,
          biome,
          position,
          mods: parsedMods,
          fps: fps ? Number(fps) : undefined,
          playerLog: playerLogBuffer,
          serverLog: serverLogBuffer,
        });

        res.json({ success: true, threadUrl: result.threadUrl });
      } catch (error) {
        console.error('API ticket creation failed:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
      }
    }
  );

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', bot: client.isReady() });
  });

  return app;
}
