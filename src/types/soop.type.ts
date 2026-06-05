/**
 * JSON message contract between the SOOP relay (Node) and the browser app.
 * Mirrors `server/transform.js`.
 */

export interface SoopBalloonMessage {
  type: 'balloon';
  /** Donor nickname. */
  sender: string;
  /** Raw balloon amount donated (integer). */
  count: number;
}

export type SoopStatusState = 'connected' | 'disconnected' | 'error';

export interface SoopStatusMessage {
  type: 'status';
  state: SoopStatusState;
  message?: string;
}

export type SoopRelayMessage = SoopBalloonMessage | SoopStatusMessage;

/** Browser -> relay subscribe request. */
export interface SoopSubscribeMessage {
  type: 'subscribe';
  streamerId: string;
}

/** Local connection state surfaced to the UI (adds the pre-connect 'idle' state). */
export type SoopConnectionState = 'idle' | SoopStatusState;
