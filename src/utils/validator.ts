import type { DispatchRequest, ValidationResult } from '../types/index';

function parseDateOnly(dateStr: string): Date {
  const parts = dateStr.split('-').map(Number);
  const year = parts[0] ?? 0;
  const month = (parts[1] ?? 1) - 1;
  const day = parts[2] ?? 1;
  return new Date(year, month, day);
}

export function validateDispatchRequest(
  order: DispatchRequest,
  referenceDate: Date = new Date()
): ValidationResult {
  const today = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate()
  );

  const pickupDate = parseDateOnly(order.pickupDate);
  const deliveryDate = parseDateOnly(order.deliveryDate);

  if (pickupDate.getTime() < today.getTime()) {
    return {
      isValid: false,
      reason: 'Pickup date cannot be earlier than the current date.'
    };
  }

  if (pickupDate.getTime() === today.getTime()) {
    const hours = referenceDate.getHours();
    const minutes = referenceDate.getMinutes();

    if (hours > 15 || (hours === 15 && minutes > 0)) {
      return {
        isValid: false,
        reason: 'Same-day pickup requests cannot be submitted after 3:00 p.m.'
      };
    }
  }

  const msPerDay = 1000 * 60 * 60 * 24;
  const daysDiff = Math.round((deliveryDate.getTime() - pickupDate.getTime()) / msPerDay);

  if (daysDiff < 1) {
    return {
      isValid: false,
      reason: 'Delivery date must be at least one day after pickup date.'
    };
  }

  return { isValid: true };
}
