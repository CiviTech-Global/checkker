import type { Request, Response, NextFunction } from "express";
import type { Socket } from "socket.io";
import { SessionService, type AuthenticatedAccount } from "../services/SessionService";
import { hasPermission } from "@checkker/shared";

export interface AuthenticatedRequest extends Request {
  account?: AuthenticatedAccount;
}

export async function authenticateRequest(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const token = header.slice(7);
  const account = await SessionService.validateToken(token);
  if (!account) {
    res.status(401).json({ error: "Invalid or expired session" });
    return;
  }

  req.account = account;
  next();
}

export function requireRole(...roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.account) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const hasAnyRole = roles.some((role) => req.account!.roles.includes(role));
    if (!hasAnyRole) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  };
}

export function requirePermission(permission: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.account) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    if (!hasPermission(req.account.roles, permission)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  };
}

export async function authenticateSocket(socket: Socket): Promise<AuthenticatedAccount | null> {
  const token = socket.handshake.auth?.token ?? socket.handshake.headers.authorization?.toString().slice(7);
  if (!token) return null;
  return SessionService.validateToken(token);
}

export function requireSocketPermission(socket: Socket, account: AuthenticatedAccount, permission: string): boolean {
  return hasPermission(account.roles, permission);
}
