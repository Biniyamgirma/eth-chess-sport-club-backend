# ethchess Venue Owners Bot

Standalone Telegram bot for venue owners to manage tables and physical matches.

## Run

1. Copy `.env.example` to `.env` and set this bot's `TELEGRAM_BOT_TOKEN`.
2. Set `ETHCHESS_API_URL` to the backend origin (without `/api`).
3. Set `TELEGRAM_BOT_API_SECRET` to the same random secret configured on the backend and members bot.
4. Run `npm install`, then `npm start` from this folder.

The backend must have `TELEGRAM_BOT_API_SECRET` configured and expose `POST /api/auth/telegram/vendor-link` and the protected `/api/venue-owner-bot/*` routes. The owner bot links by phone and password, then scopes all table and match actions to venues assigned through `Venue.vendor_id`.

Venue owners can add a table, view and cancel active matches, or manually start a match by choosing an active table and entering two member IDs or phone numbers. Phone numbers must start with `09`; member IDs must start with `U` or `ETH`.