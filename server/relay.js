/**
 * SOOP (AfreecaTV) chat relay for Marble Roulette.
 *
 * Browser-direct connection to SOOP chat is impossible (no CORS headers + a
 * non-standard binary protocol), so this small Node process connects to SOOP using
 * the `soop-extension` library and forwards 별풍선(star balloon) donation events to
 * the browser over a standard WebSocket as JSON.
 *
 * Protocol (browser <-> relay):
 *   browser -> relay : { type: 'subscribe', streamerId: string }
 *   relay -> browser : { type: 'balloon', sender: string, count: number }
 *                      { type: 'status', state: 'connected'|'disconnected'|'error', message?: string }
 *
 * Run: PORT=8787 node relay.js   (or `npm start` inside server/)
 */

import { SoopChatEvent, SoopClient } from 'soop-extension';
import { WebSocketServer } from 'ws';
import { balloonToMessage, statusToMessage } from './transform.js';

const PORT = Number(process.env.PORT) || 8787;

const wss = new WebSocketServer({ port: PORT });

console.log(`[relay] SOOP relay listening on ws://localhost:${PORT}`);

wss.on('connection', (ws) => {
  console.log('[relay] browser connected');

  /** @type {import('soop-extension').SoopChat | null} */
  let chat = null;

  const send = (message) => {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(message));
    }
  };

  const teardownChat = async () => {
    if (!chat) return;
    const current = chat;
    chat = null;
    try {
      await current.disconnect();
    } catch (err) {
      console.warn('[relay] error during disconnect:', err && err.message);
    }
  };

  const subscribe = async (streamerId) => {
    await teardownChat();

    const client = new SoopClient();
    chat = client.chat({ streamerId });

    chat.on(SoopChatEvent.AD_BALLOON_DONATION, (donation) => {
      const message = balloonToMessage(donation);
      console.log(`[relay] balloon: ${message.sender} x${message.count}`);
      send(message);
    });

    chat.on(SoopChatEvent.CONNECT, () => {
      send(statusToMessage('connected'));
    });

    chat.on(SoopChatEvent.DISCONNECT, () => {
      send(statusToMessage('disconnected'));
    });

    try {
      await chat.connect();
      console.log(`[relay] subscribed to streamer "${streamerId}"`);
    } catch (err) {
      const reason = (err && err.message) || 'failed to connect to SOOP';
      console.error('[relay] connect failed:', reason);
      send(statusToMessage('error', reason));
      await teardownChat();
    }
  };

  ws.on('message', (raw) => {
    let data;
    try {
      data = JSON.parse(raw.toString());
    } catch {
      send(statusToMessage('error', 'invalid JSON message'));
      return;
    }

    if (data && data.type === 'subscribe') {
      if (typeof data.streamerId !== 'string' || data.streamerId.trim() === '') {
        send(statusToMessage('error', 'subscribe requires a non-empty streamerId'));
        return;
      }
      subscribe(data.streamerId.trim()).catch((err) => {
        send(statusToMessage('error', (err && err.message) || 'subscribe failed'));
      });
    }
  });

  ws.on('close', () => {
    console.log('[relay] browser disconnected');
    teardownChat();
  });

  ws.on('error', (err) => {
    console.warn('[relay] socket error:', err && err.message);
    teardownChat();
  });
});

const shutdown = () => {
  console.log('[relay] shutting down');
  wss.close(() => process.exit(0));
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
