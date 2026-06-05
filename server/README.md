# SOOP Relay

A small Node.js WebSocket relay that connects to **SOOP** (formerly AfreecaTV / 아프리카TV) live chat and forwards **별풍선 (star balloon) donation** events to the Marble Roulette browser app.

## Why a relay is required

The browser **cannot** connect to SOOP chat directly:

- SOOP's chat WebSocket servers send no CORS headers, so the browser blocks the handshake.
- SOOP chat uses a non-standard binary framing protocol that a raw browser `WebSocket` cannot speak.

This relay uses the [`soop-extension`](https://www.npmjs.com/package/soop-extension) library (Node only) to do the SOOP-side work, then exposes a plain JSON-over-WebSocket interface the browser can consume.

## Run

```shell
cd server
npm install
PORT=8787 npm start     # defaults to 8787 if PORT is unset
```

The relay listens on `ws://localhost:8787` by default.

## Protocol

Browser → relay:

```json
{ "type": "subscribe", "streamerId": "the_streamer_id" }
```

Relay → browser:

```json
{ "type": "balloon", "sender": "donorNickname", "count": 250 }
{ "type": "status", "state": "connected" }
{ "type": "status", "state": "disconnected" }
{ "type": "status", "state": "error", "message": "reason" }
```

- `count` is the raw balloon amount (an integer). The browser app applies the
  "N balloons = 1 entry" rule locally using its configurable *balloons per entry* value.
- The relay connects to SOOP **anonymously** (read-only); no SOOP login is required.

## Configure the browser app

In the roulette page, open **Settings → SOOP** (gear button) and set:

- **Relay URL** — e.g. `ws://localhost:8787`
- **Streamer ID** — the SOOP streamer whose chat you want to watch
- **Balloons per entry** — how many balloons grant one roulette entry (default `100`)

Then enable the connection. Donations of `amount` balloons add `floor(amount / N)` entries
under the donor's nickname, accumulating into the names list live.
