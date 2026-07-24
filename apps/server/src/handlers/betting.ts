import type { Socket } from "socket.io";
import { BetManager } from "../betting/BetManager";
import { DEPOSIT_TIMEOUT_MS } from "@checkker/shared";
import { CONTRACT_ADDRESS } from "../blockchain/config";
import { authenticatedSockets } from "./auth";

export function registerBettingHandlers(
  socket: Socket,
  pendingBets: Map<string, any>,
) {
  socket.on("deposit_submitted", ({ gameId, txHash }: { gameId?: string; txHash?: string }) => {
    if (!gameId || !txHash) return;
    const auth = authenticatedSockets.get(socket.id);
    if (!auth) return;
    BetManager.confirmDeposit(gameId, auth.userId, txHash).catch(() => {});
  });

  socket.on("request_deposit_status", ({ walletAddress }: { walletAddress?: string } = {}) => {
    const auth = authenticatedSockets.get(socket.id);
    const addr = (auth?.walletAddress ?? walletAddress ?? "").toLowerCase();
    if (!addr) return;
    for (const [gameId, pending] of pendingBets) {
      const isWhite = pending.white.walletAddress?.toLowerCase() === addr;
      const isBlack = pending.black.walletAddress?.toLowerCase() === addr;
      if (!isWhite && !isBlack) continue;
      if (isWhite) pending.white.socket = socket;
      if (isBlack) pending.black.socket = socket;
      socket.emit("awaiting_deposits", {
        gameId,
        betAmountWei: pending.betSetup.betAmountWei,
        betAmountUsd: pending.betSetup.betAmountUsd,
        contractAddress: CONTRACT_ADDRESS,
        timeoutMs: DEPOSIT_TIMEOUT_MS,
      });
      const mine = isWhite ? pending.whiteDeposited : pending.blackDeposited;
      const theirs = isWhite ? pending.blackDeposited : pending.whiteDeposited;
      if (mine) socket.emit("deposit_confirmed", { player: "self" });
      if (theirs) socket.emit("deposit_confirmed", { player: "opponent" });
      break;
    }
  });
}
