import { Temporal } from '@js-temporal/polyfill';
import { prisma } from '../config/prisma.js';
import { AppError } from '../middlewares/errorHandler.js';
import { calculateWeeklyWinner, canVoteOnSubmission } from '../utils/brilliant-move-rules.js';
import {
  getBrilliantMoveWeek,
  isWithinBrilliantMoveWeek,
} from '../utils/brilliant-move-week.js';

const orm = prisma.orm as any;
type VoterRole = 'admin' | 'member';
type Voter = { id: string; role: VoterRole };

const asInstant = (value: unknown): Temporal.Instant =>
  value instanceof Temporal.Instant
    ? value
    : Temporal.Instant.from(String(value));

const getVoterId = (vote: any): string | null => {
  if (vote.admin_id !== null && vote.admin_id !== undefined) {
    return String(vote.admin_id);
  }
  if (typeof vote.user_id === 'string') return vote.user_id;
  return null;
};

const getVoterRole = (vote: any): VoterRole =>
  vote.admin_id !== null && vote.admin_id !== undefined ? 'admin' : 'member';

const ensureEligibleMember = async (memberId: string, database = orm) => {
  const member = await database.public.Member.where({ id: memberId }).first();
  if (!member || member.is_deleted === 1) {
    throw new AppError('Only active members can perform this action', 403);
  }
  return member;
};

const ensureEligibleAdmin = async (adminId: number, database = orm) => {
  const admin = await database.public.Admin.where({ id: adminId }).first();
  if (!admin) {
    throw new AppError('Admin not found', 404);
  }
  return admin;
};

const findSubmission = async (submissionId: number, database = orm) => {
  const submission = await database.public.BrilliantMoveSubmission
    .where({ id: submissionId })
    .first();
  if (!submission) {
    throw new AppError('Brilliant move submission not found', 404);
  }
  return submission;
};

const getMoveCard = async (submission: any, voter?: Voter) => {
  const votes = await orm.public.Vote
    .where({ submission_id: submission.id })
    .all();
  const adminVotes = votes.filter(
    (vote: any) => getVoterRole(vote) === 'admin',
  );
  const currentUserVoted = voter
    ? votes.some(
        (vote: any) =>
          getVoterRole(vote) === voter.role && getVoterId(vote) === voter.id,
      )
    : false;

  return {
    ...submission,
    total_votes: votes.length,
    admin_votes: adminVotes.length,
    vote_count: votes.length,
    current_user_voted: currentUserVoted,
    is_own: voter?.role === 'member' && submission.user_id === voter.id,
  };
};

const getSubmissions = async () =>
  orm.public.BrilliantMoveSubmission.all();

const getActiveSubmissions = async () => {
  const submissions = await getSubmissions();
  return submissions.filter((submission: any) => submission.is_deleted !== 1);
};

const getVoteTotals = async (submission: any) => {
  const votes = await orm.public.Vote
    .where({ submission_id: submission.id })
    .all();
  return {
    ...submission,
    total_votes: votes.length,
    admin_votes: votes.filter(
      (vote: any) => getVoterRole(vote) === 'admin',
    ).length,
  };
};

const matchesVoter = (vote: any, voter: Voter) =>
  getVoterRole(vote) === voter.role && getVoterId(vote) === voter.id;

export const brilliantMoveService = {
  async submitBrilliantMove(memberId: string, input: Record<string, any>) {
    await ensureEligibleMember(memberId);
    const now = Temporal.Now.instant();
    const week = getBrilliantMoveWeek(now);
    return orm.public.BrilliantMoveSubmission.create({
      user_id: memberId,
      platform: input.platform ?? 'unknown',
      move_url: input.move_url ?? null,
      week_number: week.weekNumber,
      rank: input.rank ? Number(input.rank) : null,
      is_awarded: 0,
      createdAt: now,
      updatedAt: now,
    });
  },

  async editBrilliantMoveSubmission(
    memberId: string,
    submissionId: number,
    input: Record<string, any>,
  ) {
    await ensureEligibleMember(memberId);
    const submission = await findSubmission(submissionId);
    if (submission.user_id !== memberId) {
      throw new AppError('You can only edit your own brilliant move submission', 403);
    }
    const updated = await orm.public.BrilliantMoveSubmission
      .where({ id: submissionId })
      .update({
        platform: input.platform ?? submission.platform,
        move_url: input.move_url ?? submission.move_url,
        updatedAt: Temporal.Now.instant(),
      });
    return getMoveCard(updated, { id: memberId, role: 'member' });
  },

  async updateRankAndAward(adminId: number, submissionId: number, input: Record<string, any>) {
    const admin = await ensureEligibleAdmin(adminId);
    if (Number(admin.role ?? 0) <= 6) {
      throw new AppError(
        'Only administrators with role greater than 6 can update rank and award',
        403,
      );
    }
    const submission = await findSubmission(submissionId);
    const updated = await orm.public.BrilliantMoveSubmission
      .where({ id: submissionId })
      .update({
        rank: input.rank !== undefined ? Number(input.rank) : submission.rank,
        is_awarded:
          input.is_awarded !== undefined
            ? Number(input.is_awarded)
            : submission.is_awarded,
        updatedAt: Temporal.Now.instant(),
      });
    return getMoveCard(updated, { id: String(adminId), role: 'admin' });
  },

  async listSubmissions(voter?: Voter) {
    const submissions =
      voter?.role === 'admin'
        ? await getSubmissions()
        : await getActiveSubmissions();
    return Promise.all(
      submissions.map((submission: any) => getMoveCard(submission, voter)),
    );
  },

  async listCurrentWeekSubmissions(voter: Voter) {
    if (voter.role === 'member') {
      await ensureEligibleMember(voter.id);
    } else {
      await ensureEligibleAdmin(Number(voter.id));
    }
    const week = getBrilliantMoveWeek();
    const submissions =
      voter.role === 'admin'
        ? await getSubmissions()
        : await getActiveSubmissions();
    return Promise.all(
      submissions
        .filter((submission: any) =>
          isWithinBrilliantMoveWeek(submission.createdAt, week),
        )
        .map((submission: any) => getMoveCard(submission, voter)),
    );
  },

  async listAllSubmissions(
    voter: Voter,
    page: number,
    pageSize: number,
    sort: 'newest' | 'most_votes',
  ) {
    const submissions =
      voter.role === 'admin'
        ? await getSubmissions()
        : await getActiveSubmissions();
    const cards = await Promise.all(
      submissions.map((submission: any) => getMoveCard(submission, voter)),
    );
    cards.sort((left: any, right: any) =>
      sort === 'most_votes'
        ? right.total_votes - left.total_votes ||
          right.admin_votes - left.admin_votes ||
          Temporal.Instant.compare(
            asInstant(right.createdAt),
            asInstant(left.createdAt),
          )
        : Temporal.Instant.compare(
            asInstant(right.createdAt),
            asInstant(left.createdAt),
          ),
    );
    const total = cards.length;
    const start = (page - 1) * pageSize;
    return {
      items: cards.slice(start, start + pageSize),
      page,
      page_size: pageSize,
      total,
      total_pages: Math.ceil(total / pageSize),
      sort,
    };
  },

  async listWeeklyWinners(voter: Voter) {
    const now = Temporal.Now.instant();
    const submissions = await getActiveSubmissions();
    const grouped = new Map<string, any[]>();

    for (const submission of submissions) {
      const week = getBrilliantMoveWeek(asInstant(submission.createdAt));
      if (Temporal.Instant.compare(week.end, now) > 0) continue;
      const group = grouped.get(week.weekStart) ?? [];
      group.push(submission);
      grouped.set(week.weekStart, group);
    }

    for (const [weekStart, weeklySubmissions] of grouped) {
      const week = getBrilliantMoveWeek(
        Temporal.Instant.from(`${weekStart}T12:00:00Z`),
      );
      const existing = await orm.public.BrilliantMoveWeeklyWinner
        .where({ week_start: week.start })
        .first();
      if (existing) continue;

      const totals = await Promise.all(weeklySubmissions.map(getVoteTotals));
      const winner = calculateWeeklyWinner(totals);
      if (!winner) continue;
      try {
        await orm.public.BrilliantMoveWeeklyWinner.create({
          week_start: week.start,
          submission_id: winner.id,
          total_votes: winner.total_votes,
          admin_votes: winner.admin_votes,
          createdAt: now,
        });
      } catch (error) {
        const stored = await orm.public.BrilliantMoveWeeklyWinner
          .where({ week_start: week.start })
          .first();
        if (!stored) throw error;
      }
    }

    const storedWinners = await orm.public.BrilliantMoveWeeklyWinner.all();
    const completedWinners = storedWinners.filter((winner: any) =>
      Temporal.Instant.compare(asInstant(winner.week_start), now) < 0,
    );
    completedWinners.sort((left: any, right: any) =>
      Temporal.Instant.compare(
        asInstant(right.week_start),
        asInstant(left.week_start),
      ),
    );

    return Promise.all(
      completedWinners.map(async (winner: any) => {
        const submission = await orm.public.BrilliantMoveSubmission
          .where({ id: winner.submission_id })
          .first();
        if (!submission) {
          throw new AppError(
            `Stored weekly winner references missing move ${winner.submission_id}`,
            500,
          );
        }
        const card = await getMoveCard(submission, voter);
        const week = getBrilliantMoveWeek(asInstant(winner.week_start));
        return {
          ...card,
          total_votes: winner.total_votes,
          admin_votes: winner.admin_votes,
          vote_count: winner.total_votes,
          week_start: week.weekStart,
          week_end: week.weekEnd,
        };
      }),
    );
  },

  async getSubmissionById(id: number, voter?: Voter) {
    return getMoveCard(await findSubmission(id), voter);
  },

  async adminVoteOnSubmission(adminId: number, submissionId: number, vote: number) {
    await ensureEligibleAdmin(adminId);
    await this.setVoteOnSubmission(
      { id: String(adminId), role: 'admin' },
      submissionId,
      vote > 0,
    );
    const submission = await findSubmission(submissionId);
    const updated = await orm.public.BrilliantMoveSubmission
      .where({ id: submissionId })
      .update({
        admin_vote: vote,
        is_awarded: vote > 0 ? 1 : 0,
        updatedAt: Temporal.Now.instant(),
      });
    return getMoveCard(updated, { id: String(adminId), role: 'admin' });
  },

  async setVoteOnSubmission(
    voter: Voter,
    submissionId: number,
    shouldVote: boolean,
  ) {
    return prisma.transaction(async (tx: any) => {
      const txOrm = tx.orm as any;
      const actorId = voter.role === 'admin' ? Number(voter.id) : voter.id;
      const actor = voter.role === 'admin'
        ? await ensureEligibleAdmin(Number(actorId), txOrm)
        : await ensureEligibleMember(String(actorId), txOrm);
      const actorTable = voter.role === 'admin' ? 'Admin' : 'Member';

      // Updating the actor row serializes concurrent add/remove requests from one voter.
      await txOrm.public[actorTable].where({ id: actorId }).update({
        updatedAt: actor.updatedAt,
      });

      const submission = await findSubmission(submissionId, txOrm);
      if (submission.is_deleted === 1) {
        throw new AppError('Brilliant move submission not found', 404);
      }
      if (!canVoteOnSubmission(voter, submission.user_id ?? null)) {
        throw new AppError('You cannot vote on your own submission', 400);
      }

      const votes = await txOrm.public.Vote
        .where({ submission_id: submissionId })
        .all();
      const existingVote = votes.find((vote: any) => matchesVoter(vote, voter));

      if (shouldVote && !existingVote) {
        const now = Temporal.Now.instant();
        await txOrm.public.Vote.create({
          user_id: voter.role === 'member' ? voter.id : null,
          admin_id: voter.role === 'admin' ? Number(voter.id) : null,
          vote_type: 'upvote',
          submission_id: submissionId,
          status: 1,
          createdAt: now,
          updatedAt: now,
        });
      } else if (!shouldVote && existingVote) {
        await txOrm.public.Vote.where({ id: existingVote.id }).delete();
      }

      const updatedVotes = await txOrm.public.Vote
        .where({ submission_id: submissionId })
        .all();
      return {
        id: submissionId,
        total_votes: updatedVotes.length,
        vote_count: updatedVotes.length,
        admin_votes: updatedVotes.filter(
          (vote: any) => getVoterRole(vote) === 'admin',
        ).length,
        current_user_voted: updatedVotes.some((vote: any) =>
          matchesVoter(vote, voter),
        ),
      };
    });
  },

  async voteOnSubmission(memberId: string, submissionId: number, _voteType: string) {
    return this.setVoteOnSubmission(
      { id: memberId, role: 'member' },
      submissionId,
      true,
    );
  },
};
