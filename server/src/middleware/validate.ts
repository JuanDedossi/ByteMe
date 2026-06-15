import { RequestHandler } from 'express';
import { ZodTypeAny, z } from 'zod';

export function validate<T extends ZodTypeAny>(schema: T): RequestHandler {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: result.error.issues,
      });
    }
    req.body = result.data as z.infer<T>;
    next();
  };
}
