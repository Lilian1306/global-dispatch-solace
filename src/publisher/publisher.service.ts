import { SolaceClient } from '../utils/solace-client.js';
import { validateDispatchRequest } from '../utils/validator.js';
import { TOPICS } from '../config/solace.config.js';
import type {
  DispatchRequest,
  DispatchResult,
  AcceptedResult,
  CancelledResult
} from '../types/index.js';

export class DispatchPublisher {
  private client: SolaceClient;

  constructor(client: SolaceClient) {
    this.client = client;
  }

  /**
   * Valida y procesa una orden de despacho.
   * Si es válida, se publica en el tópico de órdenes para transportistas
   * y se emite el resultado "Accepted" al tópico de resultados para clientes.
   * Si es inválida, se emite el resultado "Cancelled" al tópico de resultados.
   */
  public async processOrder(
    order: DispatchRequest,
    referenceDate: Date = new Date()
  ): Promise<DispatchResult> {
    console.log(`\n==================================================`);
    console.log(`📦 Procesando orden: ${order.shipperOrderId}`);
    console.log(`📅 Pickup: ${order.pickupDate} | Delivery: ${order.deliveryDate}`);
    console.log(`⏰ Fecha/Hora de referencia: ${referenceDate.toLocaleString()}`);

    const validation = validateDispatchRequest(order, referenceDate);

    if (!validation.isValid) {
      const reason = validation.reason ?? 'Order validation failed.';
      const cancelledResult: CancelledResult = {
        shipperOrderId: order.shipperOrderId,
        status: 'Cancelled',
        notes: reason
      };

      console.log(`❌ Validación fallida: ${reason}`);
      console.log(`📢 Publicando estado 'Cancelled' a tópico: ${TOPICS.RESULTS}`);
      this.client.publish(TOPICS.RESULTS, cancelledResult);

      return cancelledResult;
    }

    // Orden válida
    console.log(`✅ Validación exitosa. Cumple todas las reglas de negocio.`);

    // 1. Publicar a cola de transportistas vía tópico de órdenes
    console.log(`📢 Publicando orden completa a transportistas (tópico: ${TOPICS.ORDERS})`);
    this.client.publish(TOPICS.ORDERS, order);

    // 2. Publicar confirmación 'Accepted' para el cliente
    const acceptedResult: AcceptedResult = {
      shipperOrderId: order.shipperOrderId,
      status: 'Accepted',
      notes: 'You will receive an email when a carrier accepts this dispatch request'
    };

    console.log(`📢 Publicando estado 'Accepted' a clientes (tópico: ${TOPICS.RESULTS})`);
    this.client.publish(TOPICS.RESULTS, acceptedResult);

    return acceptedResult;
  }
}
