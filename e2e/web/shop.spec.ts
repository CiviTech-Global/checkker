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

test.describe("shop screenshots", () => {
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

  test("capture shop page screenshot", async ({ page }) => {
    if (!serverUrl) throw new Error("No server URL available");
    await page.goto(`${serverUrl}/shop`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2_000);
    await page.screenshot({ path: "/Users/arwinjohnson/Applications/External_Projects/checkker/docs/screenshots/shop.png", fullPage: true });
  });
});
