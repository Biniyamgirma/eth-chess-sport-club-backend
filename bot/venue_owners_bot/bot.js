import 'dotenv/config';
import TelegramBot from 'node-telegram-bot-api';

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  throw new Error('TELEGRAM_BOT_TOKEN is required');
}

const botApiSecret = process.env.TELEGRAM_BOT_API_SECRET;
if (!botApiSecret) {
  throw new Error('TELEGRAM_BOT_API_SECRET is required');
}

const apiUrl = (process.env.ETHCHESS_API_URL ?? 'http://localhost:4000').replace(/\/$/, '');
const bot = new TelegramBot(token, { polling: true });
const sessions = new Map();

const menuKeyboard = {
  keyboard: [
    [{ text: 'Add venue table' }, { text: 'Cancel a match' }],
    [{ text: 'Start match' }, { text: 'View active matches' }],
  ],
  resize_keyboard: true,
  is_persistent: true,
};

const loginKeyboard = {
  inline_keyboard: [[{ text: 'Login', callback_data: 'owner:login' }]],
};

function identifierIsSupported(identifier) {
  return /^09/.test(identifier) || /^(U|ETH)/i.test(identifier);
}

async function callBackend(path, body) {
  const response = await fetch(`${apiUrl}/api/venue-owner-bot${path}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      'x-ethchess-bot-secret': botApiSecret,
      ...(body ? { 'content-type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.success !== true) {
    throw new Error(payload.message ?? 'The ethchess service is unavailable.');
  }
  return payload.data;
}

async function getOwnerVenues(chatId) {
  return callBackend(`/venues?chat_id=${encodeURIComponent(String(chatId))}`);
}

async function getVenueTables(chatId, venueId) {
  return callBackend(`/venues/${venueId}/tables?chat_id=${encodeURIComponent(String(chatId))}`);
}

async function showLogin(chatId) {
  sessions.delete(String(chatId));
  await bot.sendMessage(chatId, 'Login to your ethchess venue owner account.', {
    reply_markup: loginKeyboard,
  });
}

async function showMenu(chatId, text = 'Venue owner menu') {
  await bot.sendMessage(chatId, text, { reply_markup: menuKeyboard });
}

async function beginVenueAction(chatId, action) {
  const venues = await getOwnerVenues(chatId);
  if (!venues.length) {
    await showMenu(chatId, 'No active venues are assigned to your account.');
    return;
  }

  if (venues.length === 1) {
    await runVenueAction(chatId, action, venues[0].id);
    return;
  }

  await bot.sendMessage(chatId, 'Choose a venue:', {
    reply_markup: {
      inline_keyboard: venues.map((venue) => [{
        text: venue.name || `Venue ${venue.id}`,
        callback_data: `owner:venue:${action}:${venue.id}`,
      }]),
    },
  });
}

async function runVenueAction(chatId, action, venueId) {
  if (action === 'table') {
    sessions.set(String(chatId), { step: 'table_name', venueId });
    await bot.sendMessage(chatId, 'Send a name for the new table, or use /cancel.');
    return;
  }

  if (action === 'start') {
    const tables = await getVenueTables(chatId, venueId);
    const availableTables = tables.filter((table) => table.is_available);
    if (!availableTables.length) {
      await bot.sendMessage(chatId, 'There are no available active tables at this venue.');
      return;
    }

    await bot.sendMessage(chatId, 'Choose a table for the match:', {
      reply_markup: {
        inline_keyboard: availableTables.map((table) => [{
          text: table.name || `Table ${table.id}`,
          callback_data: `owner:table:${venueId}:${table.id}`,
        }]),
      },
    });
    return;
  }

  if (action === 'active' || action === 'cancel') {
    const matches = await callBackend(
      `/venues/${venueId}/matches?chat_id=${encodeURIComponent(String(chatId))}`,
    );
    if (!matches.length) {
      await bot.sendMessage(chatId, 'There are no active matches at this venue.');
      return;
    }

    if (action === 'active') {
      const rows = matches.map((match) =>
        `${match.white_player_name} VS ${match.black_player_name} : ${match.table_name}${match.status === 'pending_start' ? ' (waiting to start)' : ''}`,
      );
      await bot.sendMessage(chatId, rows.join('\n'), { reply_markup: menuKeyboard });
      return;
    }

    await bot.sendMessage(chatId, 'Choose the match to cancel:', {
      reply_markup: {
        inline_keyboard: matches.map((match) => [{
          text: `Cancel: ${match.white_player_name} VS ${match.black_player_name} : ${match.table_name}`,
          callback_data: `owner:cancel:${match.id}`,
        }]),
      },
    });
  }
}

async function beginManualMatch(chatId, venueId, tableId) {
  sessions.set(String(chatId), { step: 'player_one', venueId, tableId });
  await bot.sendMessage(
    chatId,
    'Enter player 1 phone number (starting with 09) or ethchess ID (starting with U or ETH). Use /cancel to stop.',
  );
}

async function createManualMatch(chatId, session, playerTwo) {
  const match = await callBackend(`/venues/${session.venueId}/matches/manual`, {
    chat_id: String(chatId),
    table_id: session.tableId,
    player_one: session.playerOne,
    player_two: playerTwo,
  });
  sessions.delete(String(chatId));
  await showMenu(
    chatId,
    `Match started: ${match.white_player_name} VS ${match.black_player_name} : ${match.table_name}`,
  );
}

bot.onText(/^\/start(?:\s|$)/, (message) => {
  showLogin(message.chat.id).catch((error) => {
    console.error('Unable to show venue owner login:', error.message);
  });
});

bot.onText(/^\/cancel(?:\s|$)/, async (message) => {
  sessions.delete(String(message.chat.id));
  await showMenu(message.chat.id, 'Action cancelled.');
});

bot.on('callback_query', async (query) => {
  const chatId = query.message?.chat.id;
  if (chatId === undefined || !query.data) return;

  try {
    if (query.data === 'owner:login') {
      sessions.set(String(chatId), { step: 'login_phone' });
      await bot.answerCallbackQuery(query.id);
      await bot.sendMessage(chatId, 'Enter the phone number on your venue owner account.');
      return;
    }

    const venueChoice = query.data.match(/^owner:venue:(table|cancel|start|active):(\d+)$/);
    const tableChoice = query.data.match(/^owner:table:(\d+):(\d+)$/);
    const cancelChoice = query.data.match(/^owner:cancel:(\d+)$/);
    const cancelConfirm = query.data.match(/^owner:cancel-confirm:(\d+)$/);

    if (venueChoice) {
      await bot.answerCallbackQuery(query.id);
      await runVenueAction(chatId, venueChoice[1], Number(venueChoice[2]));
      return;
    }

    if (tableChoice) {
      await bot.answerCallbackQuery(query.id);
      await beginManualMatch(chatId, Number(tableChoice[1]), Number(tableChoice[2]));
      return;
    }

    if (cancelChoice) {
      const matchId = Number(cancelChoice[1]);
      await bot.answerCallbackQuery(query.id);
      await bot.sendMessage(chatId, 'Cancel this match?', {
        reply_markup: {
          inline_keyboard: [[
            { text: 'Confirm cancellation', callback_data: `owner:cancel-confirm:${matchId}` },
          ]],
        },
      });
      return;
    }

    if (cancelConfirm) {
      const result = await callBackend(`/matches/${cancelConfirm[1]}/cancel`, {
        chat_id: String(chatId),
      });
      await bot.answerCallbackQuery(query.id, { text: 'Match cancelled.' });
      await showMenu(chatId, `Match ${result.id} was cancelled.`);
    }
  } catch (error) {
    console.error('Venue owner action failed:', error.message);
    await bot.answerCallbackQuery(query.id, {
      text: error.message || 'Unable to complete that action.',
      show_alert: true,
    }).catch(() => undefined);
    await bot.sendMessage(chatId, error.message || 'Unable to complete that action.');
  }
});

bot.on('message', async (message) => {
  const chatId = message.chat.id;
  const chatKey = String(chatId);
  const text = message.text?.trim();
  if (!text || text.startsWith('/')) return;

  const session = sessions.get(chatKey);
  if (session) {
    try {
      if (session.step === 'login_phone') {
        sessions.set(chatKey, { step: 'login_password', phone: text });
        await bot.sendMessage(chatId, 'Enter your venue owner password.');
        return;
      }

      if (session.step === 'login_password') {
        await bot.deleteMessage(chatId, String(message.message_id)).catch(() => undefined);
        const response = await fetch(`${apiUrl}/api/auth/telegram/vendor-link`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            phone: session.phone,
            password: text,
            chatId: String(chatId),
            ...(message.from?.username ? { telegramUsername: message.from.username } : {}),
          }),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || payload.success !== true) {
          await bot.sendMessage(chatId, payload.message ?? 'Login failed. Enter your password again, or use /cancel.');
          return;
        }

        sessions.delete(chatKey);
        const ownerName = payload.data?.vendor?.name;
        await showMenu(chatId, `Venue owner account${ownerName ? ` (${ownerName})` : ''} connected.`);
        return;
      }

      if (session.step === 'table_name') {
        const table = await callBackend(`/venues/${session.venueId}/tables`, {
          chat_id: chatKey,
          name: text,
        });
        sessions.delete(chatKey);
        await showMenu(chatId, `Added ${table.name || `Table ${table.id}`}.`);
        return;
      }

      if (session.step === 'player_one') {
        if (!identifierIsSupported(text)) {
          await bot.sendMessage(chatId, 'Use a phone number starting with 09 or an ethchess ID starting with U or ETH.');
          return;
        }
        sessions.set(chatKey, { ...session, step: 'player_two', playerOne: text });
        await bot.sendMessage(chatId, 'Enter player 2 phone number or ethchess ID.');
        return;
      }

      if (session.step === 'player_two') {
        if (!identifierIsSupported(text)) {
          await bot.sendMessage(chatId, 'Use a phone number starting with 09 or an ethchess ID starting with U or ETH.');
          return;
        }
        await createManualMatch(chatId, session, text);
        return;
      }
    } catch (error) {
      console.error('Venue owner workflow failed:', error.message);
      await bot.sendMessage(chatId, error.message || 'Unable to complete that action.');
      return;
    }
  }

  if (text === 'Add venue table') {
    await beginVenueAction(chatId, 'table');
  } else if (text === 'Cancel a match') {
    await beginVenueAction(chatId, 'cancel');
  } else if (text === 'Start match') {
    await beginVenueAction(chatId, 'start');
  } else if (text === 'View active matches') {
    await beginVenueAction(chatId, 'active');
  }
});

bot.on('polling_error', (error) => {
  console.error('Venue owners bot polling error:', error.message);
});