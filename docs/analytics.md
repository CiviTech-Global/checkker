# Analytics Events

The mobile app uses `trackEvent` from `apps/mobile/src/utils/analytics.ts`.
In development, events are printed to the console with the `[analytics]` prefix.

## Free-mode funnel

| Event | When it fires |
| --- | --- |
| `queue_joined` | The player successfully joins a free matchmaking queue. |
| `free_game_started` | A free multiplayer game starts. |
| `bot_game_started` | A bot game starts. |
| `puzzle_opened` | A puzzle is opened. |
| `puzzle_solved` | A puzzle is solved correctly. |