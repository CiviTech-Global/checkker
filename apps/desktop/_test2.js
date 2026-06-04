var WebSocket = require("ws");
var http = require("http");

http.get("http://localhost:9226/json", function(res) {
  var data = "";
  res.on("data", function(c) { data += c; });
  res.on("end", function() {
    var wsUrl = JSON.parse(data)[0].webSocketDebuggerUrl;
    var ws = new WebSocket(wsUrl);
    var nextId = 10;

    function evaluate(expr) {
      var myId = nextId++;
      return new Promise(function(resolve) {
        var handler = function(d) {
          var msg = JSON.parse(d);
          if (msg.id === myId) {
            ws.removeListener("message", handler);
            resolve(msg.result.result);
          }
        };
        ws.on("message", handler);
        ws.send(JSON.stringify({id: myId, method: "Runtime.evaluate", params: {expression: expr}}));
      });
    }

    ws.on("open", async function() {
      ws.send(JSON.stringify({id: 1, method: "Runtime.enable"}));

      ws.on("message", function(d) {
        var msg = JSON.parse(d);
        if (msg.method === "Runtime.exceptionThrown") {
          console.log("EXCEPTION:", msg.params.exceptionDetails.exception.description.substring(0, 200));
        }
      });

      await new Promise(function(r) { setTimeout(r, 2000); });

      // Navigate to spectate
      console.log("--- Navigating to /spectate ---");
      var r = await evaluate("(function(){ var all=document.querySelectorAll('[tabindex]'); for(var i=0;i<all.length;i++){if(all[i].innerText.indexOf('Watch Bot vs. Bot')!==-1){all[i].dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));all[i].dispatchEvent(new PointerEvent('pointerup',{bubbles:true}));all[i].click();return 'clicked'}} return 'not found'})()");
      console.log("Click result:", r.value);

      await new Promise(function(r) { setTimeout(r, 2000); });

      // Verify we're on spectate
      r = await evaluate("window.location.pathname + ' | ' + document.getElementById('root').innerText.substring(0,100)");
      console.log("After nav:", r.value);

      // Click "Beginner" (first difficulty for white)
      console.log("--- Clicking Beginner for White ---");
      r = await evaluate("(function(){ var all=document.querySelectorAll('[tabindex]'); for(var i=0;i<all.length;i++){if(all[i].innerText.indexOf('Beginner')!==-1 && all[i].innerText.indexOf('For new')!==-1){all[i].dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));all[i].dispatchEvent(new PointerEvent('pointerup',{bubbles:true}));all[i].click();return 'clicked: '+all[i].innerText.substring(0,30)}} return 'not found'})()");
      console.log("Click result:", r.value);

      await new Promise(function(r) { setTimeout(r, 2000); });

      // Check step 2
      r = await evaluate("document.getElementById('root').innerText.substring(0,200)");
      console.log("After white pick:", r.value);

      // Now check ALL elements with their pointer-events and z-index
      console.log("--- Checking pointer-events on Black Bot cards ---");
      r = await evaluate("(function(){ var all=document.querySelectorAll('[tabindex]'); var info=[]; for(var i=0;i<all.length;i++){var s=window.getComputedStyle(all[i]); info.push({text:all[i].innerText.substring(0,20),pe:s.pointerEvents,opacity:s.opacity,zIndex:s.zIndex,vis:s.visibility,display:s.display,cursor:s.cursor})} return JSON.stringify(info)})()");
      console.log("Tabindex elements:", r.value);

      // Check if Animated.View parents have pointer-events: none
      r = await evaluate("(function(){ var all=document.querySelectorAll('[tabindex]'); var info=[]; for(var i=0;i<all.length;i++){var el=all[i]; var chain=[]; var p=el; while(p&&p!==document.body){var s=window.getComputedStyle(p); if(s.pointerEvents==='none'||s.visibility==='hidden'||s.display==='none'){chain.push({tag:p.tagName,pe:s.pointerEvents,vis:s.visibility,disp:s.display,text:p.innerText.substring(0,15)})} p=p.parentElement} if(chain.length>0) info.push({btn:el.innerText.substring(0,20),blockers:chain})} return JSON.stringify(info)})()");
      console.log("Blocked elements:", r.value);

      process.exit(0);
    });
  });
});
