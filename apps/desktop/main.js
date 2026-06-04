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

  // Fix react-native-reanimated entering animations on web.
  // Reanimated sets visibility:hidden on mount and relies on Web Animations API
  // to transition to visible. In some cases (conditionally rendered elements),
  // the animation callback never fires and elements stay invisible.
  // This observer detects stuck hidden elements and forces them visible.
  win.webContents.on("did-finish-load", () => {
    win.webContents.executeJavaScript(`
      (function() {
        var observer = new MutationObserver(function(mutations) {
          mutations.forEach(function(m) {
            if (m.type === 'attributes' && m.attributeName === 'style') {
              var el = m.target;
              if (el.style.visibility === 'hidden' && el.getAttribute('data-reanimated')) {
                setTimeout(function() {
                  if (el.style.visibility === 'hidden') el.style.visibility = 'visible';
                }, 500);
              }
            }
            // Also catch newly added nodes with visibility:hidden
            m.addedNodes.forEach(function(node) {
              if (node.nodeType === 1) {
                var hidden = node.querySelectorAll ? node.querySelectorAll('[style*="visibility"]') : [];
                hidden.forEach(function(h) {
                  setTimeout(function() {
                    if (h.style.visibility === 'hidden') h.style.visibility = 'visible';
                  }, 600);
                });
                if (node.style && node.style.visibility === 'hidden') {
                  setTimeout(function() {
                    if (node.style.visibility === 'hidden') node.style.visibility = 'visible';
                  }, 600);
                }
              }
            });
          });
        });
        observer.observe(document.getElementById('root'), {
          attributes: true,
          attributeFilter: ['style'],
          childList: true,
          subtree: true
        });
      })();
    `);
  });

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
