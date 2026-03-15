import { startBot } from './bot.js';
import { createApi } from './api.js';
import { config } from './config.js';

async function main() {
  const client = await startBot();
  const app = createApi(client);

  app.listen(config.apiPort, () => {
    console.log(`API server listening on port ${config.apiPort}`);
  });
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
