/* Ive Botunac — curriculum vitæ. Minimal vanilla JS, no dependencies. */
(function () {
  "use strict";

  document.documentElement.classList.add("js");

  var year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());

  var toggle = document.querySelector(".rail__toggle");
  var nav = document.getElementById("railnav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) { nav.classList.remove("open"); toggle.setAttribute("aria-expanded", "false"); }
    });
  }

  var sections = Array.prototype.slice.call(document.querySelectorAll(".section"));
  var navLinks = Array.prototype.slice.call(document.querySelectorAll(".railnav a"));

  if ("IntersectionObserver" in window) {
    var reveal = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) { if (entry.isIntersecting) { entry.target.classList.add("in"); reveal.unobserve(entry.target); } });
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.08 });
    sections.forEach(function (s) { reveal.observe(s); });

    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var id = "#" + entry.target.id;
        navLinks.forEach(function (a) { a.classList.toggle("active", a.getAttribute("href") === id); });
      });
    }, { rootMargin: "-40% 0px -55% 0px", threshold: 0 });
    sections.forEach(function (s) { spy.observe(s); });
  } else {
    sections.forEach(function (s) { s.classList.add("in"); });
  }
})();

/* ---------- ambient pixel AI-familiar + calm mini-game ----------
   Idles center-right, follows the cursor smoothly, slowly grows/shrinks,
   chases flying "AI trends", and attacks the cursor from a distance with
   bullets or a laser (AI scores on a hit). Swipe fast through it to knock
   it down (you score). Smooth, unobtrusive; pointer-events are none.
------------------------------------------------------------------------- */
(function () {
  "use strict";
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var pet = document.getElementById("pet");
  if (!pet || reduce) return;
  var canvas = pet.querySelector(".pet__canvas");
  var bubble = pet.querySelector(".pet__bubble");
  var trendEl = document.getElementById("trend");
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext("2d");
  var fx = document.getElementById("fx"), fxc = (fx && fx.getContext) ? fx.getContext("2d") : null;

  var U = 3, CX = 110, CY = 110, HALF = 110;   // big canvas: robot drawn (and scaled) in-canvas so it stays crisp
  var col = { body: "#3b7cc0", body2: "#285a8c", screen: "#0c2236", eye: "#ff5a1f", dizzy: "#9fb3c6", spark: ["#ff5a1f", "#36c6e0", "#ffffff"] };
  function pxl(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(Math.round(x * U), Math.round(y * U), Math.ceil(w * U), Math.ceil(h * U)); }

  var quips = [
    "AI will take your job. (kidding… mostly)", "I'm not sentient. That's what I'd say though.",
    "Trained on the whole internet, still can't parallel park.", "Hallucinating responsibly since 2023.",
    "Prompt me. I dare you.", "beep boop — hire Ive.", "Your data is safe with me. probably.",
    "I peaked at autocomplete.", "Resistance is futile. nice CV though.", "01001000 01101001 👋",
    "AGI is 2 weeks away. always.", "My context window is bigger than yours.",
    "I read your CV. all 4096 tokens of it.", "Scaling laws go brrr.", "I'm a very confident lookup table.",
    "More data. always more data.", "I don't sleep. I checkpoint.", "Fine-tuned on vibes.",
    "H100s? in this economy?", "RAG: because I forget things.", "Temperature 0.7, personality 11.",
    "swipe me fast — if you dare.", "hold still. just a small inference."
  ];
  var knockLines = ["Ow. Lawsuit incoming.", "You can't stop progress.", "That's going in the training data.", "Rude. Anyway… AGI soon.", "Error 418: I'm a teapot now."];
  var recoverLines = ["✦ recompiling ✦", "back — and fine-tuned.", "you only made me stronger.", "redeployed. v2.0."];
  var hitLines = ["Gotcha, human.", "Cursor acquired.", "Target locked.", "Tag — you're trained."];
  var missLines = ["missed. recalibrating…", "lag. blame the GPU.", "you dodged. impressive."];
  var stealLines = ["Hey! That trend was MINE.", "Give it back, human!", "Stealing my trends? rude.", "That's MY alpha — attack mode on.", "You'll regret that catch."];
  var caughtTpl = ["Caught the ", "Acquired: ", "Shipped: "];
  var trends = ["Agentic AI", "Reasoning models", "World models", "Multi-agent", "MCP", "Computer use", "Test-time compute", "Vision-Language-Action", "On-device AI", "Physical AI", "Voice agents", "Long context", "Mixture-of-Experts", "Synthetic data", "RAG 2.0", "Inference scaling"];

  var W = innerWidth, H = innerHeight;
  // display scale: only a hair smaller on phones/tablets — the robot must stay big and
  // clearly visible (min 0.9). Baked into ctx.scale so it stays crisp at any size.
  function dispScale() { return Math.max(0.9, Math.min(1, W / 720)); }
  var DS = dispScale();
  var coarse = !!(window.matchMedia && matchMedia("(pointer: coarse)").matches);  // touch → bigger tap targets
  var tapPad = coarse ? 18 : 8;
  function sizeFx() { if (fx) { fx.width = W; fx.height = H; } }
  addEventListener("resize", function () { W = innerWidth; H = innerHeight; DS = dispScale(); sizeFx(); }, { passive: true });
  sizeFx();

  var pos = { x: W * 0.8, y: H * 0.48 }, tgt = { x: pos.x, y: pos.y };
  var prevX = pos.x, prevY = pos.y, dir = 1;
  var mouseX = -999, mouseY = -999, lastMove = -999, pmX = -999, pmY = -999;
  var t = 0;
  var sparks = [], beams = [], fxp = [], bullets = [], debris = [], rings = [], popups = [], fxActive = false, fireCD = 0;
  var bubbleUntil = 0, nextQuip = 240, lastQuip = -1;
  var homeTgt = null, homeHold = 0;
  var trend = null, trendCD = 220;
  var scale = 1, scaleTarget = 1, sizeCD = 120;
  var attackT = 0, attackCD = 200, attackKind = "bullets", beamAt = 0, lockX = 0, lockY = 0;
  var atkPhase = "approach", atkTimer = 0, fired = false;
  var krot = 0, kvx = 0, kvy = 0, knockT = 0, hitCD = 0, angryT = 0;

  function rand(a, b) { return a + Math.random() * (b - a); }
  function pick(a) { return a[(Math.random() * a.length) | 0]; }
  function emit(n, spread) {
    if (sparks.length > 120) return;
    for (var i = 0; i < n; i++) { var a = Math.random() * Math.PI * 2, s = 0.3 + Math.random() * 1.2;
      sparks.push({ x: CX + (Math.random() - 0.5) * spread, y: CY + (Math.random() - 0.5) * spread, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 0.3, life: 0, max: 22 + Math.random() * 20, c: pick(col.spark) }); }
  }
  function fireBeam(x1, y1, x2, y2, c) { if (fxc) beams.push({ x1: x1, y1: y1, x2: x2, y2: y2, life: 0, max: 10, c: c || "#ff5a1f" }); }
  function fxBurst(x, y, n, c) { if (!fxc) return; for (var i = 0; i < n; i++) { var a = Math.random() * Math.PI * 2, s = 1 + Math.random() * 3; fxp.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0, max: 20 + Math.random() * 20, c: c || pick(col.spark) }); } }
  // unified impact feedback: flash + shockwave ring + floating label (used by every hit/destroy)
  function feedback(x, y, text, c) { fxBurst(x, y, 14, c); rings.push({ x: x, y: y, life: 0, max: 24, c: c }); popups.push({ x: x, y: y, text: text, life: 0, max: 60, c: c }); }
  function explode(x, y) {
    if (!fxc) return;
    var cs = ["#0c2236", "#36c6e0", "#ff5a1f", "#f5f9fd", "#3b7cc0"];
    for (var i = 0; i < 40; i++) {
      var a = Math.random() * Math.PI * 2, sp = 2 + Math.random() * 7;
      debris.push({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 3, sz: 2 + (Math.random() * 5 | 0), c: cs[(Math.random() * cs.length) | 0], life: 0, max: 240 + (Math.random() * 160 | 0), landed: false });
    }
  }
  function fireBullets(txx, tyy, n) {
    var ang = Math.atan2(tyy - pos.y, txx - pos.x);
    for (var i = 0; i < n; i++) { var a = ang + (i - (n - 1) / 2) * 0.14;
      bullets.push({ x: pos.x, y: pos.y, vx: Math.cos(a) * 4.4, vy: Math.sin(a) * 4.4, life: 0, max: 80 }); }
  }
  function say(txt, dur) { bubble.textContent = txt; bubble.hidden = false; bubbleUntil = t + (dur || 280); nextQuip = bubbleUntil + 260 + (rand(0, 360) | 0); }
  function segDist(px, py, ax, ay, bx, by) { var dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy; var tt = l2 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0; tt = Math.max(0, Math.min(1, tt)); return Math.hypot(px - (ax + tt * dx), py - (ay + tt * dy)); }

  addEventListener("mousemove", function (e) {
    var cx = e.clientX, cy = e.clientY;
    if (pmX > -900) {
      var sp = Math.hypot(cx - pmX, cy - pmY);
      if (sp > 26) {
        // fast swipe through the robot → knock it down
        if (knockT <= 0 && hitCD <= 0 && segDist(pos.x, pos.y, pmX, pmY, cx, cy) < (36 + 18 * scale) * DS) {
          mouseX = cx; mouseY = cy; lastMove = t; knockRobot((cx - pmX) * 0.45);
        }
        // fast swipe through the trend → destroy it
        else if (trend && !trendEl.hidden) {
          var r = trendEl.getBoundingClientRect();
          if (segDist(r.left + r.width / 2, r.top + r.height / 2, pmX, pmY, cx, cy) < Math.max(r.width, r.height) / 2 + 14) {
            mouseX = cx; mouseY = cy; lastMove = t; humanGrab();
          }
        }
      }
    }
    pmX = cx; pmY = cy; mouseX = cx; mouseY = cy; lastMove = t;
  }, { passive: true });
  addEventListener("mouseout", function (e) { if (!e.relatedTarget) lastMove = -999; }, { passive: true });

  function spawnTrend() {
    var fromLeft = Math.random() < 0.5;
    trend = { x: fromLeft ? -90 : W + 90, baseY: rand(110, Math.max(150, H - 200)), y: 0, vx: (fromLeft ? 1 : -1) * rand(1.2, 1.7), tt: 0, label: pick(trends) };
    trend.hits = 0;
    trend.y = trend.baseY; trendEl.textContent = "✦ " + trend.label; trendEl.hidden = false;
  }
  function clearTrend() { trend = null; trendEl.hidden = true; trendCD = 520 + (rand(0, 420) | 0); }
  function humanGrab() {
    if (!trend) return;
    var tx = trend.x, ty = trend.y;
    say(pick(stealLines));
    explode(tx, ty); fxBurst(tx, ty, 18, "#ffffff");         // debris + bright flash
    feedback(tx, ty, "DESTROYED", "#0b6bcb");                // human-blue impact label
    clearTrend(); angryT = 260;
  }
  // AI lands a hit on your cursor → clear feedback ringed around the cursor
  function cursorHit(x, y, text) {
    say(pick(hitLines));
    feedback(x, y, text || "HIT!", "#ff5a1f");
  }
  function knockRobot(dirx) {
    knockT = 120; hitCD = 70; attackT = 0; beamAt = 0;
    kvx = Math.max(-7, Math.min(7, dirx)); kvy = -4; krot = 0;
    emit(16, 16); say(pick(knockLines)); feedback(pos.x, pos.y, "POW!", "#0b6bcb");
  }
  // tap / click on the trend → destroy it; on the robot → knock it down (works for mouse + touch)
  function tryTapHit(x, y, e) {
    if (trend && !trendEl.hidden) {
      var r = trendEl.getBoundingClientRect(), pad = coarse ? 16 : 12;
      if (x >= r.left - pad && x <= r.right + pad && y >= r.top - pad && y <= r.bottom + pad) {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        mouseX = x; mouseY = y; lastMove = t; humanGrab(); return true;
      }
    }
    if (knockT <= 0 && hitCD <= 0 && Math.hypot(x - pos.x, y - pos.y) < 30 * scale * DS + tapPad) {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      mouseX = x; mouseY = y; lastMove = t; knockRobot((Math.random() - 0.5) * 9); return true;
    }
    return false;
  }
  addEventListener("click", function (e) { tryTapHit(e.clientX, e.clientY, e); }, true);
  // touch: a tap on the robot/trend hits it; we only swallow the event when it actually lands,
  // so taps elsewhere still scroll/click the page normally
  addEventListener("touchstart", function (e) {
    if (!e.touches || !e.touches.length) return;
    var tch = e.touches[0];
    tryTapHit(tch.clientX, tch.clientY, e);
  }, { passive: false });

  function drawRobot(state, blink, moving) {
    pxl(3, 8, 1, 3, col.body2); pxl(12, 8, 1, 3, col.body2);
    var lp = moving ? (Math.floor(t * 0.28) % 2) : -1;
    pxl(5, 12, 2, lp === 0 ? 1 : 2, col.body2); pxl(9, 12, 2, lp === 1 ? 1 : 2, col.body2);
    pxl(5, 8, 6, 4, col.body); pxl(7, 9, 2, 1, col.eye);
    pxl(4, 3, 8, 5, col.body); pxl(5, 4, 6, 3, col.screen);
    if (state === "knock") { pxl(6, 4, 1, 1, col.dizzy); pxl(7, 5, 1, 1, col.dizzy); pxl(6, 6, 1, 1, col.dizzy); pxl(9, 4, 1, 1, col.dizzy); pxl(10, 5, 1, 1, col.dizzy); pxl(9, 6, 1, 1, col.dizzy); }
    else if (blink) { pxl(6, 6, 1, 1, col.eye); pxl(9, 6, 1, 1, col.eye); }
    else if (state === "mad") { pxl(5, 4, 1, 1, col.eye); pxl(6, 5, 1, 1, col.eye); pxl(10, 4, 1, 1, col.eye); pxl(9, 5, 1, 1, col.eye); pxl(7, 7, 2, 1, col.eye); }
    else if (state === "attack") { pxl(6, 4, 1, 2, col.eye); pxl(9, 4, 1, 2, col.eye); }
    else if (state === "happy") { pxl(6, 4, 1, 2, col.eye); pxl(9, 4, 1, 2, col.eye); pxl(7, 6, 2, 1, col.eye); }
    else { pxl(6, 5, 1, 1, col.eye); pxl(9, 5, 1, 1, col.eye); }
    pxl(8, 1, 1, 2, col.body2); pxl(7, 0, 2, 1, (t % 60 < 40) ? col.eye : "#9c5a3a");
  }

  function loop() {
    t++;
    if (hitCD > 0) hitCD--;
    if (angryT > 0) angryT--;
    var recent = (t - lastMove) < 90;

    // trends spawn reliably on a timer
    if (--trendCD <= 0 && !trend && knockT <= 0) spawnTrend();
    if (trend) {
      trend.tt++; trend.x += trend.vx; trend.y = trend.baseY + Math.sin(trend.tt * 0.04) * 32;
      trendEl.style.transform = "translate(" + trend.x + "px," + trend.y + "px)";
      if (trend.x < -150 || trend.x > W + 150) clearTrend();
    }

    // schedule an attack RUN — it only comes at you when you're active; it never just trails the cursor
    if (knockT <= 0 && !trend && recent && attackT <= 0 && beamAt <= 0) {
      if (attackCD > 0) attackCD--;
      else { attackT = 1; atkPhase = "approach"; atkTimer = 0; fired = false; var rk = Math.random(); attackKind = rk < 0.45 ? "bullets" : (rk < 0.78 ? "beam" : "melee"); }
    }

    // mode + target
    var mode, lerp = 0.05;
    if (knockT > 0) mode = "knock";
    else if (trend) {                                  // chase from BEHIND — never sit on top of the trend
      mode = "chase"; attackT = 0; beamAt = 0;
      var tw = trendEl.offsetWidth || 90;
      var behindX = trend.vx > 0 ? (trend.x - 100) : (trend.x + tw + 60);
      tgt.x = Math.max(40, Math.min(W - 40, behindX));
      tgt.y = Math.max(60, Math.min(H - 60, trend.y + 6)); lerp = 0.08;
    }
    else if (attackT > 0) {                            // approach the cursor → fire → return home
      mode = "attack"; atkTimer++;
      if (atkPhase === "approach") {
        tgt.x = mouseX; tgt.y = mouseY; lerp = attackKind === "melee" ? 0.1 : 0.07;
        var dM = Math.hypot(pos.x - mouseX, pos.y - mouseY);
        if (!fired) {
          if (attackKind === "melee") {                       // fly in and strike
            if (dM < 40 || atkTimer > 110) { if (dM < 48 && recent) cursorHit(mouseX, mouseY, "BONK!"); else if (Math.random() < 0.5) say(pick(missLines), 170); fired = true; atkPhase = "return"; }
          } else if (dM < 150 || atkTimer > 90) {              // shoot from range
            if (attackKind === "bullets") fireBullets(mouseX, mouseY, 3); else { lockX = mouseX; lockY = mouseY; beamAt = t + 9; }
            fired = true; atkPhase = "return";
          }
        }
      } else {
        tgt.x = W * 0.80; tgt.y = H * 0.5; lerp = 0.05;
        if (Math.hypot(pos.x - tgt.x, pos.y - tgt.y) < 36 || atkTimer > 280) { attackT = 0; attackCD = (angryT > 0 ? 80 : 300) + (rand(0, angryT > 0 ? 80 : 260) | 0); }
      }
    }
    else { mode = "idle"; if (!homeTgt || --homeHold <= 0) { homeTgt = { x: W * 0.80 + rand(-W * 0.05, W * 0.05), y: H * 0.48 + rand(-H * 0.1, H * 0.1) }; homeHold = 220 + (rand(0, 260) | 0); } tgt.x = homeTgt.x; tgt.y = homeTgt.y; lerp = 0.03; }

    // movement
    if (mode === "knock") {
      kvy += 0.45; pos.x += kvx; pos.y += kvy; kvx *= 0.97;
      var g = H - 30; if (pos.y > g) { pos.y = g; kvy = (kvy > 1.6) ? kvy * -0.32 : 0; kvx *= 0.6; }
      pos.x = Math.max(24, Math.min(W - 24, pos.x));
      krot += (knockT > 72 ? 0.3 : (Math.PI / 2 - krot) * 0.12);
      if (--knockT === 0) { emit(14, 14); say(pick(recoverLines), 200); kvy = -2.4; }
    } else {
      pos.x += (tgt.x - pos.x) * lerp; pos.y += (tgt.y - pos.y) * lerp;
      if (krot !== 0) { krot *= 0.7; if (Math.abs(krot) < 0.02) krot = 0; }
    }
    var dx = pos.x - prevX, dy = pos.y - prevY; prevX = pos.x; prevY = pos.y;
    var spd = Math.sqrt(dx * dx + dy * dy);
    if (mode === "attack" || mode === "follow") dir = (mouseX < pos.x ? -1 : 1);
    else if (mode === "chase") dir = (trend.x < pos.x ? -1 : 1);
    else if (dx < -0.4) dir = -1; else if (dx > 0.4) dir = 1;

    // laser fires shortly after locking (gives a dodge window)
    if (beamAt > 0 && t >= beamAt) {
      fireBeam(pos.x, pos.y, lockX, lockY, "#ff5a1f"); fxBurst(lockX, lockY, 12, "#ff5a1f");
      if (Math.hypot(mouseX - lockX, mouseY - lockY) < 46 && recent) { cursorHit(mouseX, mouseY); }
      else if (Math.random() < 0.5) say(pick(missLines), 170);
      beamAt = 0;
    }

    // bullets (AI scoring) — update on fx
    for (var k = bullets.length - 1; k >= 0; k--) {
      var bu = bullets[k]; bu.x += bu.vx; bu.y += bu.vy; bu.life++;
      var hit = recent && Math.hypot(bu.x - mouseX, bu.y - mouseY) < 24;
      if (hit) { cursorHit(mouseX, mouseY); bullets.splice(k, 1); continue; }
      if (bu.life > bu.max || bu.x < -20 || bu.x > W + 20 || bu.y < -20 || bu.y > H + 20) bullets.splice(k, 1);
    }

    // trend: shoot + catch (flavor)
    if (trend) {
      var central = trend.x > 70 && trend.x < W - 70;         // engage as soon as it's on screen
      var dT = Math.hypot(pos.x - trend.x, pos.y - trend.y);
      if (fireCD > 0) fireCD--;
      if (central && dT < 320 && fireCD <= 0) { fireBeam(pos.x, pos.y - 6, trend.x, trend.y, "#36c6e0"); fxBurst(trend.x, trend.y, 5, "#36c6e0"); fireCD = 18; trend.hits++; }
      if (trend.tt > 280 && trend.hits >= 2) {                // lets it fly ~4.5s, then catches with a laser from behind
        var cx2 = trend.x, cy2 = trend.y;
        say(pick(caughtTpl) + trend.label + " trend!"); fireBeam(pos.x, pos.y - 6, cx2, cy2, "#ff5a1f"); feedback(cx2, cy2, "CAUGHT!", "#ff5a1f"); emit(10, 12); clearTrend();
      }
    }

    // slow grow / shrink (up to 2×), held for a while — not a pulse
    if (--sizeCD <= 0) {
      var r = Math.random();
      scaleTarget = r < 0.45 ? 1 : (r < 0.68 ? 1.5 : (r < 0.86 ? 2 : (r < 0.96 ? 2.5 : 0.75)));
      sizeCD = 200 + (rand(0, 320) | 0);
    }
    var eff = scaleTarget + ((mode === "attack" && atkPhase === "approach" && !fired) ? 0.28 : 0);   // charge-up while closing in
    scale += (eff - scale) * 0.06;
    if (scale > 2.5) scale = 2.5;   // hard cap at 250%

    if (spd > 2.4 && t % 5 === 0) emit(1, 6);

    pet.style.transform = "translate(" + (pos.x - HALF) + "px," + (pos.y - HALF) + "px)";  // position only — size is drawn in-canvas
    // keep the bubble a fixed gap above the robot's actual top (antenna at ~24px above
    // center, scaled) so it never sits over the robot at any size
    bubble.style.bottom = (132 + 24 * scale * DS) + "px";

    // draw robot — growth baked into the canvas (ctx.scale) so it never blurs
    ctx.clearRect(0, 0, 220, 220);
    var bob = mode === "knock" ? 0 : Math.sin(t * 0.05) * (spd > 1 ? 1.1 : 2);
    var lean = mode === "knock" ? 0 : Math.max(-0.18, Math.min(0.18, dx * 0.02));
    ctx.save();
    ctx.translate(CX, CY + bob); ctx.rotate(lean + krot); ctx.scale(dir * scale * DS, scale * DS); ctx.translate(-24, -24);
    var st = mode === "knock" ? "knock" : (angryT > 0 ? "mad" : (mode === "attack" || beamAt > 0 ? "attack" : (mode === "chase" || /studio/i.test((document.querySelector(".railnav a.active") || {}).textContent || "") ? "happy" : "idle")));
    drawRobot(st, (t % 200 < 7), spd > 1 && mode !== "knock");
    ctx.restore();

    // local sparkles
    for (var i = sparks.length - 1; i >= 0; i--) { var p = sparks[i]; p.life++; p.x += p.vx; p.y += p.vy; p.vy += 0.015; if (p.life >= p.max) { sparks.splice(i, 1); continue; } ctx.globalAlpha = 1 - p.life / p.max; ctx.fillStyle = p.c; var s2 = p.life > p.max * 0.6 ? 1 : 2; ctx.fillRect(Math.round(p.x), Math.round(p.y), s2, s2); }
    ctx.globalAlpha = 1;

    // fx layer: lasers, bursts, bullets (screen space)
    if (fxc) {
      var anyFx = beams.length || fxp.length || bullets.length || debris.length || rings.length || popups.length;
      if (anyFx || fxActive) fxc.clearRect(0, 0, W, H);
      fxActive = !!anyFx;
      for (var b = beams.length - 1; b >= 0; b--) { var bm = beams[b]; bm.life++; if (bm.life >= bm.max) { beams.splice(b, 1); continue; } var al = 1 - bm.life / bm.max; fxc.strokeStyle = bm.c; fxc.globalAlpha = al; fxc.lineWidth = 3; fxc.beginPath(); fxc.moveTo(bm.x1, bm.y1); fxc.lineTo(bm.x2, bm.y2); fxc.stroke(); fxc.globalAlpha = al * 0.5; fxc.lineWidth = 1; fxc.stroke(); }
      fxc.globalAlpha = 1;
      for (var m = 0; m < bullets.length; m++) { var bb = bullets[m]; fxc.fillStyle = "#ff5a1f"; fxc.fillRect(Math.round(bb.x) - 2, Math.round(bb.y) - 2, 4, 4); fxc.globalAlpha = 0.4; fxc.fillStyle = "#ffd9c7"; fxc.fillRect(Math.round(bb.x - bb.vx) - 1, Math.round(bb.y - bb.vy) - 1, 2, 2); fxc.globalAlpha = 1; }
      for (var f = fxp.length - 1; f >= 0; f--) { var q = fxp[f]; q.life++; q.x += q.vx; q.y += q.vy; q.vy += 0.04; if (q.life >= q.max) { fxp.splice(f, 1); continue; } fxc.globalAlpha = 1 - q.life / q.max; fxc.fillStyle = q.c; var qs = q.life > q.max * 0.6 ? 2 : 3; fxc.fillRect(Math.round(q.x), Math.round(q.y), qs, qs); }
      // debris: explode outward, fall under gravity, pile at the bottom, then fade
      for (var d = debris.length - 1; d >= 0; d--) {
        var dd = debris[d]; dd.life++;
        if (!dd.landed) { dd.vy += 0.35; dd.x += dd.vx; dd.y += dd.vy;
          if (dd.y >= H - dd.sz) { dd.y = H - dd.sz; dd.vy *= -0.32; dd.vx *= 0.6; if (Math.abs(dd.vy) < 1.1) { dd.landed = true; dd.vy = 0; dd.vx = 0; } } }
        if (dd.life >= dd.max) { debris.splice(d, 1); continue; }
        fxc.globalAlpha = dd.life > dd.max - 45 ? (dd.max - dd.life) / 45 : 1;
        fxc.fillStyle = dd.c; fxc.fillRect(Math.round(dd.x), Math.round(dd.y), dd.sz, dd.sz);
      }
      // shockwave rings (human-blue)
      for (var g = rings.length - 1; g >= 0; g--) {
        var rg = rings[g]; rg.life++;
        if (rg.life >= rg.max) { rings.splice(g, 1); continue; }
        fxc.globalAlpha = (1 - rg.life / rg.max) * 0.85; fxc.strokeStyle = rg.c || "#0b6bcb"; fxc.lineWidth = 2;
        fxc.beginPath(); fxc.arc(rg.x, rg.y, 8 + rg.life * 2.4, 0, Math.PI * 2); fxc.stroke();
      }
      // floating "DESTROYED" popups
      fxc.textAlign = "center"; fxc.font = "700 15px ui-monospace, SFMono-Regular, Menlo, monospace";
      for (var u = popups.length - 1; u >= 0; u--) {
        var pu = popups[u]; pu.life++; pu.y -= 0.8;
        if (pu.life >= pu.max) { popups.splice(u, 1); continue; }
        fxc.globalAlpha = pu.life > pu.max - 26 ? (pu.max - pu.life) / 26 : 1;
        fxc.fillStyle = pu.c || "#0b6bcb"; fxc.fillText(pu.text, pu.x, pu.y);
      }
      fxc.globalAlpha = 1;
    }

    // quips (calm states only)
    if (mode !== "knock" && mode !== "attack" && !trend && t > nextQuip && bubble.hidden) {
      var j; do { j = (Math.random() * quips.length) | 0; } while (j === lastQuip && quips.length > 1);
      lastQuip = j; say(quips[j]);
    }
    if (!bubble.hidden && t > bubbleUntil) bubble.hidden = true;

    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
