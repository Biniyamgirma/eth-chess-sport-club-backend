import { z } from 'zod';

export const brilliantMoveSubmissionSchema = z.object({
  body: z.object({
    platform: z.string().min(1).optional(),
    move_url: z.string().url().optional(),
  }).refine((value) => !!value.move_url || !!value.platform, {
    message: 'move_url or platform is required',
    path: ['move_url'],
  }),
});

export const brilliantMoveVoteSchema = z.object({
  body: z.object({
    vote: z.union([z.string(), z.number()]).optional(),
    vote_type: z.enum(['upvote', 'downvote', 'star']).optional(),
  }).refine((value) => {
    if (value.vote !== undefined) {
      const numeric = Number(value.vote);
      return numeric >= 0 && numeric <= 5;
    }

    return true;
  }, {
    message: 'vote must be between 0 and 5',
    path: ['vote'],
  }),
});
