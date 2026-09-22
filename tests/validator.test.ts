import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateDispatchRequest } from '../src/utils/validator.ts';
import type { DispatchRequest } from '../src/types/index.ts';

function createMockOrder(overrides: Partial<DispatchRequest> = {}): DispatchRequest {
  return {
    shipperOrderId: '6600111',
    pickupDate: '2026-09-23',
    deliveryDate: '2026-09-24',
    price: 900,
    stops: [
      { stopNumber: 1, city: 'Milford', state: 'MA', postalCode: '01757' },
      { stopNumber: 2, city: 'Shippensburg', state: 'PA', postalCode: '17257' }
    ],
    vehicles: [
      { year: '2010', make: 'Toyota', model: 'Corolla' }
    ],
    transportationReleaseNotes: 'Standard release notes',
    ...overrides
  };
}

describe('Business Rule Validation Tests - NewCron Global Dispatch', () => {

  describe('Rule 1: Pickup date cannot be earlier than current date', () => {
    it('should reject when pickupDate is in the past (yesterday)', () => {
      const referenceDate = new Date(2026, 8, 22, 10, 0); // 2026-09-22 10:00 AM
      const order = createMockOrder({
        pickupDate: '2026-09-21', // Yesterday
        deliveryDate: '2026-09-23'
      });

      const result = validateDispatchRequest(order, referenceDate);

      assert.equal(result.isValid, false);
      assert.equal(result.reason, 'Pickup date cannot be earlier than the current date.');
    });

    it('should accept when pickupDate is today (before cutoff time)', () => {
      const referenceDate = new Date(2026, 8, 22, 10, 0); // 2026-09-22 10:00 AM
      const order = createMockOrder({
        pickupDate: '2026-09-22', // Today
        deliveryDate: '2026-09-23'
      });

      const result = validateDispatchRequest(order, referenceDate);

      assert.equal(result.isValid, true);
      assert.equal(result.reason, undefined);
    });

    it('should accept when pickupDate is in the future (tomorrow)', () => {
      const referenceDate = new Date(2026, 8, 22, 10, 0); // 2026-09-22 10:00 AM
      const order = createMockOrder({
        pickupDate: '2026-09-23', // Tomorrow
        deliveryDate: '2026-09-24'
      });

      const result = validateDispatchRequest(order, referenceDate);

      assert.equal(result.isValid, true);
    });
  });

  describe('Rule 2: Same-day pickup cutoff at 3:00 p.m. (15:00)', () => {
    it('should accept same-day pickup submitted at 2:59 p.m. (14:59)', () => {
      const referenceDate = new Date(2026, 8, 22, 14, 59);
      const order = createMockOrder({
        pickupDate: '2026-09-22',
        deliveryDate: '2026-09-23'
      });

      const result = validateDispatchRequest(order, referenceDate);

      assert.equal(result.isValid, true);
    });

    it('should accept same-day pickup submitted exactly at 3:00 p.m. (15:00:00)', () => {
      const referenceDate = new Date(2026, 8, 22, 15, 0, 0);
      const order = createMockOrder({
        pickupDate: '2026-09-22',
        deliveryDate: '2026-09-23'
      });

      const result = validateDispatchRequest(order, referenceDate);

      assert.equal(result.isValid, true);
    });

    it('should reject same-day pickup submitted at 3:01 p.m. (15:01)', () => {
      const referenceDate = new Date(2026, 8, 22, 15, 1);
      const order = createMockOrder({
        pickupDate: '2026-09-22',
        deliveryDate: '2026-09-23'
      });

      const result = validateDispatchRequest(order, referenceDate);

      assert.equal(result.isValid, false);
      assert.equal(result.reason, 'Same-day pickup requests cannot be submitted after 3:00 p.m.');
    });

    it('should reject same-day pickup submitted at 4:30 p.m. (16:30)', () => {
      const referenceDate = new Date(2026, 8, 22, 16, 30);
      const order = createMockOrder({
        pickupDate: '2026-09-22',
        deliveryDate: '2026-09-23'
      });

      const result = validateDispatchRequest(order, referenceDate);

      assert.equal(result.isValid, false);
      assert.equal(result.reason, 'Same-day pickup requests cannot be submitted after 3:00 p.m.');
    });

    it('should allow afternoon submissions for FUTURE pickup dates (e.g. submitted at 5:00 p.m. for tomorrow)', () => {
      const referenceDate = new Date(2026, 8, 22, 17, 0); // 5:00 PM
      const order = createMockOrder({
        pickupDate: '2026-09-23', // Tomorrow
        deliveryDate: '2026-09-24'
      });

      const result = validateDispatchRequest(order, referenceDate);

      assert.equal(result.isValid, true);
    });
  });

  describe('Rule 3: Delivery date must be at least one day after pickup date', () => {
    it('should reject when deliveryDate is on the same day as pickupDate', () => {
      const referenceDate = new Date(2026, 8, 22, 10, 0);
      const order = createMockOrder({
        pickupDate: '2026-09-23',
        deliveryDate: '2026-09-23' // Same day
      });

      const result = validateDispatchRequest(order, referenceDate);

      assert.equal(result.isValid, false);
      assert.equal(result.reason, 'Delivery date must be at least one day after pickup date.');
    });

    it('should reject when deliveryDate is earlier than pickupDate', () => {
      const referenceDate = new Date(2026, 8, 22, 10, 0);
      const order = createMockOrder({
        pickupDate: '2026-09-24',
        deliveryDate: '2026-09-23' // Earlier than pickup
      });

      const result = validateDispatchRequest(order, referenceDate);

      assert.equal(result.isValid, false);
      assert.equal(result.reason, 'Delivery date must be at least one day after pickup date.');
    });

    it('should accept when deliveryDate is exactly 1 day after pickupDate', () => {
      const referenceDate = new Date(2026, 8, 22, 10, 0);
      const order = createMockOrder({
        pickupDate: '2026-09-23',
        deliveryDate: '2026-09-24' // +1 day
      });

      const result = validateDispatchRequest(order, referenceDate);

      assert.equal(result.isValid, true);
    });

    it('should accept when deliveryDate is multiple days after pickupDate', () => {
      const referenceDate = new Date(2026, 8, 22, 10, 0);
      const order = createMockOrder({
        pickupDate: '2026-09-23',
        deliveryDate: '2026-09-28' // +5 days
      });

      const result = validateDispatchRequest(order, referenceDate);

      assert.equal(result.isValid, true);
    });
  });

  describe('Edge Cases and Scenario Integration', () => {
    it('should correctly validate the official Happy Path order from project specifications', () => {
      const referenceDate = new Date(2026, 8, 21, 12, 0);
      const officialOrder: DispatchRequest = {
        shipperOrderId: '6600111',
        pickupDate: '2026-09-21',
        deliveryDate: '2026-09-22',
        price: 900,
        stops: [
          { stopNumber: 1, city: 'Milford', state: 'MA', postalCode: '01757' },
          { stopNumber: 2, city: 'Shippensburg', state: 'PA', postalCode: '17257' }
        ],
        vehicles: [
          { year: '2010', make: 'Toyota', model: 'Corolla' }
        ],
        transportationReleaseNotes: 'Verify the pickup date...'
      };

      const result = validateDispatchRequest(officialOrder, referenceDate);

      assert.equal(result.isValid, true);
    });
  });
});
