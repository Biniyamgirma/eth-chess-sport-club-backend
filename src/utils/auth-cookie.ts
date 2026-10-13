const isProduction = process.env.NODE_ENV === 'production';

export const authCookieOptions = {
  httpOnly: true,
  sameSite: isProduction ? 'none' : 'lax',
  secure: isProduction,
  maxAge: 7 * 24 * 60 * 60 * 1000,
} as const;

export const authCookieClearOptions = {
  httpOnly: authCookieOptions.httpOnly,
  sameSite: authCookieOptions.sameSite,
  secure: authCookieOptions.secure,
} as const;
