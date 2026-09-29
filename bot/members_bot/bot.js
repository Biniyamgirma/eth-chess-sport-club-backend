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
    [{ text: 'Play physical match' }],
    [{ text: 'Get ethchess tournaments' }],
    [{ text: 'View profile details' }],
    [{ text: 'Analyze physical match history' }],
    [{ text: 'Brilliant move' }],
  ],
  resize_keyboard: true,
  is_persistent: true,
};

const loginKeyboard = {
  inline_keyboard: [[
    { text: 'Ethchess ID & Password', callback_data: 'member_login:id' },
    { text: 'Phone Number & Password', callback_data: 'member_login:phone' },
  ]],
};

async function showLogin(chatId) {
  sessions.delete(String(chatId));
  await bot.sendMessage(chatId, 'Connect your ethchess account to the bot', {
    reply_markup: loginKeyboard,
  });
}

function inferIdentifierType(identifier) {
  if (/^09/.test(identifier)) return 'phone';
  if (/^(U|ETH)/i.test(identifier)) return 'id';
  return null;
}

async function callBackend(path, body) {
  const response = await fetch(`${apiUrl}/api/matches/bot${path}`, {
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

function startMatchKeyboard(matchId) {
  return {
    inline_keyboard: [[{ text: 'Start Match', callback_data: `match:start:${matchId}` }]],
  };
}

function endMatchKeyboard(matchId) {
  return {
    inline_keyboard: [[{ text: 'End Match', callback_data: `match:end:${matchId}` }]],
  };
}

async function showVenues(chatId) {
  const venues = await callBackend('/venues');
  if (!venues.length) {
    await bot.sendMessage(chatId, 'There are no active venues available right now.', {
      reply_markup: menuKeyboard,
    });
    return;
  }

  await bot.sendMessage(chatId, 'Choose a venue:', {
    reply_markup: {
      inline_keyboard: venues.map((venue) => [{
        text: venue.name || `Venue ${venue.id}`,
        callback_data: `match:venue:${venue.id}`,
      }]),
    },
  });
}

async function showVenueTables(chatId, venueId) {
  const tables = await callBackend(`/venues/${venueId}/tables`);
  if (!tables.length) {
    await bot.sendMessage(chatId, 'This venue has no active tables. Choose another venue.');
    return;
  }

  const joinableTables = tables.filter((table) => table.is_available);
  const occupiedTables = tables.filter((table) => !table.is_available);
  const rows = joinableTables.map((table) => [{
    text: table.name || `Table ${table.id}`,
    callback_data: `match:table:${table.id}`,
  }]);
  const tableSummary = occupiedTables.map((table) => `${table.name || `Table ${table.id}`} (match in progress)`);
  const message = [
    'Join the venue tables:',
    ...(tableSummary.length ? ['', `Unavailable: ${tableSummary.join(', ')}`] : []),
    ...(!joinableTables.length ? ['', 'No tables are available to join right now.'] : []),
  ].join('\n');

  await bot.sendMessage(chatId, message, {
    reply_markup: rows.length ? { inline_keyboard: rows } : undefined,
  });
}

async function joinTable(chatId, tableId) {
  const result = await callBackend(`/tables/${tableId}/join`, { chat_id: String(chatId) });
  if (result.state === 'waiting_for_opponent') {
    await bot.sendMessage(chatId, `${result.message} You can stay here while you wait.`, {
      reply_markup: menuKeyboard,
    });
    return;
  }

  const matchId = result.match.id;
  const prompt = `You are about to start a match against ${result.opponent_first_name}.`;
  await bot.sendMessage(chatId, prompt, { reply_markup: startMatchKeyboard(matchId) });

  if (result.notify_chat_id && String(result.notify_chat_id) !== String(chatId)) {
    await bot.sendMessage(
      result.notify_chat_id,
      `You are about to start a match against ${result.joining_player_first_name}.`,
      { reply_markup: startMatchKeyboard(matchId) },
    );
  }
}

async function startMatch(chatId, matchId) {
  const result = await callBackend(`/${matchId}/start`, { chat_id: String(chatId) });
  await bot.sendMessage(
    chatId,
    `Match started against ${result.opponent_first_name}.`,
    { reply_markup: endMatchKeyboard(matchId) },
  );
}

async function askWhoLost(chatId, matchId) {
  await bot.sendMessage(chatId, 'Who lost the match?', {
    reply_markup: {
      inline_keyboard: [[
        { text: 'I lost', callback_data: `match:loser:self:${matchId}` },
        { text: 'My opponent lost', callback_data: `match:loser:opponent:${matchId}` },
      ]],
    },
  });
}

async function selectLoser(chatId, matchId, loser) {
  const result = await callBackend(`/${matchId}/end`, {
    chat_id: String(chatId),
    loser,
  });
  if (result.state === 'match_ended') {
    await bot.sendMessage(chatId, `Match ended. Total minutes played: ${result.totalMinutes}.`, {
      reply_markup: menuKeyboard,
    });
    return;
  }

  await bot.sendMessage(chatId, result.message);
}

async function confirmOpponentLoss(query, matchId, confirmationToken) {
  const chatId = query.message.chat.id;
  const result = await callBackend(`/${matchId}/confirm-loser`, {
    chat_id: String(chatId),
    token: confirmationToken,
  });
  await bot.answerCallbackQuery(query.id, { text: 'Match result confirmed.' });
  await bot.sendMessage(
    chatId,
    `Thanks for confirming. The match is complete (${result.totalMinutes} minutes).`,
    { reply_markup: menuKeyboard },
  );
  await bot.editMessageReplyMarkup({ inline_keyboard: [] }, {
    chat_id: chatId,
    message_id: query.message.message_id,
  }).catch(() => undefined);
}

bot.onText(/^\/start(?:\s|$)/, (message) => {
  showLogin(message.chat.id).catch((error) => {
    console.error('Unable to start member login:', error.message);
  });
});

bot.onText(/^\/cancel(?:\s|$)/, async (message) => {
  sessions.delete(String(message.chat.id));
  await bot.sendMessage(message.chat.id, 'Login cancelled. Use /start to try again.');
});

bot.on('callback_query', async (query) => {
  const chatId = query.message?.chat.id;
  if (chatId === undefined || !query.data) return;

  if (query.data.startsWith('member_login:')) {
    const selectedMethod = query.data.slice('member_login:'.length);
    if (selectedMethod !== 'id' && selectedMethod !== 'phone') {
      await bot.answerCallbackQuery(query.id, { text: 'Please choose a login method.' });
      return;
    }

    sessions.set(String(chatId), { step: 'identifier', selectedMethod });
    await bot.answerCallbackQuery(query.id);
    await bot.sendMessage(
      chatId,
      selectedMethod === 'phone'
        ? 'Enter the phone number on your ethchess account.'
        : 'Enter your ethchess ID.',
    );
    return;
  }

  const venueMatch = query.data.match(/^match:venue:(\d+)$/);
  const tableMatch = query.data.match(/^match:table:(\d+)$/);
  const startMatchData = query.data.match(/^match:start:(\d+)$/);
  const endMatchData = query.data.match(/^match:end:(\d+)$/);
  const loserMatch = query.data.match(/^match:loser:(self|opponent):(\d+)$/);
  const confirmationMatch = query.data.match(/^match:loser:(\d+):([a-f0-9-]+)$/i);

  try {
    if (venueMatch) {
      await bot.answerCallbackQuery(query.id);
      await showVenueTables(chatId, Number(venueMatch[1]));
    } else if (tableMatch) {
      await bot.answerCallbackQuery(query.id);
      await joinTable(chatId, Number(tableMatch[1]));
    } else if (startMatchData) {
      await bot.answerCallbackQuery(query.id);
      await startMatch(chatId, Number(startMatchData[1]));
    } else if (endMatchData) {
      await bot.answerCallbackQuery(query.id);
      await askWhoLost(chatId, Number(endMatchData[1]));
    } else if (loserMatch) {
      await bot.answerCallbackQuery(query.id);
      await selectLoser(chatId, Number(loserMatch[2]), loserMatch[1]);
    } else if (confirmationMatch) {
      await confirmOpponentLoss(query, Number(confirmationMatch[1]), confirmationMatch[2]);
    }
  } catch (error) {
    console.error('Member match action failed:', error.message);
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
  if (!session) {
    const menuOptions = new Set([
      'Play physical match',
      'Get ethchess tournaments',
      'View profile details',
      'Analyze physical match history',
      'Brilliant move',
    ]);
    if (menuOptions.has(text)) {
      if (text === 'Play physical match') {
        try {
          await showVenues(chatId);
        } catch (error) {
          console.error('Unable to fetch venues:', error.message);
          await bot.sendMessage(chatId, error.message || 'Unable to load venues right now.');
        }
        return;
      }

      await bot.sendMessage(chatId, 'This option will be available in a later update.', {
        reply_markup: menuKeyboard,
      });
    }
    return;
  }

  if (session.step === 'identifier') {
    const identifierType = inferIdentifierType(text);
    if (!identifierType) {
      await bot.sendMessage(chatId, 'Use a phone number starting with 09, or an ethchess ID starting with U or ETH.');
      return;
    }

    sessions.set(chatKey, { ...session, step: 'password', identifier: text, identifierType });
    await bot.sendMessage(chatId, 'Enter your ethchess password.');
    return;
  }

  if (session.step === 'password') {
    try {
      await bot.deleteMessage(chatId, String(message.message_id)).catch(() => undefined);

      const response = await fetch(`${apiUrl}/api/auth/telegram/link`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          identifier: session.identifier,
          password: text,
          chatId: String(chatId),
          ...(message.from?.username ? { telegramUsername: message.from.username } : {}),
        }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || payload.success !== true) {
        const errorMessage = response.status === 401
          ? 'Those credentials were not accepted. Enter your password again, or use /cancel.'
          : payload.message ?? 'Unable to connect your account right now. Please try again.';
        await bot.sendMessage(chatId, errorMessage);
        return;
      }

      sessions.delete(chatKey);
      const memberName = payload.data?.member?.name;
      await bot.sendMessage(
        chatId,
        `Your ethchess account${memberName ? ` (${memberName})` : ''} is connected.`,
        { reply_markup: menuKeyboard },
      );
    } catch (error) {
      console.error('Member account linking failed:', error.message);
      await bot.sendMessage(chatId, 'Could not reach ethchess. Please try again or use /cancel.');
    }
  }
});

bot.on('polling_error', (error) => {
  console.error('Telegram polling error:', error.message);
});