/**
 * UI Service — DOM rendering and notification controller for NewCron Dispatch System.
 */

/**
 * Displays a Toastify toast notification.
 * @param {string} text
 * @param {'Accepted' | 'Cancelled' | 'Carrier' | 'error' | 'info'} type
 */
export function showToast(text, type = 'info') {
  if (typeof Toastify === 'undefined') {
    console.warn('[UI] Toastify library is not loaded');
    return;
  }

  let bg = '#1e3a8a'; // default blue
  if (type === 'Accepted' || type === 'success') {
    bg = '#065f46'; // emerald
  } else if (type === 'Cancelled' || type === 'error') {
    bg = '#9f1239'; // deep rose red
  }

  Toastify({
    text,
    duration: 5000,
    gravity: 'top',
    position: 'right',
    stopOnFocus: true,
    style: {
      background: bg,
      color: '#ffffff',
      fontSize: '13px',
      fontWeight: '500',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      padding: '12px 18px'
    }
  }).showToast();
}

/**
 * Switches the active view in the dashboard.
 * @param {'new-request' | 'my-requests' | 'available-loads'} view
 */
export function switchView(view) {
  document.querySelectorAll('.view').forEach((el) => el.classList.add('hidden'));
  const activeView = document.getElementById(`view-${view}`);
  if (activeView) activeView.classList.remove('hidden');

  const navBtns = ['new-request', 'my-requests', 'available-loads'];
  navBtns.forEach((name) => {
    const btn = document.getElementById(`nav-${name}`);
    if (!btn) return;
    if (name === view) {
      btn.classList.add('bg-slate-100', 'text-slate-900', 'font-semibold');
      btn.classList.remove('text-slate-600', 'font-medium');
    } else {
      btn.classList.remove('bg-slate-100', 'text-slate-900', 'font-semibold');
      btn.classList.add('text-slate-600', 'font-medium');
    }
  });
}

/**
 * Updates the Solace connection status indicator in the sidebar.
 * @param {'connected' | 'reconnecting'} status
 */
export function updateConnectionStatus(status) {
  const badge = document.getElementById('connection-status');
  const text = document.getElementById('connection-text');
  if (!badge || !text) return;

  if (status === 'connected') {
    badge.className = 'flex items-center space-x-2 text-xs font-medium text-emerald-700';
    text.innerText = 'Solace conectado';
  } else {
    badge.className = 'flex items-center space-x-2 text-xs font-medium text-amber-600';
    text.innerText = 'Reconectando...';
  }
}

/**
 * Renders a load into the Carrier Board table.
 * @param {object} order
 */
export function renderCarrierOrderRow(order) {
  const tbody = document.getElementById('carrier-orders-body');
  if (!tbody) return;

  const emptyState = document.getElementById('carrier-empty-state');
  if (emptyState) emptyState.remove();

  // Deduplicate
  const existingRow = tbody.querySelector(`tr[data-order-id="${order.shipperOrderId}"]`);
  if (existingRow) return;

  const row = document.createElement('tr');
  row.setAttribute('data-order-id', order.shipperOrderId);
  row.className = 'border-b border-slate-100 hover:bg-slate-50 transition';

  const routeStr = order.stops ? order.stops.map((s) => `${s.city}, ${s.state}`).join(' → ') : '—';
  const vehiclesStr = order.vehicles ? order.vehicles.map((v) => `${v.year} ${v.make} ${v.model}`).join(', ') : '—';
  const priceFormatted = Number(order.price || 0).toLocaleString();

  row.innerHTML = `
    <td class="py-2.5 pr-2 font-mono font-semibold text-slate-800">#${order.shipperOrderId}</td>
    <td class="py-2.5 pr-2 text-slate-600">${routeStr}</td>
    <td class="py-2.5 pr-2 text-slate-600 whitespace-nowrap">${order.pickupDate} → ${order.deliveryDate}</td>
    <td class="py-2.5 pr-2 text-slate-600">${vehiclesStr}</td>
    <td class="py-2.5 pr-2 text-right font-mono font-semibold text-emerald-700">$${priceFormatted}</td>
  `;

  tbody.prepend(row);
}

/**
 * Renders or updates a client result row in "Mis solicitudes".
 * @param {object} result
 * @param {object | null} originalOrder
 * @param {(orderId: string) => void} onSelectRow
 */
export function renderClientResultRow(result, originalOrder, onSelectRow) {
  const tbody = document.getElementById('client-results-body');
  if (!tbody) return;

  const emptyState = document.getElementById('client-empty-state');
  if (emptyState) emptyState.remove();

  const isAccepted = result.status === 'Accepted';
  const route = originalOrder && originalOrder.stops
    ? originalOrder.stops.map((s) => `${s.city}, ${s.state}`).join(' → ')
    : '—';
  const pickup = originalOrder ? originalOrder.pickupDate : '—';
  const price = originalOrder ? `$${Number(originalOrder.price || 0).toLocaleString()}` : '—';

  const rowHtml = `
    <td class="py-2.5 pr-2 font-mono font-semibold text-blue-700">#${result.shipperOrderId}</td>
    <td class="py-2.5 pr-2 text-slate-600">${route}</td>
    <td class="py-2.5 pr-2 text-slate-600">${pickup}</td>
    <td class="py-2.5 pr-2 text-slate-600">${price}</td>
    <td class="py-2.5 pr-2">
      <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
        isAccepted ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
      }">${result.status}</span>
    </td>
  `;

  let row = tbody.querySelector(`tr[data-order-id="${result.shipperOrderId}"]`);
  if (row) {
    row.innerHTML = rowHtml;
  } else {
    row = document.createElement('tr');
    row.setAttribute('data-order-id', result.shipperOrderId);
    row.className = 'border-b border-slate-100 hover:bg-slate-50 transition cursor-pointer';
    row.innerHTML = rowHtml;
    tbody.prepend(row);
  }

  row.onclick = () => {
    highlightSelectedRow(result.shipperOrderId, isAccepted);
    if (onSelectRow) onSelectRow(result.shipperOrderId);
  };
}

/**
 * Visually marks the selected row in the table.
 * @param {string} orderId
 * @param {boolean} isAccepted
 */
function highlightSelectedRow(orderId, isAccepted) {
  const tbody = document.getElementById('client-results-body');
  if (!tbody) return;

  tbody.querySelectorAll('tr').forEach((r) => {
    r.classList.remove('selected-row', 'selected-row-cancelled');
  });

  const row = tbody.querySelector(`tr[data-order-id="${orderId}"]`);
  if (row) {
    row.classList.add(isAccepted ? 'selected-row' : 'selected-row-cancelled');
  }
}

/**
 * Renders the detail panel for an order in "Mis solicitudes".
 * @param {object} result
 * @param {object | null} order
 */
export function renderOrderDetail(result, order) {
  const panel = document.getElementById('order-detail-panel');
  if (!panel || !result) return;

  const isAccepted = result.status === 'Accepted';
  const route = order && order.stops ? order.stops.map((s) => `${s.city}, ${s.state}`).join(' → ') : 'Ruta no disponible';
  const vehicle = order && order.vehicles ? order.vehicles.map((v) => `${v.year} ${v.make} ${v.model}`).join(', ') : '—';
  const price = order ? `$${Number(order.price || 0).toLocaleString()}` : '—';
  const pickup = order ? order.pickupDate : '—';
  const delivery = order ? order.deliveryDate : '—';

  const thirdStep = isAccepted
    ? { label: 'En cola de transportistas (dispatch.orders.queue)', failed: false }
    : { label: 'Cancelada por validación de negocio', failed: true };

  panel.innerHTML = `
    <div class="flex items-center justify-between mb-3">
      <span class="font-mono text-xs font-semibold text-slate-500">Orden #${result.shipperOrderId}</span>
      <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
        isAccepted ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
      }">${result.status}</span>
    </div>

    <p class="text-sm font-semibold text-slate-900 mb-3">${route}</p>

    <div class="p-3 rounded-lg text-xs mb-4 leading-relaxed ${
      isAccepted ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' : 'bg-rose-50 text-rose-800 border border-rose-100'
    }">
      <span class="font-semibold block mb-0.5">${isAccepted ? 'Aprobada' : 'Motivo de rechazo'}:</span>
      ${result.notes || 'Sin observaciones adicionales.'}
    </div>

    <div class="space-y-2.5 mb-5 text-xs">
      <div class="flex items-center space-x-2 text-slate-700">
        <span class="w-2 h-2 rounded-full bg-blue-600"></span>
        <span class="font-medium">1. Recibida en API</span>
      </div>
      <div class="flex items-center space-x-2 text-slate-700">
        <span class="w-2 h-2 rounded-full bg-blue-600"></span>
        <span class="font-medium">2. Validada según reglas NewCron</span>
      </div>
      <div class="flex items-center space-x-2 ${thirdStep.failed ? 'text-rose-700 font-semibold' : 'text-slate-700 font-medium'}">
        <span class="w-2 h-2 rounded-full ${thirdStep.failed ? 'bg-rose-500' : 'bg-blue-600'}"></span>
        <span>3. ${thirdStep.label}</span>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-3 text-xs border-t border-slate-100 pt-4">
      <div><p class="text-slate-400">Pick-up</p><p class="font-medium text-slate-800">${pickup}</p></div>
      <div><p class="text-slate-400">Delivery</p><p class="font-medium text-slate-800">${delivery}</p></div>
      <div><p class="text-slate-400">Vehículo</p><p class="font-medium text-slate-800">${vehicle}</p></div>
      <div><p class="text-slate-400">Precio</p><p class="font-semibold text-emerald-700">${price}</p></div>
    </div>
  `;

  highlightSelectedRow(result.shipperOrderId, isAccepted);
}

/**
 * Updates the accepted/cancelled counters on "Mis solicitudes".
 * @param {number} accepted
 * @param {number} cancelled
 */
export function updateCounters(accepted, cancelled) {
  const elAccepted = document.getElementById('stat-accepted');
  const elCancelled = document.getElementById('stat-cancelled');
  if (elAccepted) elAccepted.innerText = String(accepted);
  if (elCancelled) elCancelled.innerText = String(cancelled);
}

/**
 * Updates the total count of carrier loads.
 * @param {number} count
 */
export function updateCarrierCount(count) {
  const badge = document.getElementById('carrier-count');
  if (badge) badge.innerText = `${count} Loads`;
}

/**
 * Updates the state and text of the submit button.
 * @param {boolean} disabled
 * @param {string} [text]
 */
export function setSubmitButtonState(disabled, text = 'Publish Dispatch Request') {
  const btn = document.getElementById('submitBtn');
  if (!btn) return;
  btn.disabled = disabled;
  btn.querySelector('span').innerText = text;
}
