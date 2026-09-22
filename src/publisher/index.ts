import { SolaceClient } from '../utils/solace-client.js';
import { DispatchPublisher } from './publisher.service.js';
import type { DispatchRequest } from '../types/index.js';

export { DispatchPublisher };

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

async function main(): Promise<void> {
  console.log('[PUBLISHER:START] Initializing NewCron Dispatch Publisher...');

  const client = new SolaceClient();

  try {
    console.log('[SOLACE:CONNECTING] Connecting to Solace PubSub+ broker...');
    await client.connect();
    console.log('[SOLACE:CONNECTED] Session established successfully.');

    const publisher = new DispatchPublisher(client);

    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const inTwoDays = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    // Escenario 1: Solicitud Válida (Happy Path)
    const validOrder: DispatchRequest = {
      shipperOrderId: '6600111',
      pickupDate: formatDate(tomorrow),
      deliveryDate: formatDate(inTwoDays),
      price: 900,
      stops: [
        { stopNumber: 1, city: 'Milford', state: 'MA', postalCode: '01757' },
        { stopNumber: 2, city: 'Shippensburg', state: 'PA', postalCode: '17257' }
      ],
      vehicles: [
        { year: '2010', make: 'Toyota', model: 'Corolla' }
      ],
      transportationReleaseNotes:
        'Verify the pickup date; shipments cannot be delivered after 3:00 p.m. on the current date or on previous days.'
    };

    // Escenario 2: Fecha de Pickup Pasada (Regla 1)
    const pastPickupOrder: DispatchRequest = {
      shipperOrderId: '7743789',
      pickupDate: formatDate(yesterday),
      deliveryDate: formatDate(tomorrow),
      price: 750,
      stops: [
        { stopNumber: 1, city: 'Miami', state: 'FL', postalCode: '33101' },
        { stopNumber: 2, city: 'Atlanta', state: 'GA', postalCode: '30301' }
      ],
      vehicles: [
        { year: '2018', make: 'Honda', model: 'Civic' }
      ],
      transportationReleaseNotes: 'Standard release notes'
    };

    // Escenario 3: Mismo día después de las 3:00 p.m. (Regla 2)
    const lateSameDayOrder: DispatchRequest = {
      shipperOrderId: '8822334',
      pickupDate: formatDate(now),
      deliveryDate: formatDate(tomorrow),
      price: 1200,
      stops: [
        { stopNumber: 1, city: 'Dallas', state: 'TX', postalCode: '75201' },
        { stopNumber: 2, city: 'Houston', state: 'TX', postalCode: '77001' }
      ],
      vehicles: [
        { year: '2022', make: 'Ford', model: 'F-150' }
      ],
      transportationReleaseNotes: 'Urgent same-day pickup'
    };
    // Simulamos que la solicitud del escenario 3 llega a las 4:30 PM (16:30)
    const lateReferenceTime = new Date(now);
    lateReferenceTime.setHours(16, 30, 0, 0);

    // Escenario 4: Fecha de Entrega Inválida (Regla 3)
    const invalidDeliveryOrder: DispatchRequest = {
      shipperOrderId: '9911445',
      pickupDate: formatDate(tomorrow),
      deliveryDate: formatDate(tomorrow), // Mismo día de pickup
      price: 600,
      stops: [
        { stopNumber: 1, city: 'Phoenix', state: 'AZ', postalCode: '85001' },
        { stopNumber: 2, city: 'Tucson', state: 'AZ', postalCode: '85701' }
      ],
      vehicles: [
        { year: '2015', make: 'Chevrolet', model: 'Malibu' }
      ],
      transportationReleaseNotes: 'Same-day delivery test'
    };

    console.log('\n--- EXECUTING DISPATCH TEST SCENARIOS ---');

    console.log('\n>>> [SCENARIO 1] Happy Path (Valid Future Dates)');
    await publisher.processOrder(validOrder, now);

    console.log('\n>>> [SCENARIO 2] Rule 1 Violation (Past Pickup Date)');
    await publisher.processOrder(pastPickupOrder, now);

    console.log('\n>>> [SCENARIO 3] Rule 2 Violation (Same-Day Request After 3:00 PM)');
    await publisher.processOrder(lateSameDayOrder, lateReferenceTime);

    console.log('\n>>> [SCENARIO 4] Rule 3 Violation (Insufficient Delivery Margin)');
    await publisher.processOrder(invalidDeliveryOrder, now);

    console.log('\n--------------------------------------------------');
    console.log('[PUBLISHER:COMPLETE] All test scenarios submitted successfully.');

    // Esperar un breve instante para asegurar el drenado de mensajes en la red
    await new Promise((resolve) => setTimeout(resolve, 2000));

    await client.disconnect();
    console.log('[SOLACE:DISCONNECTED] Connection closed.');
  } catch (error) {
    console.error('[ERROR:PUBLISHER] Fatal error in publisher service:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  void main();
}
