import { z } from 'zod';

const telegramChatId = z.string().regex(/^-?\d{1,20}$/);

export const brilliantMoveSubmissionSchema = z.object({
  body: z.object({
    platform: z.string().min(1).optional(),
    move_url: z.string().url().optional(),
  }).refine((value) => !!value.move_url || !!value.platform, {
    message: 'move_url or platform is required',
    path: ['move_url'],
  }),
});

export const telegramBrilliantMoveSubmissionSchema = z.object({
  body: z.object({
    chat_id: telegramChatId,
     move_url: z.string().trim().min(1).max(2048).url()
}) });

export const telegramBrilliantMoveRequestSchema = z.object({
  body: z.object({
    chat_id: telegramChatId,
  }).strict(),
});

export const telegramBrilliantMoveIdSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive(),
  }),
  body: z.object({
    chat_id: telegramChatId,
  }).strict(),
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

export const brilliantMoveParamsSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive(),
  }),
});

export const brilliantMoveListQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    page_size: z.coerce.number().int().min(1).max(100).default(12),
    sort: z.enum(['newest', 'most_votes']).default('newest'),
  }),
});
