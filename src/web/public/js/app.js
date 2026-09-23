/**
 * App Controller — Main entry point orchestrating UI, API, and Storage modules.
 */

import * as storage from './storage.js';
import * as api from './api.js';
import * as ui from './ui.js';

let acceptedCount = 0;
let cancelledCount = 0;
let carrierCount = 0;

// Set to avoid duplicate toasts if both POST response and SSE trigger quickly
const notifiedOrderStatuses = new Set();

/**
 * Initializes the application on page load.
 */
function init() {
  setupNavigation();
  setupFormValidation();
  setupTestScenarios();
  setupClearHistory();
  loadPersistedData();
  setupEventSource();
}

/**
 * Attaches navigation event listeners to sidebar buttons.
 */
function setupNavigation() {
  document.getElementById('nav-new-request')?.addEventListener('click', () => ui.switchView('new-request'));
  document.getElementById('nav-my-requests')?.addEventListener('click', () => ui.switchView('my-requests'));
  document.getElementById('nav-available-loads')?.addEventListener('click', () => ui.switchView('available-loads'));
  document.getElementById('btn-goto-new-request')?.addEventListener('click', () => ui.switchView('new-request'));
}

/**
 * Listens for form inputs to dynamically enable/disable the submit button.
 */
function setupFormValidation() {
  const form = document.getElementById('dispatch-form');
  if (!form) return;

  const validate = () => {
    const isValid = form.checkValidity();
    ui.setSubmitButtonState(!isValid, 'Publish Dispatch Request');
  };

  form.addEventListener('input', validate);
  form.addEventListener('change', validate);
  form.addEventListener('submit', handleSubmitOrder);

  // Initial check (starts disabled since fields are empty)
  validate();
}

/**
 * Submits the dispatch order to the backend API.
 * @param {Event} e
 */
async function handleSubmitOrder(e) {
  e.preventDefault();
  const form = e.target;

  ui.setSubmitButtonState(true, 'Publishing to Solace...');

  const order = {
    shipperOrderId: document.getElementById('orderId').value.trim(),
    pickupDate: document.getElementById('pickupDate').value,
    deliveryDate: document.getElementById('deliveryDate').value,
    price: Number(document.getElementById('price').value),
    stops: [
      {
        stopNumber: 1,
        city: document.getElementById('stop1City').value.trim(),
        state: document.getElementById('stop1State').value.trim().toUpperCase(),
        postalCode: document.getElementById('stop1Zip').value.trim()
      },
      {
        stopNumber: 2,
        city: document.getElementById('stop2City').value.trim(),
        state: document.getElementById('stop2State').value.trim().toUpperCase(),
        postalCode: document.getElementById('stop2Zip').value.trim()
      }
    ],
    vehicles: [
      {
        year: document.getElementById('vehicleYear').value.trim(),
        make: document.getElementById('vehicleMake').value.trim(),
        model: document.getElementById('vehicleModel').value.trim()
      }
    ],
    transportationReleaseNotes: document.getElementById('releaseNotes').value.trim()
  };

  // 1. Guardar la orden localmente para poder mostrar el itinerario completo
  storage.saveSubmittedOrder(order);

  try {
    const response = await api.postOrder(order);

    if (response.ok && response.data) {
      const result = response.data;
      handleNewClientResult(result, order, true);

      // Limpiar formulario y restablecer validación
      form.reset();
      ui.setSubmitButtonState(true, 'Publish Dispatch Request');

      // Cambiar a la vista "Mis solicitudes" para ver el resultado inmediatamente
      ui.switchView('my-requests');
    } else {
      ui.showToast(`Error al enviar orden: ${response.error || 'Fallo desconocido'}`, 'error');
    }
  } catch (err) {
    console.error('[APP] Error in submission workflow:', err);
    ui.showToast('Error inesperado al conectar con el servidor', 'error');
  } finally {
    const isValid = form.checkValidity();
    ui.setSubmitButtonState(!isValid, 'Publish Dispatch Request');
  }
}

/**
 * Handles processing of a client result (from POST response or SSE).
 * @param {object} result
 * @param {object | null} [order]
 * @param {boolean} [showToastFeedback=false]
 */
function handleNewClientResult(result, order = null, showToastFeedback = false) {
  if (!result || !result.shipperOrderId) return;

  const originalOrder = order || storage.getSubmittedOrder(result.shipperOrderId);

  // Guardar en almacenamiento persistente
  storage.saveClientResult(result);

  // Renderizar fila en la tabla
  ui.renderClientResultRow(result, originalOrder, (orderId) => {
    const ord = storage.getSubmittedOrder(orderId);
    ui.renderOrderDetail(result, ord);
  });

  // Mostrar detalle de la orden más reciente
  ui.renderOrderDetail(result, originalOrder);

  // Recalcular contadores
  recalculateCounters();

  // Notificación Toastify garantizada
  const toastKey = `${result.shipperOrderId}_${result.status}`;
  if (showToastFeedback || !notifiedOrderStatuses.has(toastKey)) {
    notifiedOrderStatuses.add(toastKey);
    const isAccepted = result.status === 'Accepted';
    const message = isAccepted
      ? `[Accepted] Orden #${result.shipperOrderId} validada y enviada a transportistas.`
      : `[Cancelled] Orden #${result.shipperOrderId}: ${result.notes}`;

    ui.showToast(message, isAccepted ? 'Accepted' : 'Cancelled');
  }
}

/**
 * Handles incoming carrier loads from SSE.
 * @param {object} order
 */
function handleNewCarrierOrder(order) {
  if (!order || !order.shipperOrderId) return;

  storage.saveCarrierOrder(order);
  ui.renderCarrierOrderRow(order);

  const orders = storage.getCarrierOrders();
  carrierCount = orders.length;
  ui.updateCarrierCount(carrierCount);

  const toastKey = `carrier_${order.shipperOrderId}`;
  if (!notifiedOrderStatuses.has(toastKey)) {
    notifiedOrderStatuses.add(toastKey);
    ui.showToast(`Cargas disponibles: Nueva orden #${order.shipperOrderId} ($${order.price} USD)`, 'Carrier');
  }
}

/**
 * Recalculates stats based on stored results.
 */
function recalculateCounters() {
  const results = storage.getClientResults();
  acceptedCount = results.filter((r) => r.status === 'Accepted').length;
  cancelledCount = results.filter((r) => r.status === 'Cancelled').length;
  ui.updateCounters(acceptedCount, cancelledCount);
}

/**
 * Loads data from localStorage on startup.
 */
function loadPersistedData() {
  // Cargar órdenes del transportista
  const carrierOrders = storage.getCarrierOrders();
  carrierCount = carrierOrders.length;
  ui.updateCarrierCount(carrierCount);
  carrierOrders.forEach((order) => {
    ui.renderCarrierOrderRow(order);
  });

  // Cargar resultados de clientes
  const results = storage.getClientResults();
  recalculateCounters();

  if (results.length > 0) {
    results.forEach((res) => {
      const original = storage.getSubmittedOrder(res.shipperOrderId);
      ui.renderClientResultRow(res, original, (orderId) => {
        const ord = storage.getSubmittedOrder(orderId);
        const r = results.find((item) => item.shipperOrderId === orderId);
        if (r) ui.renderOrderDetail(r, ord);
      });
    });

    // Mostrar el primero en el panel de detalle por defecto
    const latest = results[0];
    const latestOrder = storage.getSubmittedOrder(latest.shipperOrderId);
    ui.renderOrderDetail(latest, latestOrder);
  }
}

/**
 * Connects to Server-Sent Events for real-time updates.
 */
function setupEventSource() {
  api.connectEventStream({
    onEvent: (eventData) => {
      if (eventData.type === 'CARRIER_ORDER') {
        handleNewCarrierOrder(eventData.payload);
      } else if (eventData.type === 'CLIENT_RESULT') {
        handleNewClientResult(eventData.payload, null, false);
      }
    },
    onConnected: () => {
      ui.updateConnectionStatus('connected');
    },
    onDisconnected: () => {
      ui.updateConnectionStatus('reconnecting');
    }
  });
}

/**
 * Sets up test scenario presets.
 */
function setupTestScenarios() {
  const toggleBtn = document.getElementById('test-scenarios-toggle');
  const panel = document.getElementById('test-scenarios-panel');
  const chevron = document.getElementById('test-scenarios-chevron');

  toggleBtn?.addEventListener('click', () => {
    panel.classList.toggle('hidden');
    const isHidden = panel.classList.contains('hidden');
    chevron.style.transform = isHidden ? '' : 'rotate(90deg)';
  });

  document.querySelectorAll('[data-scenario]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const scenarioNum = Number(btn.getAttribute('data-scenario'));
      populateScenario(scenarioNum, false);
    });
  });

  document.querySelectorAll('[data-scenario-submit]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const scenarioNum = Number(btn.getAttribute('data-scenario-submit'));
      populateScenario(scenarioNum, true);
    });
  });
}

/**
 * Fills the form with a specific scenario's sample data.
 * @param {number} num
 * @param {boolean} autoSubmit
 */
function populateScenario(num, autoSubmit = false) {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const formatYMD = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const inTwoDays = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  document.getElementById('stop1City').value = 'Milford';
  document.getElementById('stop1State').value = 'MA';
  document.getElementById('stop1Zip').value = '01757';
  document.getElementById('stop2City').value = 'Shippensburg';
  document.getElementById('stop2State').value = 'PA';
  document.getElementById('stop2Zip').value = '17257';
  document.getElementById('vehicleYear').value = '2010';
  document.getElementById('vehicleMake').value = 'Toyota';
  document.getElementById('vehicleModel').value = 'Corolla';
  document.getElementById('releaseNotes').value = 'Verify pickup window and vehicle condition';

  if (num === 1) {
    document.getElementById('orderId').value = '6600111';
    document.getElementById('price').value = '900';
    document.getElementById('pickupDate').value = formatYMD(tomorrow);
    document.getElementById('deliveryDate').value = formatYMD(inTwoDays);
  } else if (num === 2) {
    document.getElementById('orderId').value = '7743789';
    document.getElementById('price').value = '750';
    document.getElementById('pickupDate').value = formatYMD(yesterday);
    document.getElementById('deliveryDate').value = formatYMD(tomorrow);
  } else if (num === 3) {
    document.getElementById('orderId').value = '8822334';
    document.getElementById('price').value = '1200';
    document.getElementById('pickupDate').value = formatYMD(now);
    document.getElementById('deliveryDate').value = formatYMD(tomorrow);
  } else if (num === 4) {
    document.getElementById('orderId').value = '9911445';
    document.getElementById('price').value = '600';
    document.getElementById('pickupDate').value = formatYMD(tomorrow);
    document.getElementById('deliveryDate').value = formatYMD(tomorrow);
  }

  // Trigger input event to update validation state
  const form = document.getElementById('dispatch-form');
  form.dispatchEvent(new Event('input', { bubbles: true }));

  if (autoSubmit) {
    form.requestSubmit();
  }
}

/**
 * Sets up button to clear local history.
 */
function setupClearHistory() {
  const btn = document.getElementById('btn-clear-history');
  btn?.addEventListener('click', () => {
    if (!confirm('¿Deseas limpiar el historial local guardado en tu navegador?')) return;

    storage.clearAllStorage();

    // Reset UI tables
    const clientTbody = document.getElementById('client-results-body');
    if (clientTbody) {
      clientTbody.innerHTML = `
        <tr id="client-empty-state">
          <td colspan="5" class="py-10 text-center text-slate-400">No hay notificaciones de estado aún.</td>
        </tr>
      `;
    }

    const carrierTbody = document.getElementById('carrier-orders-body');
    if (carrierTbody) {
      carrierTbody.innerHTML = `
        <tr id="carrier-empty-state">
          <td colspan="5" class="py-10 text-center text-slate-400">No hay cargas activas disponibles. Esperando despachos aprobados...</td>
        </tr>
      `;
    }

    const panel = document.getElementById('order-detail-panel');
    if (panel) {
      panel.innerHTML = `<p class="text-xs text-slate-400">Selecciona una orden de la tabla para ver el detalle.</p>`;
    }

    acceptedCount = 0;
    cancelledCount = 0;
    carrierCount = 0;
    ui.updateCounters(0, 0);
    ui.updateCarrierCount(0);
    notifiedOrderStatuses.clear();

    ui.showToast('Historial local reiniciado con éxito', 'info');
  });
}

// Start application
window.addEventListener('DOMContentLoaded', init);
