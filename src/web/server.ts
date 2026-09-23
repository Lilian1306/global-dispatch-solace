import express, { Request, Response } from 'express';
import path from 'path';
import { SolaceClient } from '../utils/solace-client';
import { CarrierDashboard } from '../consumer-carriers/carrier-dashboard';
import { ClientPanel } from '../consumer-clients/client-panel';
import { DispatchPublisher } from '../publisher/publisher.service';
import type { DispatchRequest } from '../types/index';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Clientes conectados a Server-Sent Events (SSE)
let sseClients: Response[] = [];

function broadcastEvent(type: 'CARRIER_ORDER' | 'CLIENT_RESULT', payload: unknown): void {
  const data = JSON.stringify({ type, payload });
  sseClients.forEach((client) => {
    client.write(`data: ${data}\n\n`);
  });
}

// Endpoint de Server-Sent Events (SSE)
app.get('/api/events', (req: Request, res: Response) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  res.write(': connected\n\n');
  sseClients.push(res);

  req.on('close', () => {
    sseClients = sseClients.filter((client) => client !== res);
  });
});

async function bootstrap(): Promise<void> {
  console.log('[WEB-SERVER:START] Initializing NewCron Web Dashboard...');

  const solaceClient = new SolaceClient();

  try {
    console.log('[SOLACE:CONNECTING] Connecting to Solace PubSub+ broker...');
    await solaceClient.connect();
    console.log('[SOLACE:CONNECTED] Connection established successfully.');

    // 1. Iniciar Consumidor de Transportistas con callback hacia el navegador
    const carrierDashboard = new CarrierDashboard(solaceClient, (order) => {
      broadcastEvent('CARRIER_ORDER', order);
    });
    await carrierDashboard.start();

    // 2. Iniciar Panel de Clientes con callback hacia el navegador
    const clientPanel = new ClientPanel(solaceClient, (result) => {
      broadcastEvent('CLIENT_RESULT', result);
    });
    await clientPanel.start();

    // 3. Iniciar Servicio Publicador
    const publisher = new DispatchPublisher(solaceClient);

    // Endpoint para enviar nuevas órdenes desde la UI web
    app.post('/api/orders', async (req: Request, res: Response) => {
      try {
        const order = req.body as DispatchRequest;
        const result = await publisher.processOrder(order);
        res.json(result);
      } catch (err) {
        console.error('[ERROR:API-ORDERS] Failed to process order:', err);
        res.status(500).json({ error: 'Failed to process order' });
      }
    });

    app.listen(PORT, () => {
      console.log('='.repeat(60));
      console.log(`[WEB-SERVER:ONLINE] Dashboard running at: http://localhost:${PORT}`);
      console.log('  Open your browser to interact with the dispatch system in real time.');
      console.log('='.repeat(60));
    });

    // Apagado elegante
    const shutdown = async () => {
      console.log('\n[SHUTDOWN] Stopping Web Dashboard...');
      carrierDashboard.stop();
      clientPanel.stop();
      await solaceClient.disconnect();
      process.exit(0);
    };

    process.on('SIGINT', () => void shutdown());
    process.on('SIGTERM', () => void shutdown());
  } catch (error) {
    console.error('[ERROR:WEB-SERVER] Fatal initialization error:', error);
    process.exit(1);
  }
}

void bootstrap();
