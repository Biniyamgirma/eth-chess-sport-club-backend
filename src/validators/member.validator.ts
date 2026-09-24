import { z } from 'zod';

export const memberRegisterSchema = z.object({
  body: z.object({
    id: z.string().min(3).optional(),
    f_name: z.string().min(1).optional(),
    l_name: z.string().min(1).optional(),
    chat_id: z.string().optional(),
    phone: z.string().min(5),
    telegram_username: z.string().optional(),
    trophy: z.string().optional(),
    member_title: z.string().optional(),
    eth_chess_rating: z.number().int().optional(),
    password: z.string().min(8),
    address: z.string().optional(),
    profile_picture: z.string().optional(),
    district: z.union([z.string(), z.number()]).optional(),
    status: z.number().int().optional(),
    role: z.string().optional(),
  }),
});

export const memberUpdateSchema = z.object({
  body: z.object({
    f_name: z.string().min(1).optional(),
    l_name: z.string().min(1).optional(),
    chat_id: z.string().optional(),
    phone: z.string().min(5).optional(),
    telegram_username: z.string().optional(),
    trophy: z.string().optional(),
    member_title: z.string().optional(),
    eth_chess_rating: z.number().int().optional(),
    password: z.string().min(8).optional(),
    address: z.string().optional(),
    profile_picture: z.string().optional(),
    district: z.union([z.string(), z.number()]).optional(),
    status: z.number().int().optional(),
  }).passthrough(),
});

export const adminMemberUpdateSchema = z.object({
  body: z.object({
    f_name: z.string().min(1).optional(),
    l_name: z.string().min(1).optional(),
    chat_id: z.string().optional(),
    phone: z.string().min(5).optional(),
    telegram_username: z.string().optional(),
    trophy: z.string().optional(),
    member_title: z.string().optional(),
    eth_chess_rating: z.number().int().optional(),
    password: z.string().min(8).optional(),
    address: z.string().optional(),
    profile_picture: z.string().optional(),
    district: z.union([z.string(), z.number()]).optional(),
    status: z.number().int().optional(),
    is_member: z.number().int().optional(),
    role: z.string().optional(),
    is_deleted: z.number().int().optional(),
  }).passthrough(),
});

export const memberSyncSchema = z.object({
  body: z.object({
    chessDotComUsername: z.string().min(2).optional(),
    lichessUsername: z.string().min(2).optional(),
  }).refine((value) => !!value.chessDotComUsername || !!value.lichessUsername, {
    message: 'At least one external account username is required',
    path: ['chessDotComUsername'],
  }),
});
