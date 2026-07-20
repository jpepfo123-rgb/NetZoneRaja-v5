/**
 * Lightweight in-memory SSE (Server-Sent Events) bus.
 *
 * Usage:
 *   - Dashboard connects to GET /api/dashboard/events → SSE stream
 *   - Any API route calls broadcastEvent(type, data) to push real-time updates
 *
 * Events emitted:
 *   - "call"     → new call record created (triggers dashboard refresh)
 *   - "customer" → customer updated
 *   - "ping"     → heartbeat every 30 s to keep connection alive
 */

import type { Response } from 'express';

interface SseClient {
  res: Response;
  /** Role/agentId info if we ever want to filter events per user */
  agentId?: string;
  role?: string;
}

const clients = new Set<SseClient>();

/** Register a new SSE client. Automatically removes on close. */
export function addSseClient(res: Response, agentId?: string, role?: string) {
  const client: SseClient = { res, agentId, role };
  clients.add(client);
  res.on('close', () => clients.delete(client));
  return client;
}

/** Broadcast an event to all connected SSE clients. */
export function broadcastEvent(event: string, data: unknown) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of clients) {
    try {
      client.res.write(payload);
    } catch {
      clients.delete(client);
    }
  }
}

/** Number of currently connected dashboard clients. */
export function connectedClients(): number {
  return clients.size;
}
