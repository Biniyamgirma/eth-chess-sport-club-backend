# eth-chess-sport-club-backend

## Brilliant Move voting

Brilliant Move weeks run Monday 00:00 through the following Monday 00:00 in
`BRILLIANT_MOVE_TIME_ZONE` (defaults to `Africa/Addis_Ababa`). The weekly
winners endpoint finalizes completed weeks on demand and stores each result;
later votes do not alter a stored winner. Ties are resolved by total votes,
then admin votes, then earliest submission.

Existing vote rows remain in place. The legacy numeric `admin_vote` submission
field is retained for compatibility; community vote totals are calculated from
`vote` rows, with admin votes identified through `admin_id`.

To roll out the voting and winner tables, apply the generated migration from
the backend root after reviewing it:

```powershell
.\node_modules\.bin\prisma.cmd db migrate
```

Run the focused unit and vote-endpoint integration tests with
`npm run test:brilliant-move`.
