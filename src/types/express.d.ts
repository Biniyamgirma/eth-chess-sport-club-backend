declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number | string;
        role: 'admin' | 'vendor' | 'member';
        type: 'admin' | 'vendor' | 'member';
      };
      member?: {
        id: string;
        phone: string;
        f_name: string | null;
        l_name: string | null;
        chat_id: string | null;
      };
      cookies?: Record<string, string>;
    }
  }
}

export {};
