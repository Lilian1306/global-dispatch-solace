/**
 * Modelos de datos e interfaces para el sistema Global Dispatch de NewCron
 * integrando mensajería con Solace PubSub+.
 */

/**
 * Parada de ruta de transporte de vehículos
 */
export interface Stop {
  stopNumber: number;
  city: string;
  state: string;
  postalCode: string;
}


export interface Vehicle {
  year: string;
  make: string;
  model: string;
}

export interface DispatchRequest {
  shipperOrderId: string;
  pickupDate: string; // Formato esperado: YYYY-MM-DD
  deliveryDate: string; // Formato esperado: YYYY-MM-DD
  price: number;
  stops: Stop[];
  vehicles: Vehicle[];
  transportationReleaseNotes: string;
}


export type DispatchStatus = 'Accepted' | 'Cancelled';


export interface AcceptedResult {
  shipperOrderId: string;
  status: 'Accepted';
  notes: string;
}


export interface CancelledResult {
  shipperOrderId: string;
  status: 'Cancelled';
  notes: string;
}

export type DispatchResult = AcceptedResult | CancelledResult;


export interface ValidationResult {
  isValid: boolean;
  reason?: string;
}
