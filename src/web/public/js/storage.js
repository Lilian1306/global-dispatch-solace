/**
 * Storage Service — LocalStorage persistence for NewCron Dispatch System.
 * Ensures data is preserved across page refreshes (F5).
 */

const STORAGE_KEYS = {
  SUBMITTED_ORDERS: 'newcron_submitted_orders',
  CLIENT_RESULTS: 'newcron_client_results',
  CARRIER_ORDERS: 'newcron_carrier_orders'
};

/**
 * Retrieves all locally saved submitted orders.
 * @returns {Record<string, any>}
 */
export function getSubmittedOrders() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SUBMITTED_ORDERS);
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    console.error('[STORAGE] Error reading submitted orders:', err);
    return {};
  }
}

/**
 * Retrieves a single submitted order by its ID.
 * @param {string} orderId
 * @returns {any | null}
 */
export function getSubmittedOrder(orderId) {
  const orders = getSubmittedOrders();
  return orders[orderId] || null;
}

/**
 * Saves a submitted order to local storage.
 * @param {any} order
 */
export function saveSubmittedOrder(order) {
  try {
    const orders = getSubmittedOrders();
    orders[order.shipperOrderId] = order;
    localStorage.setItem(STORAGE_KEYS.SUBMITTED_ORDERS, JSON.stringify(orders));
  } catch (err) {
    console.error('[STORAGE] Error saving submitted order:', err);
  }
}

/**
 * Retrieves all client results.
 * @returns {Array<any>}
 */
export function getClientResults() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CLIENT_RESULTS);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('[STORAGE] Error reading client results:', err);
    return [];
  }
}

/**
 * Saves a client result. Updates if already exists, or prepends if new.
 * @param {any} result
 */
export function saveClientResult(result) {
  try {
    const results = getClientResults();
    const existingIndex = results.findIndex((r) => r.shipperOrderId === result.shipperOrderId);

    if (existingIndex >= 0) {
      results[existingIndex] = result;
    } else {
      results.unshift(result);
    }

    localStorage.setItem(STORAGE_KEYS.CLIENT_RESULTS, JSON.stringify(results));
  } catch (err) {
    console.error('[STORAGE] Error saving client result:', err);
  }
}

/**
 * Retrieves all available carrier loads.
 * @returns {Array<any>}
 */
export function getCarrierOrders() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CARRIER_ORDERS);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('[STORAGE] Error reading carrier orders:', err);
    return [];
  }
}

/**
 * Saves an order to the carrier board. Prepends if not already present.
 * @param {any} order
 */
export function saveCarrierOrder(order) {
  try {
    const orders = getCarrierOrders();
    const exists = orders.some((o) => o.shipperOrderId === order.shipperOrderId);
    if (!exists) {
      orders.unshift(order);
      localStorage.setItem(STORAGE_KEYS.CARRIER_ORDERS, JSON.stringify(orders));
    }
  } catch (err) {
    console.error('[STORAGE] Error saving carrier order:', err);
  }
}

/**
 * Clears all stored dispatch data from local storage.
 */
export function clearAllStorage() {
  try {
    localStorage.removeItem(STORAGE_KEYS.SUBMITTED_ORDERS);
    localStorage.removeItem(STORAGE_KEYS.CLIENT_RESULTS);
    localStorage.removeItem(STORAGE_KEYS.CARRIER_ORDERS);
  } catch (err) {
    console.error('[STORAGE] Error clearing storage:', err);
  }
}
