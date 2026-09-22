import type solace from 'solclientjs';
import { SolaceClient, parseMessagePayload } from '../utils/solace-client';
import { QUEUES } from '../config/solace.config';
import type { DispatchRequest } from '../types/index';

export class CarrierDashboard {
  private client: SolaceClient;
  private consumer: solace.MessageConsumer | null = null;

  constructor(client: SolaceClient) {
    this.client = client;
  }

  /**
   * Inicia la suscripción y escucha de la cola de órdenes para transportistas.
   */
  public async start(): Promise<void> {
    console.log(`[CARRIER-SERVICE:START] Initializing Carrier Dashboard consumer...`);
    console.log(`[SOLACE:QUEUE] Listening to persistent queue: "${QUEUES.ORDERS}"`);

    this.consumer = await this.client.createQueueConsumer(
      QUEUES.ORDERS,
      (message) => this.handleOrderMessage(message),
      (error) => {
        console.error('[ERROR:CARRIER-CONSUMER] Failed to consume from queue:', error);
      }
    );

    console.log(`[CARRIER-SERVICE:READY] Carrier dashboard online. Awaiting available loads...`);
  }

  /**
   * Procesa y despliega en consola las órdenes disponibles recibidas de la cola.
   */
  public handleOrderMessage(message: solace.Message): void {
    try {
      const order = parseMessagePayload<DispatchRequest>(message);

      console.log('\n' + '='.repeat(60));
      console.log('         NEWCRON CARRIER DISPATCH - LOAD AVAILABLE');
      console.log('='.repeat(60));
      console.log(`  Order ID:      ${order.shipperOrderId}`);
      console.log(`  Offered Rate:  $${order.price.toLocaleString()} USD`);
      console.log(`  Pickup Date:   ${order.pickupDate}`);
      console.log(`  Delivery Date: ${order.deliveryDate}`);
      console.log('-'.repeat(60));
      console.log('  ROUTE ITINERARY:');
      order.stops.forEach((stop) => {
        console.log(`    Stop #${stop.stopNumber}: ${stop.city}, ${stop.state} (${stop.postalCode})`);
      });
      console.log('-'.repeat(60));
      console.log('  VEHICLES TO HAUL:');
      order.vehicles.forEach((vehicle, idx) => {
        console.log(`    ${idx + 1}. ${vehicle.year} ${vehicle.make} ${vehicle.model}`);
      });
      console.log('-'.repeat(60));
      console.log(`  Release Notes: ${order.transportationReleaseNotes}`);
      console.log('='.repeat(60));
      console.log('  [STATUS:READY] Load registered in carrier board for assignment.');
    } catch (err) {
      console.error('[ERROR:CARRIER-PAYLOAD] Failed to deserialize order payload:', err);
    }
  }

  public stop(): void {
    if (this.consumer) {
      this.consumer.disconnect();
      this.consumer.dispose();
      this.consumer = null;
      console.log('[CARRIER-SERVICE:STOPPED] Carrier consumer stopped.');
    }
  }
}
