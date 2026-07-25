import {
  AccountRepository,
  SessionRepository,
  getDb,
} from "@checkker/database";
import { ProfileService } from "../services/ProfileService";
import { AccountService } from "../services/AccountService";
import { SessionService } from "../services/SessionService";

jest.setTimeout(30000);

describe("ProfileService", () => {
  beforeEach(async () => {
    const db = getDb();
    await db.auditLog.deleteMany();
    await db.usernameHistory.deleteMany();
    await db.userSession.deleteMany();
    await db.gameMove.deleteMany();
    await db.bet.deleteMany();
    await db.game.deleteMany();
    await db.friendship.deleteMany();
    await db.notification.deleteMany();
    await db.puzzleAttempt.deleteMany();
    await db.accountCosmetic.deleteMany();
    await db.profile.deleteMany();
    await db.userStats.deleteMany();
    await db.account.deleteMany();
  });

  it("creates an account with profile and stats", async () => {
    const account = await AccountRepository.create({
      walletAddress: "0x1234567890123456789012345678901234567890",
      isGuest: false,
      username: "testuser",
    });
    expect(account.profile?.username).toBe("testuser");
    expect(account.stats?.rating).toBe(1000);
  });

  it("updates profile fields", async () => {
    const account = await AccountRepository.create({
      guestDeviceId: "device-001",
      isGuest: true,
      username: "guestuser",
    });
    const updated = await ProfileService.updateProfile(account, {
      displayName: "Guest One",
      bio: "Hello world",
      country: "US",
    });
    expect(updated.profile.displayName).toBe("Guest One");
    expect(updated.profile.bio).toBe("Hello world");
    expect(updated.profile.country).toBe("US");
  });

  it("changes username with cooldown enforcement", async () => {
    const account = await AccountRepository.create({
      guestDeviceId: "device-002",
      isGuest: true,
      username: "oldname",
    });
    const first = await ProfileService.changeUsername(account, "newname");
    expect(first.newUsername).toBe("newname");

    const updated = await AccountRepository.findById(account.id);
    await expect(ProfileService.changeUsername(updated!, "anothername")).rejects.toThrow(
      "Username can only be changed once every 30 days"
    );
  });

  it("links a wallet to a guest account", async () => {
    const account = await AccountRepository.create({
      guestDeviceId: "device-003",
      isGuest: true,
      username: "guestlink",
    });
    const updated = await AccountService.linkWallet(account, "0x1234567890123456789012345678901234567891");
    expect(updated.isGuest).toBe(false);
    expect(updated.walletAddress).toBe("0x1234567890123456789012345678901234567891");
  });

  it("creates and validates sessions", async () => {
    const account = await AccountRepository.create({
      walletAddress: "0x1234567890123456789012345678901234567892",
      isGuest: false,
      username: "sessionuser",
    });
    const { token } = await SessionService.createSession(account, { ip: "127.0.0.1" });
    const validated = await SessionService.validateToken(token);
    expect(validated?.id).toBe(account.id);
  });

  it("schedules account deletion and revokes sessions", async () => {
    const account = await AccountRepository.create({
      walletAddress: "0x1234567890123456789012345678901234567893",
      isGuest: false,
      username: "deleteuser",
    });
    await SessionService.createSession(account, { ip: "127.0.0.1" });
    const result = await AccountService.requestDeletion(account);
    expect(result.completedAt).toBeDefined();

    const sessions = await SessionRepository.findActiveByAccount(account.id);
    expect(sessions.length).toBe(0);
  });
});
