import { prisma } from '../config/prisma.js';
import { AppError } from '../middlewares/errorHandler.js';
import { venueTableService } from './venue-table.service.js';

const orm = prisma.orm as any;

const getVendorByChatId = async (chatId: string) => {
  const vendor = await orm.public.Vendor.where({ chat_id: chatId }).first();
  if (!vendor) {
    throw new AppError('Telegram account is not linked to a venue owner', 401);
  }
  return vendor;
};

const getOwnedVenue = async (vendorId: number, venueId: number) => {
  const venue = await orm.public.Venue.where({ id: venueId }).first();
  if (!venue || venue.is_deleted === 1 || Number(venue.vendor_id) !== Number(vendorId)) {
    throw new AppError('Venue not found or not owned by this account', 404);
  }
  return venue;
};

const getMemberByIdentifier = async (identifier: string) => {
  let member;
  if (/^09/.test(identifier)) {
    member = await orm.public.Member.where({ phone: identifier }).first();
  } else if (/^(U|ETH)/i.test(identifier)) {
    member = await orm.public.Member.where({ id: identifier }).first();
  } else {
    throw new AppError('Player identifiers must start with 09, U, or ETH', 400);
  }

  if (!member || member.is_deleted === 1) {
    throw new AppError(`Player ${identifier} was not found or is inactive`, 404);
  }
  return member;
};

const memberFirstName = (member: any) => member.f_name || member.phone || member.id;

const getActivePlayerIds = async () => {
  const matches = await orm.public.MatchHistory.where({ game_end_at: null }).all();
  const playerIds = new Set<string>();
  for (const match of matches) {
    if (match.white_player_id) playerIds.add(String(match.white_player_id));
    if (match.black_player_id) playerIds.add(String(match.black_player_id));
  }
  return playerIds;
};

export const venueOwnerBotService = {
  async listVenues(chatId: string) {
    const vendor = await getVendorByChatId(chatId);
    return orm.public.Venue.where({ vendor_id: vendor.id, status: 1, is_deleted: 0 }).all();
  },

  async listTables(chatId: string, venueId: number) {
    const vendor = await getVendorByChatId(chatId);
    await getOwnedVenue(Number(vendor.id), venueId);
    const tables = await orm.public.VenueTable.where({ venue_id: venueId, status: 1 }).all();
    return Promise.all(tables.map(async (table: any) => {
      const activeMatch = await orm.public.MatchHistory.where({
        table_id: table.id,
        game_end_at: null,
      }).first();
      return { ...table, is_available: !activeMatch && !table.ideal_player };
    }));
  },

  async createTable(chatId: string, venueId: number, name: string) {
    const vendor = await getVendorByChatId(chatId);
    await getOwnedVenue(Number(vendor.id), venueId);
    return venueTableService.createTable(venueId, { name });
  },

  async listActiveMatches(chatId: string, venueId: number) {
    const vendor = await getVendorByChatId(chatId);
    await getOwnedVenue(Number(vendor.id), venueId);
    const matches = await orm.public.MatchHistory.where({ venue_id: venueId, game_end_at: null }).all();
    return Promise.all(matches.map(async (match: any) => {
      const [white, black, table] = await Promise.all([
        match.white_player_id
          ? orm.public.Member.where({ id: String(match.white_player_id) }).first()
          : null,
        match.black_player_id
          ? orm.public.Member.where({ id: String(match.black_player_id) }).first()
          : null,
        match.table_id
          ? orm.public.VenueTable.where({ id: Number(match.table_id) }).first()
          : null,
      ]);
      return {
        id: match.id,
        status: match.status,
        started_at: match.started_at,
        white_player_name: white ? memberFirstName(white) : 'Unknown player',
        black_player_name: black ? memberFirstName(black) : 'Unknown player',
        table_name: table?.name || `Table ${match.table_id}`,
      };
    }));
  },

  async startManualMatch(
    chatId: string,
    venueId: number,
    tableId: number,
    playerOneIdentifier: string,
    playerTwoIdentifier: string,
  ) {
    const vendor = await getVendorByChatId(chatId);
    const venue = await getOwnedVenue(Number(vendor.id), venueId);
    const table = await orm.public.VenueTable.where({ id: tableId, venue_id: venueId }).first();
    if (!table || table.status !== 1) {
      throw new AppError('Active table not found in this venue', 404);
    }
    if (table.ideal_player) {
      throw new AppError('This table already has a player waiting', 409);
    }

    const activeMatch = await orm.public.MatchHistory.where({ table_id: tableId, game_end_at: null }).first();
    if (activeMatch) {
      throw new AppError('This table already has an active match', 409);
    }

    const [playerOne, playerTwo] = await Promise.all([
      getMemberByIdentifier(playerOneIdentifier),
      getMemberByIdentifier(playerTwoIdentifier),
    ]);
    if (String(playerOne.id) === String(playerTwo.id)) {
      throw new AppError('Choose two different players', 400);
    }

    const activePlayerIds = await getActivePlayerIds();
    if (activePlayerIds.has(String(playerOne.id)) || activePlayerIds.has(String(playerTwo.id))) {
      throw new AppError('One of these players is already in an active match', 409);
    }

    const now = new Date();
    const match = await orm.public.MatchHistory.create({
      user_id: null,
      started_at: now,
      game_end_at: null,
      time_in_min: null,
      price_per_min: venue.price_per_min ?? 0,
      white_player_id: playerOne.id,
      black_player_id: playerTwo.id,
      winner_id: null,
      venue_id: venue.id,
      is_loser_approved: 0,
      table_id: table.id,
      pricing_method: venue.pricing_method ?? null,
      status: 'started',
      commission_percent: venue.commission,
      commission_amount: null,
      cancellation_reason: null,
      venue_fee: null,
      chat_id: null,
      is_club_paid: 0,
      log_details: { started_by_vendor_id: vendor.id },
      createdAt: now,
      updatedAt: now,
    });

    return {
      id: match.id,
      status: match.status,
      table_name: table.name || `Table ${table.id}`,
      white_player_name: memberFirstName(playerOne),
      black_player_name: memberFirstName(playerTwo),
    };
  },

  async cancelMatch(chatId: string, matchId: number) {
    const vendor = await getVendorByChatId(chatId);
    const match = await orm.public.MatchHistory.where({ id: matchId }).first();
    if (!match || match.game_end_at) {
      throw new AppError('Active match not found', 404);
    }
    await getOwnedVenue(Number(vendor.id), Number(match.venue_id));

    const now = new Date();
    const details = typeof match.log_details === 'object' && match.log_details !== null
      ? match.log_details
      : {};
    const duration = match.started_at
      ? Math.max(1, Math.ceil((now.getTime() - new Date(match.started_at).getTime()) / 60000))
      : null;
    const cancelledMatch = await orm.public.MatchHistory.where({ id: match.id }).update({
      game_end_at: now,
      time_in_min: duration,
      status: 'cancelled',
      cancellation_reason: null,
      log_details: {
        ...details,
        cancelled_by_vendor_id: vendor.id,
        cancelled_at: now.toISOString(),
      },
      updatedAt: now,
    });

    if (match.table_id) {
      await orm.public.VenueTable.where({ id: match.table_id }).update({
        ideal_player: null,
        updatedAt: now,
      });
    }

    return { id: cancelledMatch.id, status: cancelledMatch.status };
  },
};