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
    console.log(`[CLIENT-SERVICE:START] Initializing Client Status Panel consumer...`);
    console.log(`[SOLACE:QUEUE] Listening to persistent queue: "${QUEUES.RESULTS}"`);

    this.consumer = await this.client.createQueueConsumer(
      QUEUES.RESULTS,
      (message) => this.handleResultMessage(message),
      (error) => {
        console.error('[ERROR:CLIENT-CONSUMER] Failed to consume from results queue:', error);
      }
    );

    console.log(`[CLIENT-SERVICE:READY] Client status panel online. Awaiting order status updates...`);
  }

  /**
   * Procesa y muestra los resultados de validación (Accepted / Cancelled) en consola
   */
  public handleResultMessage(message: solace.Message): void {
    try {
      const result = parseMessagePayload<DispatchResult>(message);

      console.log('\n' + '='.repeat(60));
      console.log('         NEWCRON CLIENT DISPATCH - STATUS UPDATE');
      console.log('='.repeat(60));
      console.log(`  Order ID: ${result.shipperOrderId}`);

      if (result.status === 'Accepted') {
        console.log(`  Status:   [ACCEPTED]`);
        console.log(`  Details:  ${result.notes}`);
        console.log('  Notice:   Order approved and dispatched to carrier pool.');
      } else {
        console.log(`  Status:   [CANCELLED]`);
        console.log(`  Reason:   ${result.notes}`);
        console.log('  Notice:   Order rejected by business validation rules.');
      }

      console.log('='.repeat(60));
    } catch (err) {
      console.error('[ERROR:CLIENT-PAYLOAD] Failed to deserialize result payload:', err);
    }
  }

  public stop(): void {
    if (this.consumer) {
      this.consumer.disconnect();
      this.consumer.dispose();
      this.consumer = null;
      console.log('[CLIENT-SERVICE:STOPPED] Client consumer stopped.');
    }
  }
}
