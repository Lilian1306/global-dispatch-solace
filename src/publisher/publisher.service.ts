import { SolaceClient } from '../utils/solace-client';
import { validateDispatchRequest } from '../utils/validator';
import { TOPICS } from '../config/solace.config';
import type {
  DispatchRequest,
  DispatchResult,
  AcceptedResult,
  CancelledResult
} from '../types/index';

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
    console.log(`\n--------------------------------------------------`);
    console.log(`[DISPATCH:PROCESS] Order ID: ${order.shipperOrderId}`);
    console.log(`[DISPATCH:DATES] Pickup: ${order.pickupDate} | Delivery: ${order.deliveryDate}`);
    console.log(`[DISPATCH:TIME] Reference timestamp: ${referenceDate.toISOString()}`);

    const validation = validateDispatchRequest(order, referenceDate);

    if (!validation.isValid) {
      const reason = validation.reason ?? 'Order validation failed.';
      const cancelledResult: CancelledResult = {
        shipperOrderId: order.shipperOrderId,
        status: 'Cancelled',
        notes: reason
      };

      console.log(`[VALIDATION:FAILED] Reason: ${reason}`);
      console.log(`[PUBLISH:RESULTS] Emitting 'Cancelled' status to topic: ${TOPICS.RESULTS}`);
      this.client.publish(TOPICS.RESULTS, cancelledResult);

      return cancelledResult;
    }

    // Solicitud válida
    console.log(`[VALIDATION:SUCCESS] Order complies with all business validation rules.`);

    // 1. Publicar a cola de transportistas vía tópico de órdenes
    console.log(`[PUBLISH:ORDERS] Emitting full load details to carriers topic: ${TOPICS.ORDERS}`);
    this.client.publish(TOPICS.ORDERS, order);

    // 2. Publicar confirmación 'Accepted' para el cliente
    const acceptedResult: AcceptedResult = {
      shipperOrderId: order.shipperOrderId,
      status: 'Accepted',
      notes: 'You will receive an email when a carrier accepts this dispatch request'
    };

    console.log(`[PUBLISH:RESULTS] Emitting 'Accepted' status to clients topic: ${TOPICS.RESULTS}`);
    this.client.publish(TOPICS.RESULTS, acceptedResult);

    return acceptedResult;
  }
}
