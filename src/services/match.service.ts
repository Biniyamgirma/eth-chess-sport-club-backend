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

export const matchService = {
  async listAvailableVenues() {
    return orm.public.Venue.where({ status: 1, is_deleted: 0 }).all();
  },

  async listAvailableTables(venueId: number) {
    await getVenue(venueId);
    return orm.public.VenueTable.where({ venue_id: venueId, status: 1 }).all();
  },

  async joinTable(memberId: string, tableId: number, input: Record<string, any>) {
    const member = await getMember(memberId);
    const { table, venue } = await getTable(tableId);

    const activeMatch = await orm.public.MatchHistory.where({ table_id: table.id, game_end_at: null }).first();
    if (activeMatch) {
      throw new AppError('This table already has an active match', 409);
    }

    if (table.ideal_player && String(table.ideal_player) !== memberId) {
      const waitingMember = await getMember(String(table.ideal_player));
      const now = new Date();
      const match = await orm.public.MatchHistory.create({
        user_id: null,
        started_at: now,
        game_end_at: null,
        time_in_min: null,
        price_per_min: venue.price_per_min ?? 0,
        white_player_id: waitingMember.id,
        black_player_id: member.id,
        winner_id: null,
        venue_id: venue.id,
        is_loser_approved: 0,
        table_id: table.id,
        pricing_method: input.pricing_method ?? venue.pricing_method ?? null,
        status: input.status ?? 'started',
        commission_percent: venue.commission,
        commission_amount: null,
        cancellation_reason: null,
        venue_fee: null,
        chat_id: input.chat_id ?? null,
        is_club_paid: 0,
        log_details: input.log_details ?? null,
        createdAt: now,
        updatedAt: now,
      });

      await orm.public.VenueTable.where({ id: table.id }).update({
        ideal_player: null,
        updatedAt: now,
      });

      return {
        state: 'match_started',
        message: `${memberName(waitingMember)} is about to start a match against ${memberName(member)}.`,
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
      updatedAt: new Date(),
    });

    return {
      state: 'waiting_for_opponent',
      message: `${memberName(member)} is waiting for an opponent.`,
      tableId: table.id,
    };
  },

  async requestMatchEnd(memberId: string, matchId: number, loserId: string) {
    const member = await getMember(memberId);
    const match = await orm.public.MatchHistory.where({ id: matchId }).first();
    if (!match || !match.started_at || match.game_end_at) {
      throw new AppError('Active match not found', 404);
    }

    const isParticipant = match.white_player_id === member.id || match.black_player_id === member.id;
    if (!isParticipant || loserId === member.id ||
        (loserId !== match.white_player_id && loserId !== match.black_player_id)) {
      throw new AppError('The winner must be a participant and select the other player as loser', 403);
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
      updatedAt: new Date(),
    });

    const telegramSent = await sendTelegramLoserConfirmation(loser, match.id, token);
    return {
      state: 'awaiting_loser_confirmation',
      message: `A loser confirmation request was sent to ${memberName(loser)}.`,
      telegramSent,
      match: await withPlayerDetails(updatedMatch),
    };
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

    const winnerId = match.white_player_id === loser.id ? match.black_player_id : match.white_player_id;
    const winner = await getMember(String(winnerId));
    const venue = await getVenue(Number(match.venue_id));
    const endedAt = new Date();
    const elapsedMinutes = Math.max(
      1,
      Math.ceil((endedAt.getTime() - new Date(match.started_at).getTime()) / 60000),
    );
    const pricePerMinute = Number(match.price_per_min ?? venue.price_per_min ?? 0);
    const venueFee = elapsedMinutes * pricePerMinute;
    const commissionPercent = Number(match.commission_percent ?? venue.commission ?? 0);
    const commissionAmount = Math.floor((venueFee * commissionPercent) / 100);

    const completedMatch = await orm.public.MatchHistory.where({ id: match.id }).update({
      user_id: loser.id,
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

    return {
      message: `${memberName(loser)} confirmed they are the loser. ${memberName(winner)} is waiting for the next opponent.`,
      loser: { id: loser.id, name: memberName(loser) },
      winner: { id: winner.id, name: memberName(winner) },
      match: completedMatch,
    };
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
      text: 'Please confirm that you are the loser of this match.',
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