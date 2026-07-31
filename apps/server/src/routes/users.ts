import { Router } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { authenticateRequest, type AuthenticatedRequest } from "../middleware/auth";
import { validateBody, validateParams } from "../middleware/validate";
import { ProfileService } from "../services/ProfileService";
import { AvatarService } from "../services/AvatarService";
import { AccountService } from "../services/AccountService";
import { SessionService } from "../services/SessionService";
import {
  updateProfileSchema,
  changeUsernameSchema,
  usernameParamSchema,
} from "../services/validation";
import multer from "multer";

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

const updateProfileLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: AuthenticatedRequest) => req.account?.id ?? ipKeyGenerator(req.ip ?? "anonymous"),
  handler: (_req, res) => res.status(429).json({ error: "Profile edit rate limit exceeded" }),
});

const usernameChangeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour (the 30-day cooldown is enforced separately)
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: AuthenticatedRequest) => req.account?.id ?? ipKeyGenerator(req.ip ?? "anonymous"),
  handler: (_req, res) => res.status(429).json({ error: "Username change rate limit exceeded" }),
});

router.get("/me", authenticateRequest, async (req: AuthenticatedRequest, res) => {
  try {
    const profile = await ProfileService.getMyProfile(req.account!);
    res.json(profile);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.patch("/me", authenticateRequest, updateProfileLimiter, validateBody(updateProfileSchema), async (req: AuthenticatedRequest, res) => {
  try {
    const profile = await ProfileService.updateProfile(req.account!, req.body, {
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });
    res.json(profile);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

router.post("/me/username", authenticateRequest, usernameChangeLimiter, validateBody(changeUsernameSchema), async (req: AuthenticatedRequest, res) => {
  try {
    const result = await ProfileService.changeUsername(req.account!, req.body.username, {
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

router.post(
  "/me/avatar",
  authenticateRequest,
  upload.single("file"),
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "No file uploaded" });
        return;
      }
      const result = await AvatarService.uploadAvatar(req.account!.id, req.file);
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  }
);

router.delete("/me/avatar", authenticateRequest, async (req: AuthenticatedRequest, res) => {
  try {
    await AvatarService.resetToPreset(req.account!.id, req.body.avatarId ?? "king_white");
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

router.post("/me/delete", authenticateRequest, async (req: AuthenticatedRequest, res) => {
  try {
    const result = await AccountService.requestDeletion(req.account!, {
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

router.get("/sessions", authenticateRequest, async (req: AuthenticatedRequest, res) => {
  try {
    const sessions = await SessionService.listSessions(req.account!.id, req.account!.sessionId);
    res.json({ sessions });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.delete("/sessions/:id", authenticateRequest, async (req: AuthenticatedRequest, res) => {
  try {
    const success = await SessionService.revokeSession(req.account!.id, req.params.id as string, {
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });
    if (!success) {
      res.status(404).json({ error: "Session not found" });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

router.delete("/sessions", authenticateRequest, async (req: AuthenticatedRequest, res) => {
  try {
    await SessionService.revokeAllExcept(req.account!.id, req.account!.sessionId, {
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

router.get("/:username", validateParams(usernameParamSchema), async (req: AuthenticatedRequest, res) => {
  try {
    const profile = await ProfileService.getPublicProfile(req.params.username as string, {
      viewerAccountId: req.account?.id,
    });
    if (!profile) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json(profile);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get("/:username/games", validateParams(usernameParamSchema), async (req: AuthenticatedRequest, res) => {
  try {
    const games = await ProfileService.getRecentGamesForPublicProfile(req.params.username as string);
    res.json({ games });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
