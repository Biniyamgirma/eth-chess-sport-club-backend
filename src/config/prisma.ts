import postgres from '@prisma/orm-postgres/runtime';
import contractJson from '../../prisma/contract.json' with { type: 'json' };

import { env } from './env.js';

export const prisma = postgres({
  contractJson,
  url: env.DATABASE_URL,
});

export default prisma;
