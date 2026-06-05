/**
 * Pure mapping logic for turning SOOP 별풍선(star balloon) donations into roulette entries.
 *
 * Kept free of DOM/network concerns so it can be unit-tested and reused by both the
 * inline index.html wiring and the browser SOOP client.
 */

/**
 * Convert a donated balloon `amount` into the number of roulette entries it grants,
 * using the "N balloons = 1 entry" rule. Returns 0 for any non-positive amount or
 * invalid (<= 0) perEntry, and never throws.
 */
export function balloonToEntries(amount: number, perEntry: number): number {
  if (!Number.isFinite(amount) || !Number.isFinite(perEntry)) return 0;
  if (amount <= 0 || perEntry <= 0) return 0;
  return Math.floor(amount / perEntry);
}

type ParsedName = {
  /** Bare name without weight/count suffixes. */
  name: string;
  /** Weight suffix value (the number after `/`), or null when absent. */
  weight: number | null;
  /** Count suffix value (the number after `*`), defaulting to 1 when absent. */
  count: number;
};

function parseEntry(raw: string): ParsedName {
  const trimmed = raw.trim();
  const weightMatch = /\/(\d+)/.exec(trimmed);
  const countMatch = /\*(\d+)/.exec(trimmed);
  const nameMatch = /^\s*([^/*]+)?/.exec(trimmed);
  const name = (nameMatch?.[1] ?? '').trim();
  const weight = weightMatch ? parseInt(weightMatch[1], 10) : null;
  const count = countMatch ? parseInt(countMatch[1], 10) : 1;
  return { name, weight, count };
}

function formatEntry(entry: ParsedName): string {
  const weightPart = entry.weight !== null ? `/${entry.weight}` : '';
  const countPart = entry.count > 1 ? `*${entry.count}` : '';
  return `${entry.name}${weightPart}${countPart}`;
}

/**
 * Remove characters reserved by the names-list grammar from a donor-supplied nickname.
 *
 * A SOOP nickname is attacker-controlled and is injected into a comma-separated list
 * that also uses `*` (count) and `/` (weight) as suffix separators. Without stripping
 * these, a nickname like `a,b` would split into two marbles and `a/9` would inject a
 * weight. Newlines are stripped because the list is also newline-delimited.
 */
export function sanitizeSender(sender: string): string {
  return sender.replace(/[,*/\r\n]/g, '').trim();
}

/**
 * Add `entries` marbles for `sender` into the comma/newline-separated `currentValue`
 * list. If the sender already appears, their count is accumulated (donor*2 -> donor*3);
 * otherwise a new entry is appended. A count of 0 (or fewer) leaves the list unchanged.
 *
 * The donor nickname is sanitized of reserved characters (`,` `*` `/` newlines) so a
 * crafted nickname cannot corrupt the list or inject extra marbles/weights. If nothing
 * remains after sanitizing, no entry is added.
 *
 * The returned list is normalized to a comma-separated string with trimmed names.
 */
export function accumulateName(currentValue: string, sender: string, entries: number): string {
  const existing = currentValue
    .split(/[,\r\n]/g)
    .map((v) => v.trim())
    .filter((v) => v.length > 0)
    .map(parseEntry);

  const safeSender = sanitizeSender(sender);

  if (entries <= 0 || safeSender.length === 0) {
    return existing.map(formatEntry).join(',');
  }

  const target = existing.find((e) => e.name === safeSender);
  if (target) {
    target.count += entries;
  } else {
    existing.push({ name: safeSender, weight: null, count: entries });
  }

  return existing.map(formatEntry).join(',');
}
