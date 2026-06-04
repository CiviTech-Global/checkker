const { app, BrowserWindow, protocol, net } = require("electron");
const path = require("path");
const fs = require("fs");

const isDev = !app.isPackaged;

// Register a custom scheme that behaves like https (allows fetch, modules, etc.)
protocol.registerSchemesAsPrivileged([
  { scheme: "app", privileges: { standard: true, secure: true, supportFetchAPI: true } },
]);

function createWindow() {
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

  if (isDev) {
    win.loadURL("http://localhost:8081");
  } else {
    const webDir = path.join(process.resourcesPath, "web");

    // Serve all app content through app:// scheme so absolute paths like
    // /_expo/... resolve correctly against the scheme root.
    protocol.handle("app", (request) => {
      const url = new URL(request.url);
      const pathname = decodeURIComponent(url.pathname);
      let filePath = path.join(webDir, pathname);

      // Serve index.html for SPA routes (anything that isn't a real file)
      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        filePath = path.join(webDir, "index.html");
      }

      return net.fetch("file://" + filePath);
    });

    // Load root "/" so Expo Router sees pathname "/" and matches the index route
    win.loadURL("app://checkker/");
  }

  win.on("page-title-updated", (e) => {
    e.preventDefault();
  });
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
