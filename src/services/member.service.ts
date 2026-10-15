import { prisma } from '../config/prisma.js';
import { AppError } from '../middlewares/errorHandler.js';
import { generateMemberId } from '../utils/member-id.js';
import { MEMBER_STATUS } from '../utils/member-status.js';
import { hashPassword } from '../utils/password.js';

const orm = prisma.orm as any;
const CHESS_COM_USER_AGENT =
  'Ethchess-telegram-bot/1.0 (username: Biniyam_Girma; contact: ethchess77@gmail.com)';

interface ChessComProfile {
  username?: string;
  title?: string;
  followers?: number;
  last_online?: number;
  joined?: number;
  status?: string;
  url?: string;
  perfs?: Record<string, { rating?: number; games?: number; rd?: number; prog?: number }>;
}

interface ChessComStats {
  chess_bullet?: { last?: { rating?: number } };
  chess_blitz?: { last?: { rating?: number } };
  chess_rapid?: { last?: { rating?: number } };
}

interface LichessProfile {
  id?: string;
  username?: string;
  title?: string;
  createdAt?: number;
  seenAt?: number;
  profile?: {
    country?: string;
    location?: string;
    bio?: string;
    firstName?: string;
    lastName?: string;
  };
  perfs?: Record<string, { rating?: number; games?: number; rd?: number; prog?: number }>;
}

const fetchJson = async <T>(url: string, userAgent = 'EthChess-Backend/1.0'): Promise<T> => {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': userAgent,
    },
  });

  if (!response.ok) {
    throw new AppError(
      response.status === 404
        ? 'External profile not found'
        : `External profile fetch failed: ${response.statusText}`,
      response.status === 404 ? 404 : 502,
    );
  }

  return (await response.json()) as T;
};

const fetchChessComAccount = async (username: string) => {
  const encodedUsername = encodeURIComponent(username);
  const profile = await fetchJson<ChessComProfile>(
    `https://api.chess.com/pub/player/${encodedUsername}`,
    CHESS_COM_USER_AGENT,
  );
  if (!profile.username) {
    throw new AppError('Chess.com returned an invalid player profile', 502);
  }

  let stats: ChessComStats;
  try {
    stats = await fetchJson<ChessComStats>(
      `https://api.chess.com/pub/player/${encodedUsername}/stats`,
      CHESS_COM_USER_AGENT,
    );
  } catch (error) {
    if (!(error instanceof AppError) || error.statusCode !== 404) {
      throw error;
    }
    stats = {};
  }

  return { profile, stats };
};

const chessComDetailsPayload = (
  username: string,
  profile: ChessComProfile,
  stats: ChessComStats,
) => ({
  chess_dot_com_username: profile.username ?? username,
  chess_dot_com_info: { profile, stats },
  chess_dot_com_bullet_rating: stats.chess_bullet?.last?.rating ?? null,
  chess_dot_com_blitz_rating: stats.chess_blitz?.last?.rating ?? null,
  chess_dot_com_rapid_rating: stats.chess_rapid?.last?.rating ?? null,
});

const ensureMemberExists = async (memberId: string) => {
  const member = await orm.public.Member.where({ id: memberId }).first();

  if (!member || member.is_deleted === 1) {
    throw new AppError('Member not found or deleted', 404);
  }

  return member;
};

export const memberService = {
  async listMembers() {
    return orm.public.Member.all();
  },

  async registerMember(input: Record<string, any>) {
    
    const memberId = String(input.id ?? await generateMemberId('U'));

    if (!input.phone) {
      throw new AppError('Phone number is required', 400);
    }

    if (!input.password) {
      throw new AppError('Password is required', 400);
    }

    const existing = await orm.public.Member.where({ id: memberId }).first();
    if (existing) {
      throw new AppError('Member already exists', 409);
    }

    const passwordHash = await hashPassword(String(input.password));
    const now = Temporal.Now.instant();
    return orm.public.Member.create({
      id: memberId,
      f_name: input.f_name ?? null,
      l_name: input.l_name ?? null,
      chat_id: input.chat_id ?? null,
      phone: String(input.phone),
      telegram_username: input.telegram_username ?? null,
      trophy: input.trophy ?? null,
      is_member: input.is_member ?? 0,
      member_title: input.member_title ?? null,
      eth_chess_rating: input.eth_chess_rating ?? null,
      password: passwordHash,
      address: input.address ?? null,
      profile_picture: input.profile_picture ?? null,
      district: input.district ? Number(input.district) : null,
      status: input.status ?? 1,
      is_deleted: 0,
      role: input.role ?? 'member',
      createdAt: now,
      updatedAt: now,
    });
  },

  async registerTelegramMember(input: {
    chat_id: string;
    f_name: string;
    l_name?: string;
    phone: string;
    password: string;
    telegram_username?: string;
    address: string;
    district: number;
  }) {
    const [existingPhone, existingChat, district] = await Promise.all([
      orm.public.Member.where({ phone: input.phone }).first(),
      orm.public.Member.where({ chat_id: input.chat_id }).first(),
      orm.public.District.where({ id: input.district, status: 1 }).first(),
    ]);
    if (existingPhone) {
      throw new AppError('An account with this phone number already exists. Please log in instead.', 409);
    }
    if (existingChat) {
      throw new AppError('This Telegram account is already linked to an EthChess account.', 409);
    }
    if (!district) {
      throw new AppError('Choose an active district to register.', 400);
    }

    return memberService.registerMember({
      ...input,
      role: 'member',
      status: 1,
      is_member: 0,
    });
  },

  async getMemberById(memberId: string) {
    return ensureMemberExists(memberId);
  },

  async getTelegramProfile(memberId: string) {
    const member = await ensureMemberExists(memberId);
    const [district, details] = await Promise.all([
      member.district
        ? orm.public.District.where({ id: member.district }).first()
        : Promise.resolve(null),
      orm.public.MemberDetails.where({ user_id: member.id }).first(),
    ]);

    return {
      full_name: `${member.f_name ?? ''} ${member.l_name ?? ''}`.trim() || null,
      district_name: district?.name ?? null,
      address: member.address ?? null,
      phone: member.phone,
      createdAt: member.createdAt,
      telegram_username: member.telegram_username ?? null,
      chess_dot_com_username: details?.chess_dot_com_username ?? null,
      chess_dot_com_ratings: {
        bullet: details?.chess_dot_com_bullet_rating ?? null,
        blitz: details?.chess_dot_com_blitz_rating ?? null,
        rapid: details?.chess_dot_com_rapid_rating ?? null,
      },
      lichess_username: details?.lichess_username ?? null,
      lichess_ratings: {
        bullet: details?.lichess_bullet_rating ?? null,
        blitz: details?.lichess_blitz_rating ?? null,
        rapid: details?.lichess_rapid_rating ?? null,
        classical: details?.lichess_classical_rating ?? null,
      },
    };
  },

  async updateMemberProfile(memberId: string, input: Record<string, any>) {
    const member = await ensureMemberExists(memberId);
    const now = Temporal.Now.instant();
    const payload: Record<string, any> = {
      ...input,
      updatedAt: now,
    };

    if (input.password) {
      payload.password = await hashPassword(String(input.password));
    }

    delete payload.id;
    delete payload.createdAt;
    delete payload.is_deleted;
    delete payload.created_by;

    if (typeof input.district !== 'undefined') {
      payload.district = input.district === null ? null : Number(input.district);
    }

    if (typeof input.status !== 'undefined') {
      payload.status = Number(input.status);
    }

    if (typeof input.eth_chess_rating !== 'undefined') {
      payload.eth_chess_rating = input.eth_chess_rating === null ? null : Number(input.eth_chess_rating);
    }

    return orm.public.Member.where({ id: member.id }).update(payload);
  },

  async adminUpdateMember(memberId: string, input: Record<string, any>) {
    await ensureMemberExists(memberId);
    const now = Temporal.Now.instant();
    const payload: Record<string, any> = {
      ...input,
      updatedAt: now,
    };

    if (input.password) {
      payload.password = await hashPassword(String(input.password));
    }

    delete payload.id;
    delete payload.createdAt;

    return orm.public.Member.where({ id: memberId }).update(payload);
  },

  async softDeleteMember(memberId: string) {
    await ensureMemberExists(memberId);
    const now = Temporal.Now.instant();
    return orm.public.Member.where({ id: memberId }).update({
      is_deleted: 1,
      status: 0,
      updatedAt: now,
    });
  },

  async setMemberBlocked(memberId: string, isBlocked: boolean) {
    const member = await orm.public.Member.where({ id: memberId }).first();
    if (!member || member.is_deleted === 1) {
      throw new AppError('Member not found or deleted', 404);
    }

    return orm.public.Member.where({ id: memberId }).update({
      status: isBlocked ? MEMBER_STATUS.blocked : MEMBER_STATUS.active,
      updatedAt: Temporal.Now.instant(),
    });
  },

  async approveOfficialMember(memberId: string) {
    const member = await orm.public.Member.where({ id: memberId }).first();
    if (!member || member.is_deleted === 1) {
      throw new AppError('Member not found or deleted', 404);
    }

    return orm.public.Member.where({ id: memberId }).update({
      is_member: 1,
      updatedAt: Temporal.Now.instant(),
    });
  },

  async linkChessComAccount(memberId: string, username: string) {
    const member = await ensureMemberExists(memberId);
    const normalizedUsername = username.trim();
    const { profile, stats } = await fetchChessComAccount(normalizedUsername);
    const now = Temporal.Now.instant();
    const payload = {
      ...chessComDetailsPayload(normalizedUsername, profile, stats),
      updatedAt: now,
    };
    const existingDetails = await orm.public.MemberDetails.where({ user_id: member.id }).first();
    if (existingDetails) {
      await orm.public.MemberDetails.where({ id: existingDetails.id }).update(payload);
    } else {
      await orm.public.MemberDetails.create({
        user_id: member.id,
        ...payload,
        createdAt: now,
      });
    }

    return {
      chess_dot_com_username: payload.chess_dot_com_username,
      chess_dot_com_bullet_rating: payload.chess_dot_com_bullet_rating,
      chess_dot_com_blitz_rating: payload.chess_dot_com_blitz_rating,
      chess_dot_com_rapid_rating: payload.chess_dot_com_rapid_rating,
    };
  },

  async syncExternalProfiles(memberId: string, input: Record<string, any>) {
    const member = await ensureMemberExists(memberId);
    const now = Temporal.Now.instant();

    const existingDetails = await orm.public.MemberDetails.where({ user_id: memberId }).first();
    const updatePayload: Record<string, any> = {
      updatedAt: now,
    };

    if (input.chessDotComUsername) {
      const username = String(input.chessDotComUsername).trim();
      const { profile, stats } = await fetchChessComAccount(username);
      Object.assign(updatePayload, chessComDetailsPayload(username, profile, stats));
    }

    if (input.lichessUsername) {
      const lichessProfile = await fetchJson<LichessProfile>(
        `https://lichess.org/api/user/${encodeURIComponent(String(input.lichessUsername))}`,
      );

      updatePayload.lichess_username = String(input.lichessUsername);
      updatePayload.lichess_info = lichessProfile;
      updatePayload.lichess_bullet_rating = lichessProfile.perfs?.bullet?.rating ?? null;
      updatePayload.lichess_blitz_rating = lichessProfile.perfs?.blitz?.rating ?? null;
      updatePayload.lichess_rapid_rating = lichessProfile.perfs?.rapid?.rating ?? null;
      updatePayload.lichess_classical_rating = lichessProfile.perfs?.classical?.rating ?? null;
    }

    if (existingDetails) {
      return orm.public.MemberDetails.where({ id: existingDetails.id }).update(updatePayload);
    }

    return orm.public.MemberDetails.create({
      user_id: member.id,
      ...updatePayload,
      createdAt: now,
    });
  },
};
