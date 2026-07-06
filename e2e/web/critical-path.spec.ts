import { test, expect } from "@playwright/test";
import { spawn, type ChildProcess } from "child_process";
import path from "path";

let server: ChildProcess | null = null;
let serverUrl: string | null = null;

async function startServer(): Promise<string> {
  const serverDir = path.resolve(__dirname, "../../apps/server");
  server = spawn("npx", ["tsx", "src/index.ts"], {
    cwd: serverDir,
    env: { ...process.env, NODE_ENV: "test", PORT: "3999" },
    stdio: "pipe",
    shell: true,
  });

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Server failed to start")), 30_000);

    server?.stdout?.on("data", (data: Buffer) => {
      const line = data.toString();
      const match = line.match(/__CHECKKER_PORT__=(\d+)/);
      if (match) {
        clearTimeout(timeout);
        resolve(`http://localhost:${match[1]}`);
      }
    });

    server?.stderr?.on("data", (data: Buffer) => {
      // eslint-disable-next-line no-console
      console.error(data.toString());
    });

    server?.on("error", reject);
  });
}

test.describe("critical path", () => {
  test.beforeAll(async () => {
    serverUrl = process.env.PLAYWRIGHT_BASE_URL ?? null;
    if (!serverUrl) {
      serverUrl = await startServer();
    }
  });

  test.afterAll(async () => {
    if (server) {
      server.kill();
      await new Promise((resolve) => server?.on("exit", resolve));
    }
  });

  test("play vs bot offline, make a move, and resign", async ({ page }) => {
    if (!serverUrl) throw new Error("No server URL available");

    await page.goto(serverUrl);

    // Navigate to the bot difficulty screen.
    await page.getByText("Play with AI and improve").click();
    await expect(page).toHaveURL(/\/bot\/difficulty/);

    // Select Beginner difficulty.
    await page.getByText("Beginner").first().click();
    await expect(page.getByText("Choose Opponent Style")).toBeVisible();

    // Use the offline shortcut so we don't depend on a socket connection.
    await page.getByText("Play offline (no connection needed)").click();
    await expect(page).toHaveURL(/\/offline/);

    // Wait for the game screen to render the board.
    await expect(page.locator('[data-testid="chess-board"]')).toBeVisible({ timeout: 15_000 });

    // Make a pawn move a2 -> a4.
    await page.locator('[data-testid="square-a2"]').first().click();
    await page.locator('[data-testid="square-a4"]').first().click();

    // Wait for the bot to respond (board state changes).
    await page.waitForTimeout(2_500);

    // Resign the game.
    await page.getByText("Resign").first().click();

    // Verify the game-over result appears.
    await expect(page.getByText(/resignation|winner|game over|you resigned/i).first()).toBeVisible({ timeout: 10_000 });
  });
});
