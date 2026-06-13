const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

// On web, alias @walletconnect/ethereum-provider to a lightweight stub.
//
// The real package lazily pulls in @reown/appkit, whose internal packages only
// expose entry points via package.json "exports" subpaths that Metro's web
// resolver can't follow — bundling them produces an unresolved-module error (or,
// if package-exports is force-enabled globally, breaks React Native's own web
// resolution and renders a blank screen). Web doesn't need WalletConnect's QR
// flow: it uses the injected provider (MetaMask extension / wallet in-app
// browser). Native builds keep the real package.
const webWalletConnectStub = path.resolve(
  __dirname,
  "src/shims/walletconnect-web-stub.js"
);

const defaultResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === "web" && moduleName === "@walletconnect/ethereum-provider") {
    return { type: "sourceFile", filePath: webWalletConnectStub };
  }
  return defaultResolveRequest
    ? defaultResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
