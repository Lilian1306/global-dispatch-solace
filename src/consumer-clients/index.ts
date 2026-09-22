import { SolaceClient } from '../utils/solace-client.js';
import { ClientPanel } from './client-panel.js';

export { ClientPanel };

async function main(): Promise<void> {
  console.log('👥 Iniciando servicio Consumidor: Panel de Clientes...');

  const client = new SolaceClient();

  try {
    console.log('🔌 Conectando a Solace PubSub+...');
    await client.connect();
    console.log('✅ Conexión con Solace establecida exitosamente.');

    const panel = new ClientPanel(client);
    await panel.start();

    // Manejo de apagado elegante (Ctrl+C)
    const cleanup = async () => {
      console.log('\n🛑 Cerrando Panel de Clientes...');
      panel.stop();
      await client.disconnect();
      console.log('👋 Desconectado exitosamente.');
      process.exit(0);
    };

    process.on('SIGINT', () => void cleanup());
    process.on('SIGTERM', () => void cleanup());
  } catch (error) {
    console.error('❌ Error fatal al iniciar el Panel de Clientes:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  void main();
}
