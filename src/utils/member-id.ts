import { prisma } from '../config/prisma.js';

const orm = prisma.orm as any;

type MemberIdPrefix = 'U' | 'ETH';

export const generateMemberId = async (
  prefix: MemberIdPrefix,
  memberModel: any = orm.public.Member,
): Promise<string> => {
  const members = await memberModel.select('id').all();
  const pattern = new RegExp(`^${prefix}(\\d+)$`);
  let highestSequence = 0;

  for (const member of members) {
    const match = String(member.id).match(pattern);
    if (match) {
      highestSequence = Math.max(highestSequence, Number(match[1]));
    }
  }

  const width = prefix === 'U' ? 5 : 4;
  return `${prefix}${String(highestSequence + 1).padStart(width, '0')}`;
};