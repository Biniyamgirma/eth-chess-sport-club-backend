import { number } from 'zod';
import { prisma } from '../config/prisma.js';
import { AppError } from '../middlewares/errorHandler.js';

const orm = prisma.orm as any;

const getCurrentWeekNumber = () => {
  const now = Temporal.Now.instant();
  const zoned = now.toZonedDateTimeISO('Africa/Addis_Ababa');
  const weekNumber = zoned.weekOfYear;

  return weekNumber;
};

const isCurrentWeekSubmission = (submission: any, now: Temporal.ZonedDateTime) => {
  if (Number(submission.week_number) !== now.weekOfYear) {
    return false;
  }

  const createdAt = submission.createdAt instanceof Temporal.Instant
    ? submission.createdAt
    : Temporal.Instant.from(String(submission.createdAt));
  const submittedAt = createdAt
    .toZonedDateTimeISO('Africa/Addis_Ababa');
  return submittedAt.yearOfWeek === now.yearOfWeek &&
    submittedAt.weekOfYear === now.weekOfYear;
};

const enrichSubmission = async (submission: any) => {
  if (!submission) {
    return submission;
  }

  const votes = await orm.public.Vote.where({ submission_id: submission.id }).all();
  const voteCount = votes.length;
  const adminVoteWeight = Number(((Number(submission.admin_vote ?? 0) * 0.5)).toFixed(2));
  const weightedVoteCount = Number((voteCount + adminVoteWeight).toFixed(2));

  return {
    ...submission,
    vote_count: voteCount,
    admin_vote_weighted: adminVoteWeight,
    weighted_vote_count: weightedVoteCount,
    votes,
  };
};

const ensureEligibleMember = async (memberId: string, database = orm) => {
  const member = await database.public.Member.where({ id: memberId }).first();

  if (!member || member.is_deleted === 1) {
    throw new AppError('Only active members can perform this action', 403);
  }

  return member;
};

export const brilliantMoveService = {
  
  async submitBrilliantMove(memberId: string, input: Record<string, any>) {
    await ensureEligibleMember(memberId);
    const now = Temporal.Now.instant();
    const zoned = now.toZonedDateTimeISO('Africa/Addis_Ababa');

const weekNumber = zoned.weekOfYear;   // ISO week number, e.g. 40 
    const payload = {
      user_id: memberId,
      platform: input.platform ?? 'unknown',
      admin_vote: input.admin_vote ?? null,
      move_url: input.move_url ?? null,
      week_number: weekNumber,
      rank: input.rank ? Number(input.rank) : null,
      is_awarded: 0,
      createdAt: now,
      updatedAt: now,
    };

    return orm.public.BrilliantMoveSubmission.create(payload);
  },

  async editBrilliantMoveSubmission(memberId: string, submissionId: number, input: Record<string, any>) {
    await ensureEligibleMember(memberId);

    const submission = await this.getSubmissionById(submissionId);

    if (submission.user_id !== memberId) {
      throw new AppError('You can only edit your own brilliant move submission', 403);
    }
    const now= Temporal.Now.instant()
    const updated = await orm.public.BrilliantMoveSubmission.where({ id: submissionId }).update({
      platform: input.platform ?? submission.platform,
      move_url: input.move_url ?? submission.move_url,
      week_number: input.week_number !== undefined ? Number(input.week_number) : submission.week_number,
      updatedAt: now,
    });

    return enrichSubmission(updated);
  },

  async updateRankAndAward(adminId: number, submissionId: number, input: Record<string, any>) {
    const admin = await orm.public.Admin.where({ id: adminId }).first();

    if (!admin) {
      throw new AppError('Admin not found', 404);
    }

    if (Number(admin.role ?? 0) <= 6) {
      throw new AppError('Only administrators with role greater than 6 can update rank and award', 403);
    }

    const submission = await this.getSubmissionById(submissionId);

    if (submission.week_number !== null && submission.week_number !== undefined) {
      const currentWeekNumber = getCurrentWeekNumber();
      if (Number(submission.week_number) !== currentWeekNumber) {
        throw new AppError('Rank and award updates are only allowed within the same week', 400);
      }
    }
    const now= Temporal.Now.instant()
    const updated = await orm.public.BrilliantMoveSubmission.where({ id: submissionId }).update({
      rank: input.rank !== undefined ? Number(input.rank) : submission.rank,
      is_awarded: input.is_awarded !== undefined ? Number(input.is_awarded) : submission.is_awarded,
      updatedAt: now,
    });

    return enrichSubmission(updated);
  },

  async listSubmissions() {
    const submissions = await orm.public.BrilliantMoveSubmission.all();
    return Promise.all(submissions.map((submission: any) => enrichSubmission(submission)));
  },

  async listCurrentWeekSubmissions(memberId: string) {
    await ensureEligibleMember(memberId);
    const now = Temporal.Now.instant().toZonedDateTimeISO('Africa/Addis_Ababa');
    const submissions = await orm.public.BrilliantMoveSubmission.all();

    return Promise.all(
      submissions
        .filter((submission: any) =>
          isCurrentWeekSubmission(submission, now) &&
          submission.is_deleted !== 1 &&
          typeof submission.move_url === 'string' &&
          submission.move_url.length > 0,
        )
        .map(async (submission: any) => {
          const votes = await orm.public.Vote.where({ submission_id: submission.id }).all();
          const memberVote = votes.find((vote: any) => vote.user_id === memberId);

          return {
            id: submission.id,
            move_url: submission.move_url,
            platform: submission.platform,
            vote_count: votes.length,
            is_own: submission.user_id === memberId,
            has_voted: Boolean(memberVote),
          };
        }),
    );
  },

  async getSubmissionById(id: number) {
    const submission = await orm.public.BrilliantMoveSubmission.where({ id }).first();

    if (!submission) {
      throw new AppError('Brilliant move submission not found', 404);
    }

    return enrichSubmission(submission);
  },

  async adminVoteOnSubmission(adminId: number, submissionId: number, vote: number) {
    const admin = await orm.public.Admin.where({ id: adminId }).first();
    if (!admin) {
      throw new AppError('Admin not found', 404);
    }

    const submission = await this.getSubmissionById(submissionId);
    const now =  Temporal.Now.instant()
    const updated = await orm.public.BrilliantMoveSubmission.where({ id: submission.id }).update({
      admin_vote: vote,
      is_awarded: vote > 0 ? 1 : 0,
      updatedAt: now,
    });

    return enrichSubmission(updated);
  },

  async voteOnSubmission(memberId: string, submissionId: number, voteType: string) {
    return prisma.transaction(async (tx: any) => {
      const txOrm = tx.orm as any;
      const member = await ensureEligibleMember(memberId, txOrm);

      // Serialize this member's concurrent vote requests using the member row.
      await txOrm.public.Member.where({ id: memberId }).update({
        updatedAt: member.updatedAt,
      });

      const submission = await txOrm.public.BrilliantMoveSubmission.where({
        id: submissionId,
      }).first();
      if (!submission) {
        throw new AppError('Brilliant move submission not found', 404);
      }
      if (submission.user_id === memberId) {
        throw new AppError('You cannot vote on your own submission', 400);
      }

      const now = Temporal.Now.instant().toZonedDateTimeISO('Africa/Addis_Ababa');
      const weeklySubmissions = (await txOrm.public.BrilliantMoveSubmission.all())
        .filter((item: any) => isCurrentWeekSubmission(item, now));
      const weeklySubmissionIds = new Set(
        weeklySubmissions.map((item: any) => Number(item.id)),
      );
      if (!weeklySubmissionIds.has(submissionId)) {
        throw new AppError('Voting is only open for this week’s brilliant moves', 400);
      }

      const memberVotes = await txOrm.public.Vote.where({ user_id: memberId }).all();
      const existingVote = memberVotes.find(
        (vote: any) => weeklySubmissionIds.has(Number(vote.submission_id)),
      );
      if (existingVote) {
        if (Number(existingVote.submission_id) === submissionId) {
          return existingVote;
        }
        throw new AppError('You have already voted for another brilliant move this week', 409);
      }

      const voteTime = Temporal.Now.instant();
      const created = await txOrm.public.Vote.create({
        user_id: memberId,
        vote_type: voteType,
        submission_id: submissionId,
        status: 1,
        createdAt: voteTime,
        updatedAt: voteTime,
      });

      return {
        ...created,
        vote_count: (await txOrm.public.Vote.where({
          submission_id: submissionId,
        }).all()).length,
      };
    });
  },
};
