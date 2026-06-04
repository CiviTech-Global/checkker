var WebSocket = require("ws");
var http = require("http");

http.get("http://localhost:9227/json", function(res) {
  var data = "";
  res.on("data", function(c) { data += c; });
  res.on("end", function() {
    var wsUrl = JSON.parse(data)[0].webSocketDebuggerUrl;
    var ws = new WebSocket(wsUrl);

    ws.on("open", function() {
      ws.send(JSON.stringify({id: 1, method: "Runtime.enable"}));

      setTimeout(function() {
        ws.send(JSON.stringify({id: 10, method: "Runtime.evaluate", params: {
          expression: "JSON.stringify({IntersectionObserver: typeof IntersectionObserver, MutationObserver: typeof MutationObserver, requestAnimationFrame: typeof requestAnimationFrame, WebAnimations: typeof Element.prototype.animate})"
        }}));
      }, 2000);

      // Check what reanimated's web config looks like
      setTimeout(function() {
        ws.send(JSON.stringify({id: 11, method: "Runtime.evaluate", params: {
          expression: "JSON.stringify({global_REANIMATED: typeof global !== 'undefined' && typeof global._WORKLET, rnReanimated: typeof _WORKLET})"
        }}));
      }, 2500);
    });

    ws.on("message", function(d) {
      var msg = JSON.parse(d);
      if (msg.id >= 10) {
        console.log("id" + msg.id + ":", msg.result.result.value || JSON.stringify(msg.result));
      }
    });

    setTimeout(function() { process.exit(0); }, 5000);
  });
});
