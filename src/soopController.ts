import { SoopRelayClient } from './soopClient';
import { accumulateName, balloonToEntries } from './soopMapper';
import type { SoopBalloonMessage, SoopConnectionState } from './types/soop.type';

/**
 * Pure seam between an incoming balloon donation and the names list.
 *
 * Computes the new list by mapping `count` -> floor(count / perEntry) entries under
 * the donor's nickname and accumulating into `currentValue`. Only invokes `commit`
 * (and thus refreshes the game) when the donation actually grants >= 1 entry, so
 * below-threshold or invalid donations are no-ops.
 *
 * Returns the resulting list string (unchanged when no entries were granted).
 */
export function applyBalloon(
  currentValue: string,
  balloon: Pick<SoopBalloonMessage, 'sender' | 'count'>,
  perEntry: number,
  commit: (newValue: string) => void
): string {
  const entries = balloonToEntries(balloon.count, perEntry);
  if (entries <= 0) {
    return currentValue;
  }
  const newValue = accumulateName(currentValue, balloon.sender, entries);
  commit(newValue);
  return newValue;
}

export interface SoopControllerHooks {
  /** Read the current names-list text (e.g. the #in_names textarea value). */
  getNames: () => string;
  /** Apply a new names-list text and refresh the marbles. */
  setNames: (value: string) => void;
  /** Read the configured balloons-per-entry value. */
  getPerEntry: () => number;
  /** Optional: surface connection-state changes to the UI. */
  onState?: (state: SoopConnectionState, message?: string) => void;
}

/**
 * Glue object exposed on `window.soop`. Owns a {@link SoopRelayClient} and routes
 * balloon donations through {@link applyBalloon} into the host page's names list.
 */
export class SoopController {
  private client = new SoopRelayClient();

  constructor(private hooks: SoopControllerHooks) {
    this.client.onBalloon((msg) => {
      applyBalloon(this.hooks.getNames(), msg, this.hooks.getPerEntry(), (newValue) => {
        this.hooks.setNames(newValue);
      });
    });
    this.client.onState((state, message) => {
      this.hooks.onState?.(state, message);
    });
  }

  get state(): SoopConnectionState {
    return this.client.state;
  }

  connect(relayUrl: string, streamerId: string): void {
    this.client.connect(relayUrl, streamerId);
  }

  disconnect(): void {
    this.client.disconnect();
  }
}
