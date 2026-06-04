var WebSocket = require("ws");
var http = require("http");

http.get("http://localhost:9228/json", function(res) {
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

    function clickByText(text) {
      return evaluate("(function(){ var all=document.querySelectorAll('[tabindex]'); for(var i=0;i<all.length;i++){if(all[i].innerText.indexOf('"+text+"')!==-1 && window.getComputedStyle(all[i]).display !== 'none'){var el=all[i]; while(el.parentElement){var ps=window.getComputedStyle(el.parentElement); if(ps.display==='none'||ps.ariaHidden==='true') break; el=el.parentElement;} all[i].dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));all[i].dispatchEvent(new PointerEvent('pointerup',{bubbles:true}));all[i].click();return 'clicked: '+all[i].innerText.substring(0,30)}} return 'not found: "+text+"'})()");
    }

    ws.on("open", async function() {
      ws.send(JSON.stringify({id: 1, method: "Runtime.enable"}));
      await new Promise(function(r) { setTimeout(r, 3000); });

      // === TEST 1: Bot vs. Bot (Spectate) ===
      console.log("=== TEST: Watch Bot vs. Bot ===");
      var r = await clickByText("Watch Bot vs. Bot");
      console.log(r.value);
      await new Promise(function(r) { setTimeout(r, 2000); });

      r = await evaluate("window.location.pathname + ' | ' + document.getElementById('root').innerText.substring(0,80)");
      console.log("Screen:", r.value);

      // Pick White = Beginner
      console.log("--- Picking Beginner for White ---");
      r = await clickByText("Beginner");
      console.log(r.value);
      await new Promise(function(r) { setTimeout(r, 1500); });

      r = await evaluate("document.getElementById('root').innerText.substring(0,150)");
      console.log("After white pick:", r.value);

      // Check visibility of Black Bot cards
      console.log("--- Checking Black Bot card visibility ---");
      r = await evaluate("(function(){ var all=document.querySelectorAll('[tabindex]'); var cards=[]; for(var i=0;i<all.length;i++){var t=all[i].innerText; if(t.indexOf('Beginner')!==-1 || t.indexOf('Intermediate')!==-1 || t.indexOf('Advanced')!==-1 || t.indexOf('Master')!==-1){var s=window.getComputedStyle(all[i]); var vis='visible'; var p=all[i]; while(p){var ps=window.getComputedStyle(p); if(ps.visibility==='hidden'){vis='HIDDEN at '+p.tagName;break} if(ps.display==='none'){vis='DISPLAY_NONE at '+p.tagName;break} p=p.parentElement} cards.push(t.substring(0,15)+'... vis='+vis)}} return cards.join('\\n')})()");
      console.log("Cards:\n" + r.value);

      // Wait a bit more for the observer to fix visibility
      await new Promise(function(r) { setTimeout(r, 1000); });

      console.log("--- After 1s wait, re-checking ---");
      r = await evaluate("(function(){ var all=document.querySelectorAll('[tabindex]'); var cards=[]; for(var i=0;i<all.length;i++){var t=all[i].innerText; if(t.indexOf('Beginner')!==-1 || t.indexOf('Intermediate')!==-1 || t.indexOf('Advanced')!==-1 || t.indexOf('Master')!==-1){var vis='visible'; var p=all[i]; while(p){var ps=window.getComputedStyle(p); if(ps.visibility==='hidden'){vis='HIDDEN';break} if(ps.display==='none'){vis='DISPLAY_NONE';break} p=p.parentElement} cards.push(t.substring(0,15)+'... vis='+vis)}} return cards.join('\\n')})()");
      console.log("Cards:\n" + r.value);

      // Try clicking Beginner for Black
      console.log("--- Picking Beginner for Black ---");
      r = await clickByText("Beginner");
      console.log(r.value);
      await new Promise(function(r) { setTimeout(r, 1500); });

      r = await evaluate("document.getElementById('root').innerText.substring(0,150)");
      console.log("After black pick:", r.value);

      process.exit(0);
    });
  });
});
