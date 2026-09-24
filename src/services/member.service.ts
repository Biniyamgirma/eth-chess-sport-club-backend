import { prisma } from '../config/prisma.js';
import { AppError } from '../middlewares/errorHandler.js';
import { hashPassword } from '../utils/password.js';

const orm = prisma.orm as any;

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

const fetchJson = async <T>(url: string): Promise<T> => {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'EthChess-Backend/1.0',
    },
  });

  if (!response.ok) {
    throw new AppError(`External profile fetch failed: ${response.statusText}`, 502);
  }

  return (await response.json()) as T;
};

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
    const now = new Date();
    const memberId = String(input.id ?? `member_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);

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

    return orm.public.Member.create({
      id: memberId,
      f_name: input.f_name ?? null,
      l_name: input.l_name ?? null,
      chat_id: input.chat_id ?? null,
      phone: String(input.phone),
      telegram_username: input.telegram_username ?? null,
      trophy: input.trophy ?? null,
      is_member: input.is_member ?? 1,
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

  async getMemberById(memberId: string) {
    return ensureMemberExists(memberId);
  },

  async updateMemberProfile(memberId: string, input: Record<string, any>) {
    const member = await ensureMemberExists(memberId);
    const now = new Date();
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

    const payload: Record<string, any> = {
      ...input,
      updatedAt: new Date(),
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

    return orm.public.Member.where({ id: memberId }).update({
      is_deleted: 1,
      status: 0,
      updatedAt: new Date(),
    });
  },

  async syncExternalProfiles(memberId: string, input: Record<string, any>) {
    const member = await ensureMemberExists(memberId);
    const now = new Date();

    const existingDetails = await orm.public.MemberDetails.where({ user_id: memberId }).first();
    const updatePayload: Record<string, any> = {
      updatedAt: now,
    };

    if (input.chessDotComUsername) {
      const chessProfile = await fetchJson<ChessComProfile>(
        `https://api.chess.com/pub/player/${encodeURIComponent(String(input.chessDotComUsername))}`,
      );

      updatePayload.chess_dot_com_username = String(input.chessDotComUsername);
      updatePayload.chess_dot_com_info = chessProfile;
      updatePayload.chess_dot_com_bullet_rating = chessProfile.perfs?.bullet?.rating ?? null;
      updatePayload.chess_dot_com_blitz_rating = chessProfile.perfs?.blitz?.rating ?? null;
      updatePayload.chess_dot_com_rapid_rating = chessProfile.perfs?.rapid?.rating ?? null;

      await orm.public.Member.where({ id: memberId }).update({
        chess_dot_com_username: String(input.chessDotComUsername),
        updatedAt: now,
      });
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

      await orm.public.Member.where({ id: memberId }).update({
        lichess_username: String(input.lichessUsername),
        updatedAt: now,
      });
    }

    if (existingDetails) {
      return orm.public.MemberDetails.where({ id: existingDetails.id }).update(updatePayload);
    }

    return orm.public.MemberDetails.create({
      user_id: member.id,
      chess_dot_com_username: input.chessDotComUsername ?? null,
      lichess_username: input.lichessUsername ?? null,
      chess_dot_com_info: input.chessDotComUsername ? await fetchJson<ChessComProfile>(`https://api.chess.com/pub/player/${encodeURIComponent(String(input.chessDotComUsername))}`) : null,
      lichess_info: input.lichessUsername ? await fetchJson<LichessProfile>(`https://lichess.org/api/user/${encodeURIComponent(String(input.lichessUsername))}`) : null,
      chess_dot_com_bullet_rating: input.chessDotComUsername ? (await fetchJson<ChessComProfile>(`https://api.chess.com/pub/player/${encodeURIComponent(String(input.chessDotComUsername))}`)).perfs?.bullet?.rating ?? null : null,
      chess_dot_com_blitz_rating: input.chessDotComUsername ? (await fetchJson<ChessComProfile>(`https://api.chess.com/pub/player/${encodeURIComponent(String(input.chessDotComUsername))}`)).perfs?.blitz?.rating ?? null : null,
      chess_dot_com_rapid_rating: input.chessDotComUsername ? (await fetchJson<ChessComProfile>(`https://api.chess.com/pub/player/${encodeURIComponent(String(input.chessDotComUsername))}`)).perfs?.rapid?.rating ?? null : null,
      lichess_bullet_rating: input.lichessUsername ? (await fetchJson<LichessProfile>(`https://lichess.org/api/user/${encodeURIComponent(String(input.lichessUsername))}`)).perfs?.bullet?.rating ?? null : null,
      lichess_blitz_rating: input.lichessUsername ? (await fetchJson<LichessProfile>(`https://lichess.org/api/user/${encodeURIComponent(String(input.lichessUsername))}`)).perfs?.blitz?.rating ?? null : null,
      lichess_rapid_rating: input.lichessUsername ? (await fetchJson<LichessProfile>(`https://lichess.org/api/user/${encodeURIComponent(String(input.lichessUsername))}`)).perfs?.rapid?.rating ?? null : null,
      lichess_classical_rating: input.lichessUsername ? (await fetchJson<LichessProfile>(`https://lichess.org/api/user/${encodeURIComponent(String(input.lichessUsername))}`)).perfs?.classical?.rating ?? null : null,
      createdAt: now,
      updatedAt: now,
    });
  },
};
