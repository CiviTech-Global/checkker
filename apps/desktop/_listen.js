var WebSocket = require("ws");
var http = require("http");
var PORT = 9231;

http.get("http://localhost:" + PORT + "/json", function(res) {
  var data = "";
  res.on("data", function(c) { data += c; });
  res.on("end", function() {
    var pages = JSON.parse(data);
    var wsUrl = pages[0].webSocketDebuggerUrl;
    var ws = new WebSocket(wsUrl);
    ws.on("open", function() {
      ws.send(JSON.stringify({id:1, method:"Runtime.enable"}));
      ws.send(JSON.stringify({id:2, method:"Console.enable"}));
      ws.send(JSON.stringify({id:3, method:"Log.enable"}));
      console.log("Connected. Listening for console messages...");
      console.log("Click buttons in the app now. Capturing for 90 seconds.\n");
    });
    ws.on("message", function(d) {
      var msg = JSON.parse(d);
      if (msg.method === "Runtime.consoleAPICalled") {
        var args = msg.params.args.map(function(a) {
          return a.value !== undefined ? a.value : (a.description || a.type);
        }).join(" ");
        // Show all console logs that contain our markers
        if (args.indexOf("[") === 0 || args.indexOf("SPECTATE") >= 0 || args.indexOf("BOT") >= 0 || args.indexOf("CARD") >= 0) {
          console.log("[" + msg.params.type.toUpperCase() + "]", args);
        }
      }
      if (msg.method === "Runtime.exceptionThrown") {
        var desc = msg.params.exceptionDetails.exception
          ? msg.params.exceptionDetails.exception.description
          : msg.params.exceptionDetails.text;
        console.log("[EXCEPTION]", (desc || "unknown").substring(0, 400));
      }
    });
    setTimeout(function() {
      console.log("\nDone capturing.");
      process.exit(0);
    }, 90000);
  });
}).on("error", function(e) {
  console.log("Cannot connect. Is the app running with --remote-debugging-port=" + PORT + "?");
  process.exit(1);
});
