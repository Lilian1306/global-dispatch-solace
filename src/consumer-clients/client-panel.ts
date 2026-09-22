import type solace from 'solclientjs';
import { SolaceClient, parseMessagePayload } from '../utils/solace-client.js';
import { QUEUES } from '../config/solace.config.js';
import type { DispatchResult } from '../types/index.js';

export class ClientPanel {
  private client: SolaceClient;
  private consumer: solace.MessageConsumer | null = null;

  constructor(client: SolaceClient) {
    this.client = client;
  }

  /**
   * Inicia la escucha de la cola de resultados para clientes (dispatch.results.queue)
   */
  public async start(): Promise<void> {
    console.log(`📡 Iniciando consumidor para Panel de Clientes...`);
    console.log(`📥 Escuchando cola de resultados: "${QUEUES.RESULTS}"`);

    this.consumer = await this.client.createQueueConsumer(
      QUEUES.RESULTS,
      (message) => this.handleResultMessage(message),
      (error) => {
        console.error('❌ Error en el consumidor de resultados de clientes:', error);
      }
    );

    console.log(`✅ Panel de clientes en línea. Esperando notificaciones de órdenes...`);
  }

  /**
   * Procesa y muestra los resultados de validación (Accepted / Cancelled) en consola
   */
  public handleResultMessage(message: solace.Message): void {
    try {
      const result = parseMessagePayload<DispatchResult>(message);

      console.log('\n' + '═'.repeat(72));
      console.log('                 👥 PANEL DE CLIENTES - NEWCRON');
      console.log('═'.repeat(72));
      console.log(` 📦 Orden ID: ${result.shipperOrderId}`);

      if (result.status === 'Accepted') {
        console.log(` 🏷️  Estado:   ✅ ACEPTADA (Accepted)`);
        console.log(` 💬 Detalle:  ${result.notes}`);
        console.log(' ℹ️  Tu solicitud fue aprobada y enviada a los transportistas.');
      } else {
        console.log(` 🏷️  Estado:   ❌ CANCELADA (Cancelled)`);
        console.log(` ⚠️  Motivo:   ${result.notes}`);
        console.log(' ℹ️  La orden no cumplió las reglas de negocio de NewCron.');
      }

      console.log('═'.repeat(72));
    } catch (err) {
      console.error('❌ Error al procesar resultado de cliente:', err);
    }
  }

  public stop(): void {
    if (this.consumer) {
      this.consumer.disconnect();
      this.consumer.dispose();
      this.consumer = null;
      console.log('🛑 Panel de clientes detenido.');
    }
  }
}
