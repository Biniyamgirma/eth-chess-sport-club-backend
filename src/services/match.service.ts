import { randomUUID } from 'node:crypto';

import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';
import { AppError } from '../middlewares/errorHandler.js';

const orm = prisma.orm as any;

const getMember = async (memberId: string) => {
  const member = await orm.public.Member.where({ id: memberId }).first();
  if (!member || member.is_deleted === 1) {
    throw new AppError('Member not found or deleted', 404);
  }

  return member;
};

const getMemberByChatId = async (chatId: string) => {
  const member = await orm.public.Member.where({ chat_id: chatId }).first();
  if (!member || member.is_deleted === 1) {
    throw new AppError('Telegram account is not linked to an active member', 401);
  }

  return member;
};

const getVenue = async (venueId: number) => {
  const venue = await orm.public.Venue.where({ id: venueId }).first();
  if (!venue || venue.is_deleted === 1 || venue.status === 0) {
    throw new AppError('Venue not found or inactive', 404);
  }

  return venue;
};

const getTable = async (tableId: number) => {
  const table = await orm.public.VenueTable.where({ id: tableId }).first();
  if (!table || table.status !== 1) {
    throw new AppError('Venue table not found or inactive', 404);
  }

  if (!table.venue_id) {
    throw new AppError('Venue table is not assigned to a venue', 409);
  }

  const venue = await getVenue(Number(table.venue_id));
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

const ensureMemberCanJoin = async (memberId: string, allowedWaitingTableId?: number) => {
  const [whiteMatch, blackMatch, waitingTables] = await Promise.all([
    orm.public.MatchHistory.where({ white_player_id: memberId, game_end_at: null }).first(),
    orm.public.MatchHistory.where({ black_player_id: memberId, game_end_at: null }).first(),
    orm.public.VenueTable.where({ ideal_player: memberId }).all(),
  ]);

  if (whiteMatch || blackMatch) {
    throw new AppError('You are already in an active match', 409);
  }

  if (waitingTables.some((waitingTable: any) => Number(waitingTable.id) !== allowedWaitingTableId)) {
    throw new AppError('You are already waiting at another table', 409);
  }
};

export const matchService = {
  async getTelegramAccount(chatId: string) {
    const member = await orm.public.Member.where({ chat_id: chatId }).first();
    if (!member || member.is_deleted === 1) {
      return { linked: false };
    }

    return {
      linked: true,
      member: { id: member.id, name: memberName(member) },
    };
  },

  async listAvailableVenues() {
    return orm.public.Venue.where({ status: 1, is_deleted: 0 }).all();
  },

  async listAvailableTables(venueId: number) {
    await getVenue(venueId);
    const tables = await orm.public.VenueTable.where({ venue_id: venueId, status: 1 }).all();
    return Promise.all(tables.map(async (table: any) => {
      const activeMatch = await orm.public.MatchHistory.where({
        table_id: table.id,
        game_end_at: null,
      }).first();
      return { ...table, is_available: !activeMatch };
    }));
  },

  async joinTable(
    memberId: string,
    tableId: number,
    input: { pending_start?: boolean; color?: 'white' | 'black' },
  ) {
    const member = await getMember(memberId);
    const { table, venue } = await getTable(tableId);

    const activeMatch = await orm.public.MatchHistory.where({ table_id: table.id, game_end_at: null }).first();
    if (activeMatch) {
      throw new AppError('This table already has an active match', 409);
    }

    await ensureMemberCanJoin(memberId, table.ideal_player === memberId ? table.id : undefined);

    if (table.ideal_player && String(table.ideal_player) !== memberId) {
      const waitingMember = await getMember(String(table.ideal_player));
      await ensureMemberCanJoin(String(waitingMember.id), table.id);
      const now = Temporal.Now.instant();
      const pendingStart = input.pending_start === true;
      const joiningPlayerColor = input.color;
      const whitePlayer = joiningPlayerColor === 'black' ? waitingMember : member;
      const blackPlayer = joiningPlayerColor === 'black' ? member : waitingMember;
      const match = await orm.public.MatchHistory.create({
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

      await orm.public.VenueTable.where({ id: table.id }).update({
        ideal_player: null,
        updatedAt: now,
      });

      return {
        state: pendingStart ? 'match_pending_start' : 'match_started',
        message: pendingStart
          ? `You are about to start a match against ${memberFirstName(waitingMember)}.`
          : `${memberName(member)} started a match against ${memberName(waitingMember)}.`,
        match: await withPlayerDetails(match),
      };
    }

    if (String(table.ideal_player) === memberId) {
      return {
        state: 'waiting_for_opponent',
        message: `${memberName(member)} is waiting for an opponent.`,
        tableId: table.id,
      };
    }

    await orm.public.VenueTable.where({ id: table.id }).update({
      ideal_player: member.id,
      updatedAt: Temporal.Now.instant(),
    });

    return {
      state: 'waiting_for_opponent',
      message: `${memberName(member)} is waiting for an opponent.`,
      tableId: table.id,
    };
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
      updatedAt: now,
    });

    return {
      state: 'left_waiting_list',
      message: `${memberName(member)} left the waiting list.`,
      tableId: table.id,
    };
  },

  async joinTableForTelegram(chatId: string, tableId: number, color?: 'white' | 'black') {
    const member = await getMemberByChatId(chatId);
    const result = await matchService.joinTable(member.id, tableId, {
      pending_start: true,
      ...(color ? { color } : {}),
    });
    if (result.state !== 'match_pending_start' || !result.match) {
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

  async leaveWaitingTableForTelegram(chatId: string, tableId: number) {
    const member = await getMemberByChatId(chatId);
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

  async startMatchForTelegram(chatId: string, matchId: number) {
    const member = await getMemberByChatId(chatId);
    const result = await matchService.startMatch(String(member.id), matchId);
    const opponentId = String(result.match.white_player.id) === String(member.id)
      ? String(result.match.black_player.id)
      : String(result.match.white_player.id);
    const opponent = await getMember(opponentId);
    return { ...result, opponent_first_name: memberFirstName(opponent) };
  },

  async requestMatchEnd(memberId: string, matchId: number, loserId: string) {
    const member = await getMember(memberId);
    const match = await orm.public.MatchHistory.where({ id: matchId }).first();
    if (!match || !match.started_at || match.game_end_at) {
      throw new AppError('Active match not found', 404);
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

    const telegramSent = await sendTelegramLoserConfirmation(loser, match.id, token);
    if (!telegramSent) {
      await orm.public.MatchHistory.where({ id: match.id }).update({
        status: 'started',
        log_details: details,
        updatedAt: Temporal.Now.instant(),
      });
      throw new AppError('Could not send loser confirmation to the opponent', 503);
    }
    return {
      state: 'awaiting_loser_confirmation',
      message: `A loser confirmation request was sent to ${memberName(loser)}.`,
      telegramSent,
      match: await withPlayerDetails(updatedMatch),
    };
  },

  async requestMatchEndForTelegram(chatId: string, matchId: number, loserChoice: 'self' | 'opponent') {
    const member = await getMemberByChatId(chatId);
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

  async confirmLoserForTelegram(chatId: string, matchId: number, token: string) {
    const loser = await getMemberByChatId(chatId);
    return matchService.confirmLoser(String(loser.id), matchId, token);
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

const sendTelegramLoserConfirmation = async (member: any, matchId: number, token: string) => {
  if (!env.TELEGRAM_BOT_TOKEN || !member.chat_id) {
    return false;
  }

  const response = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
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

  return response.ok;
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
    updatedAt: endedAt,
  });

  return { winner, totalMinutes: elapsedMinutes, match: completedMatch };
};