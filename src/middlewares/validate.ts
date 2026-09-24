import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';

export const validate = (schema: z.ZodTypeAny) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const parsed = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: parsed.error.flatten(),
      });
    }

    const data = parsed.data as {
      body?: unknown;
      query?: unknown;
      params?: unknown;
    };

    req.body = (data.body ?? req.body) as typeof req.body;
    req.query = (data.query ?? req.query) as typeof req.query;
    req.params = (data.params ?? req.params) as typeof req.params;

    return next();
  };
};
