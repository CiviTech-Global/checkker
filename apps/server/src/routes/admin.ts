import { Router } from "express";
import { authenticateRequest, requireRole, type AuthenticatedRequest } from "../middleware/auth";
import { validateBody, validateParams } from "../middleware/validate";
import type { AccountStatus } from "@checkker/shared";
import { AccountRepository, AuditLogRepository } from "@checkker/database";
import { AccountService } from "../services/AccountService";
import { adminStatusSchema, adminForceUsernameSchema, accountIdParamSchema } from "../services/validation";

const router = Router();

router.use(authenticateRequest);
router.use(requireRole("admin", "superadmin"));

router.get("/users", async (req: AuthenticatedRequest, res) => {
  try {
    const { search, status, cursor } = req.query;
    const limit = Math.min(parseInt(req.query.limit as string, 10) || 50, 100);
    const accounts = await AccountRepository.listForAdmin({
      search: typeof search === "string" ? search : undefined,
      status: typeof status === "string" ? (status as AccountStatus) : undefined,
      cursor: typeof cursor === "string" ? cursor : undefined,
      limit,
    });
    res.json({ accounts });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get("/users/:id", validateParams(accountIdParamSchema), async (req: AuthenticatedRequest, res) => {
  try {
    const account = await AccountRepository.findById(req.params.id as string);
    if (!account) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json({ account });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.patch(
  "/users/:id/status",
  validateParams(accountIdParamSchema),
  validateBody(adminStatusSchema),
  async (req: AuthenticatedRequest, res) => {
    try {
      await AccountService.setStatus(
        req.account!.id,
        req.params.id as string,
        req.body.status,
        req.body.reason,
        { ip: req.ip, userAgent: req.headers["user-agent"] }
      );
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  }
);

router.post(
  "/users/:id/reset-avatar",
  validateParams(accountIdParamSchema),
  async (req: AuthenticatedRequest, res) => {
    try {
      await AccountService.resetAvatarByModerator(req.account!.id, req.params.id as string, req.body.avatarId, {
        ip: req.ip,
        userAgent: req.headers["user-agent"],
      });
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  }
);

router.post(
  "/users/:id/force-username",
  validateParams(accountIdParamSchema),
  validateBody(adminForceUsernameSchema),
  async (req: AuthenticatedRequest, res) => {
    try {
      await AccountService.forceUsernameChange(req.account!.id, req.params.id as string, req.body.username, {
        ip: req.ip,
        userAgent: req.headers["user-agent"],
      });
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  }
);

router.get("/audit", async (req: AuthenticatedRequest, res) => {
  try {
    const { targetId, actorId, cursor } = req.query;
    const limit = Math.min(parseInt(req.query.limit as string, 10) || 50, 100);
    let logs;
    if (targetId) {
      logs = await AuditLogRepository.findByTarget(targetId as string, { limit, cursor: typeof cursor === "string" ? cursor : undefined });
    } else if (actorId) {
      logs = await AuditLogRepository.findByActor(actorId as string, { limit, cursor: typeof cursor === "string" ? cursor : undefined });
    } else {
      res.status(400).json({ error: "targetId or actorId required" });
      return;
    }
    res.json({ logs });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
