import type { SoopBalloonMessage, SoopConnectionState, SoopRelayMessage, SoopStatusMessage } from './types/soop.type';

/**
 * Browser-side client for the SOOP relay (see `server/relay.js`).
 *
 * Connects to the relay over a standard WebSocket, subscribes to a streamer, and
 * surfaces 별풍선(balloon) donations and connection-status changes via callbacks.
 *
 * This module intentionally does NOT import `soop-extension`; all SOOP-specific
 * protocol work happens in the Node relay. The browser only speaks the JSON contract.
 */
export class SoopRelayClient {
  private ws: WebSocket | null = null;
  private _state: SoopConnectionState = 'idle';

  private onBalloonHandler: ((msg: SoopBalloonMessage) => void) | null = null;
  private onStateHandler: ((state: SoopConnectionState, message?: string) => void) | null = null;

  /** Manual disconnect flag so close handlers don't report it as an error. */
  private intentionalClose = false;

  get state(): SoopConnectionState {
    return this._state;
  }

  onBalloon(handler: (msg: SoopBalloonMessage) => void): void {
    this.onBalloonHandler = handler;
  }

  onState(handler: (state: SoopConnectionState, message?: string) => void): void {
    this.onStateHandler = handler;
  }

  private setState(state: SoopConnectionState, message?: string): void {
    this._state = state;
    if (this.onStateHandler) {
      this.onStateHandler(state, message);
    }
  }

  /**
   * Connect to the relay at `relayUrl` and subscribe to `streamerId`.
   * Safe to call repeatedly; an existing connection is torn down first.
   */
  connect(relayUrl: string, streamerId: string): void {
    if (!relayUrl || !streamerId) {
      this.setState('error', 'Relay URL and streamer ID are required');
      return;
    }

    this.disconnect();
    this.intentionalClose = false;

    let socket: WebSocket;
    try {
      socket = new WebSocket(relayUrl);
    } catch (err) {
      this.setState('error', err instanceof Error ? err.message : 'Invalid relay URL');
      return;
    }
    this.ws = socket;

    socket.addEventListener('open', () => {
      socket.send(JSON.stringify({ type: 'subscribe', streamerId }));
    });

    socket.addEventListener('message', (event) => {
      this.handleMessage(event.data);
    });

    socket.addEventListener('error', () => {
      this.setState('error', 'Relay connection error');
    });

    socket.addEventListener('close', () => {
      if (this.ws === socket) {
        this.ws = null;
      }
      if (!this.intentionalClose && this._state !== 'error') {
        this.setState('disconnected');
      }
    });
  }

  disconnect(): void {
    if (this.ws) {
      this.intentionalClose = true;
      try {
        this.ws.close();
      } catch {
        // ignore close errors
      }
      this.ws = null;
    }
    if (this._state !== 'idle') {
      this.setState('idle');
    }
  }

  private handleMessage(raw: unknown): void {
    if (typeof raw !== 'string') return;
    let parsed: SoopRelayMessage;
    try {
      parsed = JSON.parse(raw) as SoopRelayMessage;
    } catch {
      return;
    }

    if (parsed.type === 'balloon') {
      if (this.onBalloonHandler) {
        this.onBalloonHandler(parsed);
      }
      return;
    }

    if (parsed.type === 'status') {
      this.applyStatus(parsed);
    }
  }

  private applyStatus(status: SoopStatusMessage): void {
    this.setState(status.state, status.message);
  }
}
