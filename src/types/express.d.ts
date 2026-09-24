declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number | string;
        role: 'admin' | 'vendor' | 'member';
        type: 'admin' | 'vendor' | 'member';
      };
      cookies?: Record<string, string>;
    }
  }
}

export {};
