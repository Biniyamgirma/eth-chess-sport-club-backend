import { randomInt, randomUUID } from 'node:crypto';

import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';
import { AppError } from '../middlewares/errorHandler.js';

const orm = prisma.orm as any;

const getMember = async (memberId: string, database = orm) => {
  const member = await database.public.Member.where({ id: memberId }).first();
  if (!member || member.is_deleted === 1) {
    throw new AppError('Member not found or deleted', 404);
  }

  return member;
};

const getVenue = async (venueId: number, database = orm) => {
  const venue = await database.public.Venue.where({ id: venueId }).first();
  if (!venue || venue.is_deleted === 1 || venue.status === 0) {
    throw new AppError('Venue not found or inactive', 404);
  }

  return venue;
};

const getTable = async (tableId: number, database = orm) => {
  const table = await database.public.VenueTable.where({ id: tableId }).first();
  if (!table || table.status !== 1) {
    throw new AppError('Venue table not found or inactive', 404);
  }

  if (!table.venue_id) {
    throw new AppError('Venue table is not assigned to a venue', 409);
  }

  const venue = await getVenue(Number(table.venue_id), database);
  return { table, venue };
};

const memberName = (member: any) =>
  [member.f_name, member.l_name].filter(Boolean).join(' ') || member.phone || member.id;

const memberFirstName = (member: any) => member.f_name || memberName(member);

const withPlayerDetails = async (match: any) => {
  const [white, black] = await Promise.all([
    match.white_player_id ? getMember(String(match.white_player_id)) : null,
    match.black_player_id ? getMember(String(match.black_player_id)) : null,
  ]);

  return {
    ...match,
    white_player: white ? { id: white.id, name: memberName(white) } : null,
    black_player: black ? { id: black.id, name: memberName(black) } : null,
  };
};

const ensureMemberCanJoin = async (
  memberId: string,
  allowedWaitingTableId?: number,
  database = orm,
) => {
  const [whiteMatch, blackMatch, waitingTables] = await Promise.all([
    database.public.MatchHistory.where({ white_player_id: memberId, game_end_at: null }).first(),
    database.public.MatchHistory.where({ black_player_id: memberId, game_end_at: null }).first(),
    database.public.VenueTable.where({ ideal_player: memberId }).all(),
  ]);

  if (whiteMatch || blackMatch) {
    throw new AppError('You are already in an active match', 409);
  }

  if (waitingTables.some((waitingTable: any) => Number(waitingTable.id) !== allowedWaitingTableId)) {
    throw new AppError('You are already waiting at another table', 409);
  }
};

export const matchService = {
  async listAvailableVenues() {
    return orm.public.Venue.where({ status: 1, is_deleted: 0 }).all();
  },

  async listAvailableTables(venueId: number, includeIdealPlayerName = false) {
    await getVenue(venueId);
    const tables = await orm.public.VenueTable.where({ venue_id: venueId, status: 1 }).all();
    return Promise.all(tables.map(async (table: any) => {
      const activeMatch = await orm.public.MatchHistory.where({
        table_id: table.id,
        game_end_at: null,
      }).first();
      const idealPlayer = includeIdealPlayerName && table.ideal_player
        ? await getMember(String(table.ideal_player)).catch((error: unknown) => {
            if (error instanceof AppError && error.statusCode === 404) {
              return null;
            }
            throw error;
          })
        : null;
      return {
        ...table,
        ideal_player_name: idealPlayer ? memberName(idealPlayer) : null,
        is_available: !activeMatch,
      };
    }));
  },

async getMemberByChatId(chatId: string) {
  const member = await orm.public.Member.where({ chat_id: String(chatId) }).first();

  if (!member || member.is_deleted === 1) {
    return null;
  }

  return member;
},

  async listCurrentMatchesForTelegram(memberId: string) {
    const member = await getMember(memberId);
    const [whiteMatches, blackMatches] = await Promise.all([
      orm.public.MatchHistory.where({ white_player_id: member.id, game_end_at: null }).all(),
      orm.public.MatchHistory.where({ black_player_id: member.id, game_end_at: null }).all(),
    ]);
    const matches = [...new Map(
      [...whiteMatches, ...blackMatches]
        .filter((match: any) =>
          match.started_at &&
          (match.status === 'started' || match.status === 'awaiting_loser_confirmation'),
        )
        .map((match: any) => [String(match.id), match]),
    ).values()].sort((left: any, right: any) => Number(left.id) - Number(right.id));

    return Promise.all(matches.map(withPlayerDetails));
  },

  async joinTable(
    memberId: string,
    tableId: number,
    input: {
      pending_start?: boolean;
      color?: 'white' | 'black' | null;
      use_ideal_player_color_preference?: boolean;
    },
  ) {
    const result = await prisma.transaction(async (tx: any) => {
      const transactionOrm = tx.orm as any;
      const member = await getMember(memberId, transactionOrm);
      const { table, venue } = await getTable(tableId, transactionOrm);

      const activeMatch = await transactionOrm.public.MatchHistory.where({
        table_id: table.id,
        game_end_at: null,
      }).first();
      if (activeMatch) {
        throw new AppError('This table already has an active match', 409);
      }

      await ensureMemberCanJoin(
        memberId,
        String(table.ideal_player) === memberId ? table.id : undefined,
        transactionOrm,
      );

      if (table.ideal_player && String(table.ideal_player) !== memberId) {
        const waitingMember = await getMember(String(table.ideal_player), transactionOrm);
        await ensureMemberCanJoin(String(waitingMember.id), table.id, transactionOrm);
        const now = Temporal.Now.instant();
        let waitingPlayerIsWhite: boolean;
        if (input.use_ideal_player_color_preference) {
          waitingPlayerIsWhite = table.ideal_player_color === 'white' ||
            (table.ideal_player_color !== 'black' && randomInt(2) === 0);
        } else {
          waitingPlayerIsWhite = input.color === 'black';
        }
        const whitePlayer = waitingPlayerIsWhite ? waitingMember : member;
        const blackPlayer = whitePlayer.id === member.id ? waitingMember : member;
        const pendingStart = input.pending_start === true;

        const claimedTable = await transactionOrm.public.VenueTable.where({
          id: table.id,
          ideal_player: waitingMember.id,
        }).update({ ideal_player: null, ideal_player_color: null, updatedAt: now });
        if (!claimedTable) {
          throw new AppError('This table is no longer available', 409);
        }

        const match = await transactionOrm.public.MatchHistory.create({
          user_id: null,
          started_at: pendingStart ? null : now,
          game_end_at: null,
          time_in_min: null,
          price_per_min: venue.price_per_min ?? 0,
          white_player_id: whitePlayer.id,
          black_player_id: blackPlayer.id,
          winner_id: null,
          venue_id: venue.id,
          is_loser_approved: 0,
          table_id: table.id,
          pricing_method: venue.pricing_method ?? null,
          status: pendingStart ? 'pending_start' : 'started',
          commission_percent: venue.commission,
          commission_amount: null,
          cancellation_reason: null,
          venue_fee: null,
          chat_id: null,
          is_club_paid: 0,
          log_details: null,
          createdAt: now,
          updatedAt: now,
        });

        return {
          state: pendingStart ? 'match_pending_start' : 'match_started',
          message: pendingStart
            ? `You are about to start a match against ${memberFirstName(waitingMember)}.`
            : `${memberName(member)} started a match against ${memberName(waitingMember)}.`,
          match,
        };
      }

      if (String(table.ideal_player) === memberId) {
        if (input.use_ideal_player_color_preference && Object.hasOwn(input, 'color')) {
          await transactionOrm.public.VenueTable.where({
            id: table.id,
            ideal_player: member.id,
          }).update({
            ideal_player_color: input.color ?? null,
            updatedAt: Temporal.Now.instant(),
          });
        }
        return {
          state: 'waiting_for_opponent',
          message: `${memberName(member)} is waiting for an opponent.`,
          tableId: table.id,
        };
      }

      const claimedTable = await transactionOrm.public.VenueTable.where({
        id: table.id,
        ideal_player: null,
      }).update({
        ideal_player: member.id,
        ideal_player_color: input.use_ideal_player_color_preference
          ? input.color ?? null
          : null,
        updatedAt: Temporal.Now.instant(),
      });
      if (!claimedTable) {
        throw new AppError('This table is no longer available', 409);
      }

      return {
        state: 'waiting_for_opponent',
        message: `${memberName(member)} is waiting for an opponent.`,
        tableId: table.id,
      };
    });

    return result.match ? { ...result, match: await withPlayerDetails(result.match) } : result;
  },

  async leaveWaitingTable(memberId: string, tableId: number) {
    const member = await getMember(memberId);
    const table = await orm.public.VenueTable.where({ id: tableId }).first();
    if (!table) {
      throw new AppError('Venue table not found', 404);
    }
    if (String(table.ideal_player) !== String(member.id)) {
      throw new AppError('You are not waiting at this table', 409);
    }

    const now = Temporal.Now.instant();
    await orm.public.VenueTable.where({ id: table.id, ideal_player: member.id }).update({
      ideal_player: null,
      ideal_player_color: null,
      updatedAt: now,
    });

    return {
      state: 'left_waiting_list',
      message: `${memberName(member)} left the waiting list.`,
      tableId: table.id,
    };
  },

  async joinTableForTelegram(
    memberId: string,
    tableId: number,
    color?: 'white' | 'black' | null,
  ) {
    const member = await getMember(memberId);
    const result = await matchService.joinTable(member.id, tableId, {
      use_ideal_player_color_preference: true,
      ...(color !== undefined ? { color } : {}),
    });
    if (result.state !== 'match_started' || !result.match) {
      return result;
    }

    const opponentId = String(result.match.white_player.id) === String(member.id)
      ? String(result.match.black_player.id)
      : String(result.match.white_player.id);
    const opponent = await getMember(opponentId);
    return {
      ...result,
      joining_player_first_name: memberFirstName(member),
      opponent_first_name: memberFirstName(opponent),
      notify_chat_id: opponent.chat_id,
    };
  },

  async leaveWaitingTableForTelegram(memberId: string, tableId: number) {
    const member = await getMember(memberId);
    return matchService.leaveWaitingTable(String(member.id), tableId);
  },

  async startMatch(memberId: string, matchId: number) {
    const member = await getMember(memberId);
    const match = await orm.public.MatchHistory.where({ id: matchId }).first();
    if (!match || match.game_end_at || !match.white_player_id || !match.black_player_id) {
      throw new AppError('Pending match not found', 404);
    }

    if (match.white_player_id !== member.id && match.black_player_id !== member.id) {
      throw new AppError('Only a match participant can start this match', 403);
    }

    if (match.started_at && match.status === 'started') {
      return { state: 'match_started', match: await withPlayerDetails(match) };
    }

    if (match.status !== 'pending_start' || match.started_at) {
      throw new AppError('This match is not waiting to start', 409);
    }

    const startedAt = Temporal.Now.instant();
    const startedMatch = await orm.public.MatchHistory.where({ id: match.id }).update({
      started_at: startedAt,
      status: 'started',
      updatedAt: startedAt,
    });
    return { state: 'match_started', match: await withPlayerDetails(startedMatch) };
  },

  async startMatchForTelegram(memberId: string, matchId: number) {
    const member = await getMember(memberId);
    const result = await matchService.startMatch(String(member.id), matchId);
    const opponentId = String(result.match.white_player.id) === String(member.id)
      ? String(result.match.black_player.id)
      : String(result.match.white_player.id);
    const opponent = await getMember(opponentId);
    return { ...result, opponent_first_name: memberFirstName(opponent) };
  },

  async requestMatchEnd(memberId: string, matchId: number, loserId: string) {
    const member = await getMember(memberId);
    console.log(`Requesting match end for matchId: ${matchId}, loserId: ${loserId}, requested by memberId: ${memberId}`);
    const match = await orm.public.MatchHistory.where({ id: matchId }).first();
    console.log(`Match found: ${match ? 'Yes' : 'No'}`);
    console.log(`Match details: ${match ? JSON.stringify(match) : 'N/A'}`);
    if (!match || !match.started_at || match.game_end_at) {
      throw new AppError('Active match not found', 404);
    }
    if (match.status === 'awaiting_loser_confirmation') {
      throw new AppError('This match is already waiting for loser confirmation', 409);
    }

    const isParticipant = match.white_player_id === member.id || match.black_player_id === member.id;
    if (!isParticipant ||
        (loserId !== match.white_player_id && loserId !== match.black_player_id)) {
      throw new AppError('The selected loser must be a match participant', 403);
    }

    if (loserId === member.id) {
      const completed = await finalizeMatch(match, member);
      return {
        state: 'match_ended',
        message: `Match ended. You played ${completed.totalMinutes} minutes.`,
        ...completed,
      };
    }

    const loser = await getMember(loserId);
    const token = randomUUID();
    const details = typeof match.log_details === 'object' && match.log_details !== null
      ? match.log_details
      : {};
    const updatedMatch = await orm.public.MatchHistory.where({ id: match.id }).update({
      status: 'awaiting_loser_confirmation',
      is_loser_approved: 0,
      log_details: {
        ...details,
        pending_loser_id: loser.id,
        loser_confirmation_token: token,
        end_requested_by: member.id,
      },
      updatedAt: Temporal.Now.instant(),
    });

    const telegramDelivery = await sendTelegramLoserConfirmation(loser, match.id, token);
    if (!telegramDelivery.sent) {
      await orm.public.MatchHistory.where({ id: match.id }).update({
        status: 'started',
        log_details: details,
        updatedAt: Temporal.Now.instant(),
      });
      throw new AppError(telegramDelivery.message, telegramDelivery.statusCode);
    }
    return {
      state: 'awaiting_loser_confirmation',
      message: `A loser confirmation request was sent to ${memberName(loser)}.`,
      telegramSent: telegramDelivery.sent,
      match: await withPlayerDetails(updatedMatch),
    };
  },

  async requestMatchEndForTelegram(memberId: string, matchId: number, loserChoice: 'self' | 'opponent') {
    const member = await getMember(memberId);
    const match = await orm.public.MatchHistory.where({ id: matchId }).first();
    if (!match || !match.white_player_id || !match.black_player_id) {
      throw new AppError('Match not found', 404);
    }
    const loserId = loserChoice === 'self'
      ? String(member.id)
      : String(match.white_player_id) === String(member.id)
        ? String(match.black_player_id)
        : String(match.white_player_id);
    return matchService.requestMatchEnd(String(member.id), matchId, loserId);
  },

  async confirmLoser(loserId: string, matchId: number, token?: string) {
    const loser = await getMember(loserId);
    const match = await orm.public.MatchHistory.where({ id: matchId }).first();
    if (!match || !match.started_at || match.game_end_at) {
      throw new AppError('Active match not found', 404);
    }

    const details = typeof match.log_details === 'object' && match.log_details !== null
      ? match.log_details as Record<string, any>
      : {};
    if (details.pending_loser_id !== loser.id ||
        (token && details.loser_confirmation_token !== token)) {
      throw new AppError('Invalid loser confirmation', 403);
    }

    const completed = await finalizeMatch(match, loser);

    return {
      message: `${memberName(loser)} confirmed they are the loser. ${memberName(completed.winner)} is waiting for the next opponent.`,
      loser: { id: loser.id, name: memberName(loser) },
      winner: { id: completed.winner.id, name: memberName(completed.winner) },
      totalMinutes: completed.totalMinutes,
      match: completed.match,
    };
  },

  async confirmLoserForTelegram(memberId: string, matchId: number, token: string) {
    const loser = await getMember(memberId);
    return matchService.confirmLoser(String(loser.id), matchId, token);
  },

  async unlinkTelegramAccount(memberId: string, phone: string) {
    return orm.public.Member.where({ id: memberId, phone }).update({
      chat_id: null,
    });
  },

  async handleTelegramCallback(matchId: number, token: string, chatId: string) {
    const match = await orm.public.MatchHistory.where({ id: matchId }).first();
    if (!match) {
      throw new AppError('Match not found', 404);
    }

    const loser = await orm.public.Member.where({ chat_id: chatId }).first();
    if (!loser) {
      throw new AppError('Telegram account is not linked', 401);
    }

    return this.confirmLoser(String(loser.id), matchId, token);
  },
};

const sendTelegramLoserConfirmation = async (
  member: any,
  matchId: number,
  token: string,
): Promise<{ sent: true } | { sent: false; message: string; statusCode: number }> => {
  if (!env.TELEGRAM_BOT_TOKEN) {
    console.log('Telegram bot token is not configured on the API server');
    console.log(`Current TELEGRAM_BOT_TOKEN: ${env.TELEGRAM_BOT_TOKEN}`);
    
    return {
      sent: false,
      message: 'Telegram bot token is not configured on the API server',
      statusCode: 503,
    };
  }

  if (!member.chat_id) {
    return {
      sent: false,
      message: 'The opponent has not linked a Telegram account. Ask them to start and link the EthChess bot first.',
      statusCode: 409,
    };
  }

  let response: Response;
  try {
    response = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: member.chat_id,
        text: 'Please confirm that you Lost a match by clicking the button below. If you did not lose, please ignore this message.',
        reply_markup: {
          inline_keyboard: [[{
            text: 'Confirm I am the loser',
            callback_data: `match:loser:${matchId}:${token}`,
          }]],
        },
      }),
    });
  } catch (error) {
    const cause = error instanceof Error ? error.name : 'UnknownError';
    return {
      sent: false,
      message: `Could not reach the Telegram API (${cause})`,
      statusCode: 503,
    };
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return {
      sent: false,
      message: `Telegram returned an unreadable response (HTTP ${response.status})`,
      statusCode: 503,
    };
  }

  if (typeof payload !== 'object' || payload === null) {
    return {
      sent: false,
      message: `Telegram returned an unreadable response (HTTP ${response.status})`,
      statusCode: 503,
    };
  }

  const telegramResponse = payload as { ok?: unknown; description?: unknown };
  const description = typeof telegramResponse.description === 'string'
    ? `: ${telegramResponse.description}`
    : '';
  if (!response.ok || telegramResponse.ok !== true) {
    return {
      sent: false,
      message: `Telegram could not deliver the confirmation (HTTP ${response.status}${description})`,
      statusCode: response.status >= 400 && response.status < 500 ? 409 : 503,
    };
  }

  return { sent: true };
};

const finalizeMatch = async (match: any, loser: any) => {
  const winnerId = String(match.white_player_id) === String(loser.id)
    ? match.black_player_id
    : match.white_player_id;
  if (!winnerId) {
    throw new AppError('Match opponent not found', 409);
  }

  const winner = await getMember(String(winnerId));
  const venue = await getVenue(Number(match.venue_id));
  const endedAt = Temporal.Now.instant();
  const elapsedMinutes = Math.max(
  1,
  Math.ceil(endedAt.since(match.started_at).total({ unit: "minutes" })),
);
  const pricePerMinute = Number(match.price_per_min ?? venue.price_per_min ?? 0);
  const venueFee = elapsedMinutes * pricePerMinute;
  const commissionPercent = Number(match.commission_percent ?? venue.commission ?? 0);
  const commissionAmount = Math.floor((venueFee * commissionPercent) / 100);

  const completedMatch = await orm.public.MatchHistory.where({ id: match.id }).update({
    user_id: loser.id,
    winner_id: winner.id,
    game_end_at: endedAt,
    time_in_min: elapsedMinutes,
    price_per_min: pricePerMinute,
    venue_fee: venueFee,
    commission_percent: commissionPercent,
    commission_amount: commissionAmount,
    is_loser_approved: 1,
    status: 'completed',
    updatedAt: endedAt,
  });

  await orm.public.VenueTable.where({ id: match.table_id }).update({
    ideal_player: winner.id,
    ideal_player_color: null,
    updatedAt: endedAt,
  });

  return { winner, totalMinutes: elapsedMinutes, match: completedMatch };
};