const { app, BrowserWindow } = require("electron");
const path = require("path");
const fs = require("fs");
const http = require("http");

const isDev = !app.isPackaged;

let server;

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
          html = html.replace("<head>", "<head>" + fix);
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

async function createWindow() {
  let url;

  if (isDev) {
    url = "http://localhost:8081";
  } else {
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

  win.loadURL(url);

  // No post-load patches needed — reanimated fix is injected via server HTML.

  win.on("page-title-updated", (e) => {
    e.preventDefault();
  });
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (server) server.close();
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
