# SOOP Integration / SOOP 연동

Connect a **SOOP** (formerly AfreecaTV / 아프리카TV) live chat to Marble Roulette so that
**별풍선 (star balloon) donations automatically add entries** to the draw.

SOOP 라이브 채팅을 마블 룰렛에 연결하여 **별풍선 후원이 자동으로 참가자를 추가**하도록 하는 기능입니다.

---

## How it works / 동작 방식

```
┌──────────────────────────┐        ┌──────────────────────────────┐        ┌─────────────────────┐
│  SOOP live chat servers  │  ───>  │  Relay (Node, server/)       │  ───>  │  Browser app        │
│  (binary chat protocol)  │        │  soop-extension + ws         │  JSON  │  (settings + game)  │
└──────────────────────────┘        └──────────────────────────────┘   WS   └─────────────────────┘
                                       parses 별풍선 events                    maps balloons -> entries
```

The browser **cannot** talk to SOOP chat directly:

- SOOP chat WebSocket servers send no CORS headers, so the browser blocks the handshake.
- SOOP chat uses a non-standard binary framing protocol a raw browser `WebSocket` cannot speak.

브라우저는 SOOP 채팅에 **직접 연결할 수 없습니다** (CORS 헤더 부재 + 비표준 바이너리 프로토콜).
그래서 작은 **릴레이 서버**(`server/`)가 SOOP에 접속해 별풍선 이벤트를 JSON으로 변환하여
브라우저로 전달합니다.

---

## Quick start / 빠른 시작

### 1. Run the relay / 릴레이 실행

```shell
cd server
npm install
PORT=8787 npm start      # defaults to 8787
```

The relay connects to SOOP **anonymously** (read-only) — no SOOP login is required.
릴레이는 SOOP에 **익명(읽기 전용)** 으로 접속하므로 로그인이 필요 없습니다.

### 2. Configure the app / 앱 설정

Open the roulette page, click the **gear button (⚙)** in the bottom controls to open
**Detail settings → SOOP integration**, then set:

룰렛 화면 하단의 **톱니바퀴 버튼(⚙)** 을 눌러 **상세 설정 → SOOP 연동** 을 열고 입력합니다:

| Field / 항목 | Meaning / 의미 | Example |
|---|---|---|
| **Relay URL / 릴레이 주소** | The relay WebSocket address | `ws://localhost:8787` |
| **Streamer ID / 스트리머 ID** | The SOOP streamer whose chat to watch | `your_streamer_id` |
| **Balloons per entry / 입력 당 별풍선 개수** | How many balloons grant one entry (`N`) | `100` |

Click **Connect / 연결**. The status dot turns green when connected.
**연결** 버튼을 누르면 연결 시 상태 표시등이 초록색으로 바뀝니다.

---

## Donation rule / 후원 규칙

For a donation of `A` balloons from a viewer, the app adds:

후원 `A`개의 별풍선에 대해 다음만큼 참가자가 추가됩니다:

```
entries = floor(A / N)        // N = "balloons per entry" / 입력 당 별풍선 개수
```

- The entry is added under the **donor's nickname**. / 참가자는 **후원자 닉네임**으로 추가됩니다.
- If the donor already has entries, their count **accumulates** (`bob*2` → `bob*3`).
  이미 참가 중인 후원자는 인원이 **누적**됩니다.
- Donations below the threshold (`A < N`) add **nothing**. / 기준 미만(`A < N`) 후원은 추가되지 않습니다.

### Examples / 예시 (N = 100)

| Donation / 후원 | Entries added / 추가 인원 | Names list change / 명단 변화 |
|---|---|---|
| `bob` gives 300 | 3 | `…` → `…,bob*3` |
| `bob` (already `bob*1`) gives 200 | 2 | `bob*1` → `bob*3` |
| `carol` gives 50 | 0 | unchanged / 변화 없음 |

> **Nickname safety / 닉네임 안전 처리**: donor nicknames are attacker-controlled, so the
> reserved characters `,` `*` `/` and newlines are stripped from the nickname before it
> enters the names list. This prevents a crafted nickname from splitting into extra
> marbles or injecting a weight. / 후원자 닉네임에서 예약 문자(`,` `*` `/` 줄바꿈)를 제거하여
> 명단이 깨지거나 가중치가 주입되는 것을 방지합니다.

---

## Relay protocol / 릴레이 프로토콜

JSON over a standard WebSocket. / 표준 WebSocket 위의 JSON.

**Browser → relay (subscribe):**

```json
{ "type": "subscribe", "streamerId": "the_streamer_id" }
```

**Relay → browser:**

```json
{ "type": "balloon", "sender": "donorNickname", "count": 250 }
{ "type": "status", "state": "connected" }
{ "type": "status", "state": "disconnected" }
{ "type": "status", "state": "error", "message": "reason" }
```

`count` is the raw balloon amount (integer); the browser applies the `floor(A / N)` rule
locally. / `count`는 원본 별풍선 개수이며, `floor(A / N)` 규칙은 브라우저에서 적용됩니다.

---

## Code map / 코드 구성

### Browser / 브라우저 (`src/`)

| File | Responsibility |
|---|---|
| `src/soopMapper.ts` | Pure logic: `balloonToEntries(amount, N)` and `accumulateName(list, sender, entries)` (incl. nickname sanitization). |
| `src/soopClient.ts` | `SoopRelayClient` — standard WebSocket client for the relay; parses the JSON contract, tracks connection state. Does **not** import `soop-extension`. |
| `src/soopController.ts` | `applyBalloon()` pure seam + `SoopController` — bridges relay events to the names list. Exposed as `window.SoopController`. |
| `src/types/soop.type.ts` | Relay ↔ browser message types. |
| `index.html` (`initSoop()`) | Settings dialog wiring: localStorage persistence, connect/disconnect, status indicator, names-list refresh. |
| `assets/style.scss` | `#soopSettings` modal styles, `.icon.gear`, status dot. |
| `src/data/languages.ts` | EN/KO translations for the new UI strings. |

### Relay / 릴레이 (`server/`)

| File | Responsibility |
|---|---|
| `server/relay.js` | WebSocket server; connects to SOOP via `soop-extension`, forwards 별풍선 events as JSON, handles status/errors and per-connection cleanup. |
| `server/transform.js` | Pure transforms: `balloonToMessage(donation)`, `statusToMessage(state, message?)`. |
| `server/README.md` | Relay run instructions. |

---

## Tests / 테스트

```shell
yarn test        # browser mapper/controller + relay transform (Vitest)
```

Covered scenarios / 검증 시나리오:

- Balloon → entries mapping, including below-threshold (0 entries) and invalid `N`.
- Repeat-donor accumulation (`bob*1` + 2 → `bob*3`).
- Nickname sanitization (`,` `*` `/` newline stripped; reserved-only nickname adds nothing).
- Relay `DonationResponse` → `{ type: "balloon", sender, count }` (string `amount` → integer).
- Relay status message shaping.

---

## Notes / 참고

- The relay is a **separate Node process** and is intentionally **not** bundled into the
  static browser app, so `soop-extension` never ships to the client.
  릴레이는 **별도 Node 프로세스**이며 정적 브라우저 번들에 포함되지 않습니다.
- If no relay URL is configured, the feature is simply inactive and the rest of the app
  works unchanged. / 릴레이 주소를 설정하지 않으면 기능이 비활성화될 뿐 나머지 앱은 그대로 동작합니다.
- The relay connects read-only; for a real connection the target streamer must be **live**.
  릴레이는 읽기 전용으로 접속하며, 실제 연결을 위해서는 대상 스트리머가 **방송 중**이어야 합니다.
