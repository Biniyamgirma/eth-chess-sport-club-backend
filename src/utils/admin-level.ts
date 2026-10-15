export const hasSufficientAdminLevel = (
  roleLevel: number,
  minimumExclusiveLevel: number,
) => roleLevel > minimumExclusiveLevel;
