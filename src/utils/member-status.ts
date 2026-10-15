export const MEMBER_STATUS = {
  pending: 0,
  active: 1,
  blocked: 2,
} as const;

export const isMemberBlocked = (member: { status?: number | null }) =>
  member.status === MEMBER_STATUS.blocked;
