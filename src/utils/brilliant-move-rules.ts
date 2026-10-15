export interface VoteIdentity {
  id: string;
  role: 'admin' | 'member';
}

export interface MoveVoteSummary {
  id: number;
  user_id: string | null;
  createdAt: string | Date | Temporal.Instant;
  total_votes: number;
  admin_votes: number;
}

export function canVoteOnSubmission(
  voter: VoteIdentity,
  submissionOwnerId: string | null,
): boolean {
  return submissionOwnerId === null || submissionOwnerId !== voter.id;
}

export function calculateWeeklyWinner<T extends MoveVoteSummary>(
  submissions: T[],
): T | null {
  // Break ties by admin votes, then by the earliest submission.
  return (
    [...submissions].sort(
      (left, right) =>
        right.total_votes - left.total_votes ||
        right.admin_votes - left.admin_votes ||
        Date.parse(String(left.createdAt)) -
          Date.parse(String(right.createdAt)),
    )[0] ?? null
  );
}
import { Temporal } from '@js-temporal/polyfill';
