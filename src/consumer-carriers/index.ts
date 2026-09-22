import { SolaceClient } from '../utils/solace-client.js';
import { CarrierDashboard } from './carrier-dashboard.js';

export { CarrierDashboard };

async function main(): Promise<void> {
  console.log('🚛 Iniciando servicio Consumidor: Dashboard de Transportistas...');

  const client = new SolaceClient();

  try {
    console.log('🔌 Conectando a Solace PubSub+...');
    await client.connect();
    console.log('✅ Conexión con Solace establecida exitosamente.');

    const dashboard = new CarrierDashboard(client);
    await dashboard.start();

    // Manejo de apagado elegante (Ctrl+C)
    const cleanup = async () => {
      console.log('\n🛑 Cerrando Dashboard de Transportistas...');
      dashboard.stop();
      await client.disconnect();
      console.log('👋 Desconectado exitosamente.');
      process.exit(0);
    };

    process.on('SIGINT', () => void cleanup());
    process.on('SIGTERM', () => void cleanup());
  } catch (error) {
    console.error('❌ Error fatal al iniciar el Dashboard de Transportistas:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  void main();
}
