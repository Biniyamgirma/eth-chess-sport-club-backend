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
      query?: Record<string, unknown>;
      params?: Record<string, unknown>;
    };

    // 1. Body can be safely reassigned
    if (data.body !== undefined) {
      req.body = data.body;
    }

    // 2. Safely mutate req.query to avoid the "getter only" TypeError
    if (data.query !== undefined) {
      for (const key in req.query) {
        delete req.query[key];
      }
      Object.assign(req.query, data.query);
    }

    // 3. Safely mutate req.params
    if (data.params !== undefined) {
      for (const key in req.params) {
        delete req.params[key];
      }
      Object.assign(req.params, data.params);
    }

    return next();
  };
};