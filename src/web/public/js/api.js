/**
 * API Service — Network communication layer for NewCron Dispatch System.
 * Connects to the Express backend and Server-Sent Events (SSE).
 */

/**
 * Submits a new dispatch request to the backend.
 * @param {object} order
 * @returns {Promise<{ ok: boolean, data?: any, error?: string }>}
 */
export async function postOrder(order) {
  try {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order)
    });

    if (!res.ok) {
      const errorText = await res.text();
      return { ok: false, error: `HTTP ${res.status}: ${errorText}` };
    }

    const data = await res.json();
    return { ok: true, data };
  } catch (err) {
    console.error('[API] Network error submitting order:', err);
    return { ok: false, error: err.message || 'Network connection failed' };
  }
}

/**
 * Establishes a Server-Sent Events (SSE) connection to receive real-time broker updates.
 * @param {object} callbacks
 * @param {(payload: { type: string, payload: any }) => void} callbacks.onEvent
 * @param {() => void} callbacks.onConnected
 * @param {() => void} callbacks.onDisconnected
 * @returns {EventSource}
 */
export function connectEventStream({ onEvent, onConnected, onDisconnected }) {
  const evtSource = new EventSource('/api/events');

  evtSource.onopen = () => {
    if (onConnected) onConnected();
  };

  evtSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (onEvent) onEvent(data);
    } catch (err) {
      console.error('[API:SSE] Error parsing SSE payload:', err);
    }
  };

  evtSource.onerror = () => {
    if (onDisconnected) onDisconnected();
  };

  return evtSource;
}
