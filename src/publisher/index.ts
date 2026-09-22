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
  console.log('🚀 Iniciando Servicio Publicador de NewCron (Solace PubSub+)...');

  const client = new SolaceClient();

  try {
    console.log('🔌 Conectando al broker Solace...');
    await client.connect();
    console.log('✅ Conexión establecida exitosamente.');

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

    console.log('\n--- INICIANDO ENVÍO DE ESCENARIOS DE PRUEBA ---');

    console.log('\n>>> [TEST 1] Caso Feliz (Válido)');
    await publisher.processOrder(validOrder, now);

    console.log('\n>>> [TEST 2] Fecha de Pickup Anterior a Hoy (Inválido - Regla 1)');
    await publisher.processOrder(pastPickupOrder, now);

    console.log('\n>>> [TEST 3] Mismo Día después de las 3:00 PM (Inválido - Regla 2)');
    await publisher.processOrder(lateSameDayOrder, lateReferenceTime);

    console.log('\n>>> [TEST 4] Fecha de Entrega sin Margen de 1 Día (Inválido - Regla 3)');
    await publisher.processOrder(invalidDeliveryOrder, now);

    console.log('\n==================================================');
    console.log('✅ Proceso de publicación completado exitosamente.');

    // Esperar un breve instante para asegurar el drenado de mensajes en la red
    await new Promise((resolve) => setTimeout(resolve, 2000));

    await client.disconnect();
    console.log('👋 Desconectado de Solace.');
  } catch (error) {
    console.error('❌ Error en el servicio publicador:', error);
    process.exit(1);
  }
}

// Ejecutar si es invocado directamente
if (require.main === module) {
  void main();
}
