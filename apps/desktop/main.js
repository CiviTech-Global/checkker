const { app, BrowserWindow } = require("electron");
const path = require("path");
const fs = require("fs");
const http = require("http");
const { spawn } = require("child_process");

const isDev = !app.isPackaged;

const DEEP_LINK_PROTOCOL = "checkker";

let server;
let gameServerProcess = null;
let gameServerUrl = null;
let mainWindow = null;
let appBaseUrl = null;
let pendingDeepLink = null;

/**
 * Translate a checkker:// deep link into an in-app route and navigate to it.
 * e.g. checkker://join/1234 -> <base>/join/1234
 */
function handleDeepLink(rawUrl) {
  if (!rawUrl || !rawUrl.startsWith(`${DEEP_LINK_PROTOCOL}://`)) return;
  if (!mainWindow || !appBaseUrl) {
    pendingDeepLink = rawUrl;
    return;
  }
  try {
    const parsed = new URL(rawUrl);
    const route = `${parsed.host}${parsed.pathname}`.replace(/\/+$/, "");
    mainWindow.loadURL(`${appBaseUrl}/${route}${parsed.search}`);
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  } catch (err) {
    console.warn("[deep-link] failed to handle", rawUrl, err.message);
  }
}

/**
 * Auto-update scaffold. Uses electron-updater when available (NSIS builds
 * published to GitHub releases); silently no-ops for portable builds and
 * when the module isn't bundled.
 */
function setupAutoUpdater() {
  if (isDev || process.env.PORTABLE_EXECUTABLE_DIR) return;
  try {
    // @ts-ignore — optional module, only present in NSIS update builds.
    const { autoUpdater } = require("electron-updater");
    autoUpdater.on("error", (err) => {
      console.warn("[updater]", err.message);
    });
    autoUpdater.checkForUpdatesAndNotify();
  } catch {
    // electron-updater not packaged — updates handled manually.
  }
}

function startLocalServer(webDir) {
  const mime = {
    ".html": "text/html",
    ".js": "application/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".ttf": "font/ttf",
    ".ico": "image/x-icon",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".ogg": "audio/ogg",
  };

  return new Promise((resolve) => {
    server = http.createServer((req, res) => {
      let pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
      let filePath = path.join(webDir, pathname);

      // SPA fallback: serve index.html for routes that aren't real files
      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        filePath = path.join(webDir, "index.html");
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = mime[ext] || "application/octet-stream";

      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(404);
          res.end("Not found");
          return;
        }

        // Inject reanimated fix into HTML.
        // Reanimated's web entering animations set visibility:hidden on
        // Animated.View wrappers via cssText. On conditionally rendered
        // elements the CSS animation's onanimationstart callback sometimes
        // never fires, leaving wrappers stuck with visibility:hidden.
        // The CSS rule below forces interactive elements (tabindex=0) to
        // remain visible regardless of their parent's visibility. React
        // Navigation hides inactive screens via display:none (not
        // visibility), so this override is safe.
        if (contentType === "text/html") {
          let html = data.toString();
          const fix = `<style>[tabindex="0"]{visibility:visible!important}</style>`;
          const serverInject = gameServerUrl
            ? `<script>window.__CHECKKER_SERVER_URL__="${gameServerUrl}";</script>`
            : "";
          html = html.replace("<head>", "<head>" + fix + serverInject);
          res.writeHead(200, { "Content-Type": contentType });
          res.end(html);
          return;
        }

        res.writeHead(200, { "Content-Type": contentType });
        res.end(data);
      });
    });

    server.listen(0, "127.0.0.1", () => {
      resolve(server.address().port);
    });
  });
}

function startGameServer() {
  return new Promise((resolve) => {
    const bundlePath = path.join(process.resourcesPath, "server.bundle.js");
    if (!fs.existsSync(bundlePath)) {
      console.warn("Server bundle not found at", bundlePath);
      resolve(null);
      return;
    }

    // Use Electron's own Node runtime via ELECTRON_RUN_AS_NODE
    gameServerProcess = spawn(process.execPath, [bundlePath], {
      env: { ...process.env, PORT: "0", ELECTRON_RUN_AS_NODE: "1" },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let resolved = false;
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve(null);
      }
    }, 10000);

    gameServerProcess.stdout.on("data", (data) => {
      const output = data.toString();
      console.log("[game-server]", output.trim());
      const match = output.match(/__CHECKKER_PORT__=(\d+)/);
      if (match && !resolved) {
        resolved = true;
        clearTimeout(timeout);
        gameServerUrl = `http://127.0.0.1:${match[1]}`;
        resolve(gameServerUrl);
      }
    });

    gameServerProcess.stderr.on("data", (data) => {
      console.error("[game-server]", data.toString().trim());
    });

    gameServerProcess.on("error", (err) => {
      console.error("[game-server] spawn error:", err.message);
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        resolve(null);
      }
    });

    gameServerProcess.on("exit", (code) => {
      console.log("[game-server] exited with code", code);
      gameServerProcess = null;
    });
  });
}

async function createWindow() {
  let url;

  if (isDev) {
    url = "http://localhost:8081";
  } else {
    // Start the embedded game server first
    await startGameServer();

    const webDir = path.join(process.resourcesPath, "web");
    const port = await startLocalServer(webDir);
    url = `http://127.0.0.1:${port}`;
  }

  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "Checkker",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow = win;
  appBaseUrl = url;
  win.on("closed", () => {
    if (mainWindow === win) mainWindow = null;
  });

  win.loadURL(url);

  // No post-load patches needed — reanimated fix is injected via server HTML.

  win.on("page-title-updated", (e) => {
    e.preventDefault();
  });

  if (pendingDeepLink) {
    const link = pendingDeepLink;
    pendingDeepLink = null;
    handleDeepLink(link);
  }
}

// Single instance: deep links from the OS re-launch the exe; forward the
// URL to the running instance instead of opening a second window.
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", (_event, argv) => {
    const link = argv.find((a) => a.startsWith(`${DEEP_LINK_PROTOCOL}://`));
    if (link) handleDeepLink(link);
    else if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  // macOS delivers deep links via open-url instead of argv.
  app.on("open-url", (event, url) => {
    event.preventDefault();
    handleDeepLink(url);
  });

  if (!isDev) {
    app.setAsDefaultProtocolClient(DEEP_LINK_PROTOCOL);
  }

  app.whenReady().then(async () => {
    await createWindow();
    setupAutoUpdater();
    // Windows passes a deep link in argv on first launch.
    const link = process.argv.find((a) =>
      a.startsWith(`${DEEP_LINK_PROTOCOL}://`)
    );
    if (link) handleDeepLink(link);
  });
}

app.on("window-all-closed", () => {
  if (server) server.close();
  if (gameServerProcess) {
    gameServerProcess.kill();
    gameServerProcess = null;
  }
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
