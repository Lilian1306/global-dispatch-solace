import { SolaceClient } from '../utils/solace-client';
import { ClientPanel } from './client-panel';

export { ClientPanel };

async function main(): Promise<void> {
  console.log('[CLIENT-SERVICE:START] Initializing Client Status Panel consumer...');

  const client = new SolaceClient();

  try {
    console.log('[SOLACE:CONNECTING] Connecting to Solace PubSub+ broker...');
    await client.connect();
    console.log('[SOLACE:CONNECTED] Connection established successfully.');

    const panel = new ClientPanel(client);
    await panel.start();

    // Manejo de apagado elegante (Ctrl+C)
    const cleanup = async () => {
      console.log('\n[SHUTDOWN] Terminating Client Status Panel service...');
      panel.stop();
      await client.disconnect();
      console.log('[SOLACE:DISCONNECTED] Session disconnected cleanly.');
      process.exit(0);
    };

    process.on('SIGINT', () => void cleanup());
    process.on('SIGTERM', () => void cleanup());
  } catch (error) {
    console.error('[ERROR:CLIENT-SERVICE] Fatal error in Client Status Panel:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  void main();
}
