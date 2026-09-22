import { SolaceClient } from '../utils/solace-client.js';
import { CarrierDashboard } from './carrier-dashboard.js';

export { CarrierDashboard };

async function main(): Promise<void> {
  console.log('[CARRIER-SERVICE:START] Initializing Carrier Dashboard consumer...');

  const client = new SolaceClient();

  try {
    console.log('[SOLACE:CONNECTING] Connecting to Solace PubSub+ broker...');
    await client.connect();
    console.log('[SOLACE:CONNECTED] Connection established successfully.');

    const dashboard = new CarrierDashboard(client);
    await dashboard.start();

    // Manejo de apagado elegante (Ctrl+C)
    const cleanup = async () => {
      console.log('\n[SHUTDOWN] Terminating Carrier Dashboard service...');
      dashboard.stop();
      await client.disconnect();
      console.log('[SOLACE:DISCONNECTED] Session disconnected cleanly.');
      process.exit(0);
    };

    process.on('SIGINT', () => void cleanup());
    process.on('SIGTERM', () => void cleanup());
  } catch (error) {
    console.error('[ERROR:CARRIER-SERVICE] Fatal error in Carrier Dashboard:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  void main();
}
