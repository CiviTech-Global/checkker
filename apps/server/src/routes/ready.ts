import type { Request, Response } from "express";
import { getDb } from "@checkker/database";

export async function readyHandler(
  _req: Request,
  res: Response
): Promise<void> {
  try {
    await getDb().$queryRaw`SELECT 1`;
    res.status(200).json({ status: "ok" });
  } catch {
    res.status(503).json({ status: "error" });
  }
}