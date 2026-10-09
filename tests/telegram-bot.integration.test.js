import assert from 'node:assert/strict';
import { randomInt } from 'node:crypto';
import test from 'node:test';
import 'dotenv/config';

const apiUrl = (process.env.ETHCHESS_TEST_API_URL ?? 'http://localhost:4000').replace(/\/$/, '');
const botSecret = process.env.TELEGRAM_BOT_API_SECRET;
const identifier = process.env.TELEGRAM_TEST_MEMBER_IDENTIFIER;
const password = process.env.TELEGRAM_TEST_MEMBER_PASSWORD;

test(
  'Telegram link associates the chat ID and account lookup distinguishes unknown chats',
  {
    skip: !botSecret || !identifier || !password
      ? 'Set TELEGRAM_BOT_API_SECRET, TELEGRAM_TEST_MEMBER_IDENTIFIER, and TELEGRAM_TEST_MEMBER_PASSWORD'
      : false,
  },
  async () => {
    const chatId = String(BigInt(Date.now()) * 1000n + BigInt(randomInt(1000)));
    const unknownChatId = `${chatId}1`;
    const botHeaders = {
      'content-type': 'application/json',
      'x-ethchess-bot-secret': botSecret,
    };

    try {
      const linkResponse = await fetch(`${apiUrl}/api/auth/telegram/link`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ identifier, password, chatId }),
      });
      const linkPayload = await linkResponse.json();
      assert.equal(linkResponse.status, 200);
      assert.equal(linkPayload.success, true);

      const linkedResponse = await fetch(`${apiUrl}/api/matches/bot/account`, {
        method: 'POST',
        headers: botHeaders,
        body: JSON.stringify({ chat_id: chatId }),
      });
      const linkedPayload = await linkedResponse.json();
      assert.equal(linkedResponse.status, 200);
      assert.equal(linkedPayload.success, true);
      assert.equal(linkedPayload.data.linked, true);
      assert.equal(typeof linkedPayload.data.member.id, 'string');
      assert.equal(typeof linkedPayload.data.member.name, 'string');

      const unknownResponse = await fetch(`${apiUrl}/api/matches/bot/account`, {
        method: 'POST',
        headers: botHeaders,
        body: JSON.stringify({ chat_id: unknownChatId }),
      });
      const unknownPayload = await unknownResponse.json();
      assert.equal(unknownResponse.status, 200);
      assert.equal(unknownPayload.success, true);
      assert.deepEqual(unknownPayload.data, { linked: false });

      const unlinkedVenuesResponse = await fetch(`${apiUrl}/api/matches/bot/venues`, {
        method: 'POST',
        headers: botHeaders,
        body: JSON.stringify({ chat_id: unknownChatId }),
      });
      assert.equal(unlinkedVenuesResponse.status, 401);

      const invalidSecretResponse = await fetch(`${apiUrl}/api/matches/bot/account`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-ethchess-bot-secret': 'invalid-secret',
        },
        body: JSON.stringify({ chat_id: chatId }),
      });
      assert.equal(invalidSecretResponse.status, 401);
    } finally {
      await fetch(`${apiUrl}/api/matches/bot/unlink`, {
        method: 'POST',
        headers: botHeaders,
        body: JSON.stringify({ chat_id: chatId }),
      });
    }
  },
);
