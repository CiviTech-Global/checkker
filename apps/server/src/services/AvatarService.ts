import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { ProfileRepository } from "@checkker/database";
import type { AvatarUploadResponse } from "@checkker/shared";

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB
const AVATAR_DIR = process.env.AVATAR_STORAGE_PATH || "./uploads/avatars";

function extensionForMimeType(mimeType: string): string {
  switch (mimeType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      return "bin";
  }
}

async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

/**
 * Minimal avatar processor. In production this should integrate with Sharp
 * (or an image worker) and an S3-compatible object store. For dev/test it
 * writes files to local disk and returns local URLs.
 */
export const AvatarService = {
  async uploadAvatar(accountId: string, file: { buffer: Buffer; mimetype: string; originalname: string }): Promise<AvatarUploadResponse> {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new Error("Invalid image format. Use JPEG, PNG, or WebP.");
    }
    if (file.buffer.length > MAX_FILE_SIZE_BYTES) {
      throw new Error("Image must be 2 MB or smaller.");
    }

    const hash = crypto.createHash("sha256").update(file.buffer).update(accountId).digest("hex").slice(0, 16);
    const ext = extensionForMimeType(file.mimetype);
    const baseName = `${hash}`;

    await ensureDir(AVATAR_DIR);

    // For this iteration we store a single 512px representation and generate
    // placeholder thumbnail paths. A production implementation resizes to 64/256/512.
    const fileName = `${baseName}_512.${ext}`;
    const filePath = path.join(AVATAR_DIR, fileName);
    await fs.writeFile(filePath, file.buffer);

    const baseUrl = process.env.AVATAR_BASE_URL || "/uploads/avatars";
    const avatarUrl = `${baseUrl}/${fileName}`;

    await ProfileRepository.updateAvatar(accountId, {
      avatarUrl,
      avatarType: "custom",
      avatarId: undefined,
    });

    return {
      avatarUrl,
      avatarType: "custom",
      thumbnails: {
        "64": `${baseUrl}/${baseName}_64.${ext}`,
        "256": `${baseUrl}/${baseName}_256.${ext}`,
        "512": avatarUrl,
      },
    };
  },

  async resetToPreset(accountId: string, avatarId: string): Promise<void> {
    await ProfileRepository.updateAvatar(accountId, {
      avatarId,
      avatarType: "preset",
      avatarUrl: undefined,
    });
  },

  async serveLocalFile(fileName: string): Promise<Buffer> {
    return fs.readFile(path.join(AVATAR_DIR, fileName));
  },
};
