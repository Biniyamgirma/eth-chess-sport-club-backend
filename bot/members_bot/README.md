# ethchess Members Bot

Standalone Telegram bot for linking a member account and showing the members menu.

## Run

1. Copy `.env.example` to `.env` and set `TELEGRAM_BOT_TOKEN`.
2. Set `ETHCHESS_API_URL` to the backend origin (without `/api`).
3. Set `TELEGRAM_BOT_API_SECRET` to the same random secret configured on the backend.
4. Run `npm install`, then `npm start` from this folder.

The backend must be running with `TELEGRAM_BOT_API_SECRET` set and expose `POST /api/auth/telegram/link` plus the protected `/api/matches/bot/*` routes. The bot uses Telegram long polling and does not store member passwords; it attempts to delete each password message after receiving it.

## Account linking

Members choose an ID or phone login button, then enter their identifier and password. Identifiers beginning with `09` are treated as phone numbers; identifiers beginning with `U` or `ETH` (case-insensitive) are treated as ethchess IDs. The backend verifies the credentials and updates the member's `chat_id`.

The bot supports venue selection, table joining, match start/end, and loser confirmation. The remaining menu items are added in later tasks.