import { config } from 'dotenv';
config();

import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1).default('postgresql://postgres:postgres@localhost:5432/ethchess'),
  JWT_SECRET: z.string().min(32).default('this_is_a_dev_secret_key_change_it_immediately'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_WEBHOOK_SECRET: z.string().min(16).optional(),
});

export const env = envSchema.parse(process.env);
