# Checkker API Reference

The Checkker server exposes a small REST surface for health/admin and a
Socket.IO namespace for all real-time game operations.

## Base URL

```
http(s)://<host>:3001
```

The port is configurable via the `PORT` environment variable or `--port` CLI
flag. Default is `3001`.

## REST Endpoints

### `GET /health`

Liveness / readiness probe.

**Response:**

```json
{
  "status": "ok",
  "service": "checkker",
  "version": 1
}
```

### `POST /admin/seed-puzzles`

Idempotently seeds the puzzle database. Requires an admin API key when one is
configured.

**Headers:**

```
X-Admin-Api-Key: <ADMIN_API_KEY>
```

If `ADMIN_API_KEY` is not set, the endpoint is restricted to loopback
connections (`127.0.0.1` / `::1`) for development safety.

**Response:**

```json
{
  "success": true,
  "created": 42
}
```

## Socket.IO Events

All game, lobby, social, and puzzle features are accessed through Socket.IO.

### Connection

```ts
import { io } from "socket.io-client";
const socket = io("http://localhost:3001");
```

CORS origin is controlled by the `CORS_ORIGIN` environment variable. Defaults
to `*` in development.

### Authentication

| Event | Direction | Description |
|-------|-----------|-------------|
| `auth_request` | client → server | Begin wallet authentication handshake. |
| `auth_verify` | client → server | Verify a signed message. |
| `auth_token` | client → server | Authenticate using an existing JWT. |
| `guest_identify` | client → server | Create or resume a guest identity. |
| `auth_logout` | client → server | Invalidate the current session. |
| `auth_success` | server → client | Profile + token payload after successful auth. |

### Matchmaking & Games

| Event | Direction | Description |
|-------|-----------|-------------|
| `join_queue` / `join_casual` / `join_ranked` | client → server | Enter matchmaking queues. |
| `find_match` | client → server | Quick-find a casual opponent. |
| `start_bot_game` / `request_bot` | client → server | Start a game against an adaptive bot. |
| `host_lan_game` / `join_lan_game` / `cancel_lan_host` | client → server | Host or join a LAN match. |
| `play_move` | client → server | Play a card-driven move: `{ gameId, card, move }`. |
| `resign` | client → server | Resign the current game. |
| `rematch_request` | client → server | Request a rematch after game over. |
| `chat_message` | client → server | Send an in-game message. |
| `game_update` | server → client | Full game state broadcast. |
| `game_over` | server → client | Final result + scores. |

### Social

| Event | Direction | Description |
|-------|-----------|-------------|
| `get_friends` | client → server | List accepted friends. |
| `send_friend_request` | client → server | Send a friend request by username. |
| `respond_friend_request` | client → server | Accept or decline a request. |
| `invite_friend` / `respond_invite` | client → server | Private match invitations. |
| `get_notifications` / `mark_notifications_read` | client ↔ server | Notification inbox. |

### Puzzles & Progression

| Event | Direction | Description |
|-------|-----------|-------------|
| `get_daily_puzzle` | client → server | Today's featured puzzle. |
| `get_puzzles` | client → server | List puzzles by category. |
| `submit_puzzle` | client → server | Submit a puzzle solution attempt. |
| `get_player_dashboard` | client → server | Stats, rating, and recent activity. |
| `get_leaderboard` | client → server | Global rankings. |
| `get_cosmetics` / `purchase_cosmetic` / `equip_cosmetic` | client → server | Cosmetic shop operations. |

### Bot & Coaching

| Event | Direction | Description |
|-------|-----------|-------------|
| `update_bot_config` / `get_bot_data` | client → server | Online delegate bot settings. |
| `request_coaching_tip` | client → server | Context-aware move hint. |
| `explain_move` | client → server | Natural-language explanation of a move. |

## Rate Limits

HTTP endpoints are rate-limited to **100 requests per 15 minutes** per IP.
Admin endpoints are limited to **5 requests per 15 minutes**.

## Error Handling

Socket.IO failures generally emit the same event name with an `{ error: string }`
payload. REST errors return JSON `{ status: "error", message: string }` with an
appropriate HTTP status code.
