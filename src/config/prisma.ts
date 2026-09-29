import postgres from '@prisma/orm-postgres/runtime';
import { Temporal } from '@js-temporal/polyfill';
import contractJson from '../../prisma/contract.json' with { type: 'json' };

import { env } from './env.js';

Object.assign(globalThis, { Temporal });

export const prisma = postgres({
  contractJson,
  url: env.DATABASE_URL,
});

export default prisma;
