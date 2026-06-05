/**
 * Pure transforms from soop-extension events into the relay <-> browser JSON contract.
 *
 * Kept free of socket/SOOP-client concerns so it can be unit-tested in isolation.
 *
 * Contract (relay -> browser):
 *   balloon: { type: 'balloon', sender: string, count: number }
 *   status:  { type: 'status', state: 'connected'|'disconnected'|'error', message?: string }
 */

/**
 * Convert a soop-extension DonationResponse (AD_BALLOON_DONATION) into a balloon message.
 * `amount` arrives as a string from soop-extension and is parsed to an integer; any
 * non-numeric value yields count 0. A missing sender becomes an empty string.
 *
 * @param {{ fromUsername?: string, amount?: string }} donation
 * @returns {{ type: 'balloon', sender: string, count: number }}
 */
export function balloonToMessage(donation) {
  const parsed = parseInt(donation && donation.amount, 10);
  const count = Number.isNaN(parsed) || parsed < 0 ? 0 : parsed;
  const sender = (donation && donation.fromUsername) || '';
  return { type: 'balloon', sender, count };
}

/**
 * Build a status message for the browser. The optional `message` field is omitted
 * entirely when not supplied.
 *
 * @param {'connected'|'disconnected'|'error'} state
 * @param {string} [message]
 * @returns {{ type: 'status', state: string, message?: string }}
 */
export function statusToMessage(state, message) {
  const msg = { type: 'status', state };
  if (message !== undefined) {
    msg.message = message;
  }
  return msg;
}
