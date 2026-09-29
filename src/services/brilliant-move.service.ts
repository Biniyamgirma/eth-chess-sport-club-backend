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

const ensureEligibleMember = async (memberId: string) => {
  const member = await orm.public.Member.where({ id: memberId }).first();

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
    await ensureEligibleMember(memberId);

    const submission = await this.getSubmissionById(submissionId);

    if (!submission || submission.user_id === memberId) {
      throw new AppError('You cannot vote on your own submission', 400);
    }

    if (submission.user_id === memberId) {
      throw new AppError('You cannot vote on your own submission', 400);
    }

    const existingVote = await orm.public.Vote.where({
      user_id: memberId,
      submission_id: submissionId,
    }).first();
        const now =  Temporal.Now.instant()

    if (existingVote) {
      return orm.public.Vote.where({ id: existingVote.id }).update({
        vote_type: voteType,
        status: 1,
        updatedAt:now,
      });
    }

    const created = await orm.public.Vote.create({
      user_id: memberId,
      vote_type: voteType,
      submission_id: submissionId,
      status: 1,
      createdAt: now,
      updatedAt: now,
    });

    return {
      ...created,
      vote_count: (await orm.public.Vote.where({ submission_id: submissionId }).all()).length,
    };
  },
};
