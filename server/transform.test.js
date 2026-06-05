import { describe, expect, it } from 'vitest';
import { balloonToMessage, statusToMessage } from './transform.js';

describe('balloonToMessage', () => {
  it('S4: converts a soop-extension DonationResponse into the balloon JSON contract', () => {
    const donation = {
      receivedTime: '2026-06-05T11:00:00Z',
      to: 'streamer_id',
      from: 'bob_id',
      fromUsername: 'bob',
      amount: '250',
      fanClubOrdinal: '0',
    };
    expect(balloonToMessage(donation)).toEqual({ type: 'balloon', sender: 'bob', count: 250 });
  });

  it('S4: parses the string amount into an integer count', () => {
    expect(balloonToMessage({ fromUsername: 'a', amount: '100' }).count).toBe(100);
    expect(balloonToMessage({ fromUsername: 'a', amount: '1' }).count).toBe(1);
  });

  it('S4 edge: a non-numeric amount becomes count 0', () => {
    expect(balloonToMessage({ fromUsername: 'a', amount: 'notanumber' }).count).toBe(0);
    expect(balloonToMessage({ fromUsername: 'a', amount: undefined }).count).toBe(0);
  });

  it('S4 edge: missing fromUsername becomes an empty sender string', () => {
    expect(balloonToMessage({ amount: '100' }).sender).toBe('');
  });
});

describe('statusToMessage', () => {
  it('S4: builds a connected status message', () => {
    expect(statusToMessage('connected')).toEqual({ type: 'status', state: 'connected' });
  });

  it('S4: includes an optional message when provided', () => {
    expect(statusToMessage('error', 'boom')).toEqual({ type: 'status', state: 'error', message: 'boom' });
  });

  it('S4: omits the message field when not provided', () => {
    const msg = statusToMessage('disconnected');
    expect(msg).toEqual({ type: 'status', state: 'disconnected' });
    expect('message' in msg).toBe(false);
  });
});
