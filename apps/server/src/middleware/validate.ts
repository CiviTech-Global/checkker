import type { Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";
import type { AuthenticatedRequest } from "./auth";

export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const message = formatZodError(result.error);
      res.status(400).json({ error: "Validation error", details: message });
      return;
    }
    next();
  };
}

export function validateParams<T>(schema: ZodSchema<T>) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      const message = formatZodError(result.error);
      res.status(400).json({ error: "Validation error", details: message });
      return;
    }
    next();
  };
}

function formatZodError(error: ZodError): string {
  return error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
}
