import dotenv from 'dotenv';

dotenv.config();

export const SOLACE_CONFIG = {
  url: process.env.SOLACE_HOST || '',
  vpnName: process.env.SOLACE_VPN_NAME || '',
  userName: process.env.SOLACE_USERNAME || '',
  password: process.env.SOLACE_PASSWORD || ''
};

export const TOPICS = {
  ORDERS: 'dispatch/orders/newcron',
  RESULTS: 'dispatch/results/newcron'
} as const;

export const QUEUES = {
  ORDERS: 'dispatch.orders.queue',
  RESULTS: 'dispatch.results.queue'
} as const;
