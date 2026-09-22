import type solace from 'solclientjs';
import { SolaceClient, parseMessagePayload } from '../utils/solace-client.js';
import { QUEUES } from '../config/solace.config.js';
import type { DispatchRequest } from '../types/index.js';

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
    console.log(`📡 Iniciando consumidor para Dashboard de Transportistas...`);
    console.log(`📥 Escuchando cola persistente: "${QUEUES.ORDERS}"`);

    this.consumer = await this.client.createQueueConsumer(
      QUEUES.ORDERS,
      (message) => this.handleOrderMessage(message),
      (error) => {
        console.error('❌ Error en el consumidor de transportistas:', error);
      }
    );

    console.log(`✅ Dashboard de transportistas en línea. Esperando órdenes disponibles...`);
  }

  /**
   * Procesa y despliega en consola las órdenes disponibles recibidas de la cola.
   */
  public handleOrderMessage(message: solace.Message): void {
    try {
      const order = parseMessagePayload<DispatchRequest>(message);

      console.log('\n' + '═'.repeat(72));
      console.log('       🚚 NUEVA CARGA DISPONIBLE PARA TRANSPORTISTAS - NEWCRON');
      console.log('═'.repeat(72));
      console.log(` 📦 Orden ID:          ${order.shipperOrderId}`);
      console.log(` 💰 Tarifa Ofrecida:   $${order.price.toLocaleString()} USD`);
      console.log(` 📅 Fecha de Recogida: ${order.pickupDate}`);
      console.log(` 🏁 Fecha de Entrega:  ${order.deliveryDate}`);
      console.log('─'.repeat(72));
      console.log(' 📍 ITINERARIO / PARADAS:');
      order.stops.forEach((stop) => {
        console.log(`    Parada #${stop.stopNumber}: ${stop.city}, ${stop.state} (CP: ${stop.postalCode})`);
      });
      console.log('─'.repeat(72));
      console.log(' 🚗 VEHÍCULOS A TRANSPORTAR:');
      order.vehicles.forEach((vehicle, idx) => {
        console.log(`    ${idx + 1}. ${vehicle.year} ${vehicle.make} ${vehicle.model}`);
      });
      console.log('─'.repeat(72));
      console.log(` 📝 Notas de Despacho: ${order.transportationReleaseNotes}`);
      console.log('═'.repeat(72));
      console.log(' ✔️ Carga registrada en el dashboard lista para asignación.');
    } catch (err) {
      console.error('❌ Error al deserializar payload de la orden:', err);
    }
  }

  public stop(): void {
    if (this.consumer) {
      this.consumer.disconnect();
      this.consumer.dispose();
      this.consumer = null;
      console.log('🛑 Consumidor de transportistas detenido.');
    }
  }
}
