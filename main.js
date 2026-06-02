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
  // clearly visible (responsive floor 0.9). Baked into ctx.scale so it stays crisp at any size.
  // BASE bumps the default size +30%; size, bubble gap and hit radius all derive from DS, so
  // they all scale together proportionally.
  var BASE = 1.56;
  function dispScale() { return BASE * Math.max(0.9, Math.min(1, W / 720)); }
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
  var sparks = [], beams = [], fxp = [], bullets = [], balls = [], debris = [], rings = [], popups = [], fxActive = false, fireCD = 0;
  var bubbleUntil = 0, nextQuip = 240, lastQuip = -1;
  var homeTgt = null, homeHold = 0;
  var trend = null, trendCD = 220;
  var scale = 1, scaleTarget = 1, sizeCD = 120;
  var attackT = 0, attackCD = 200, attackKind = "bullets", beamAt = 0, lockX = 0, lockY = 0;
  var atkPhase = "approach", atkTimer = 0, fired = false;
  var krot = 0, kvx = 0, kvy = 0, knockT = 0, hitCD = 0, angryT = 0;

  // The robot is the TRUE form. With a puff of magic it morphs into a random pixel critter that
  // merely *resembles* a famous monster (original pixel art, not the real things), holds it for a
  // while, then magic returns it to the robot, rests, and later morphs again — robot ↔ critter,
  // never critter → critter. Independent of scroll position.
  var CRITTERS = ["sparky", "flarewing", "emberling", "seedling", "shellback", "puffball", "shadowfang", "fennec", "slumberlump", "dazeduck", "coincat",
    "flamequill", "mudfin", "aurapup", "flipperkin", "sandshark", "shadefrog", "ribbonfay", "ragghost", "blazebun", "leafkit"];
  var FORM_LINE = {
    sparky: ["A wild SPARKY appeared!", "pika? …pika.", "10,000 volts of compute."],
    flarewing: ["FLAREWING evolved!", "rawr — GPU's on fire.", "this CV is straight fire."],
    emberling: ["EMBERLING is fired up.", "tiny lizard, big flame.", "compiling… with heat."],
    seedling: ["SEEDLING used Growth.", "planting neural seeds.", "photosynthesizing data."],
    shellback: ["SHELLBACK splashed in!", "water-cooled inference.", "turtle power, basically."],
    puffball: ["PUFFBALL wants to sing.", "♪ don't fall asleep ♪", "rounder than your loss curve."],
    shadowfang: ["a SHADOW slips in…", "boo. trained on nightmares.", "ghost in the machine, literally."],
    fennec: ["FENNEC is adorable.", "so many possible evolutions.", "fluffiest model in the zoo."],
    slumberlump: ["SLUMBERLUMP yawns.", "zzz… inference later.", "big model, low power mode."],
    dazeduck: ["DAZEDUCK has a headache.", "…what was I computing?", "psy-ay-ay. confusion."],
    coincat: ["COINCAT smells profit.", "pay-day, human.", "monetizing this CV as we speak."],
    flamequill: ["EMBERSPINE sparks up.", "back flames, back-end heat.", "Gen 2, still cooking."],
    mudfin: ["so I herd u liek MUDFIN?", "water types > your tests.", "splash damage incoming."],
    aurapup: ["AURAWOLF senses your aura.", "I read your commit history.", "aura sphere → straight to prod."],
    flipperkin: ["TUXFLIPPER, dressed to deploy.", "proud little penguin.", "ice-cold inference."],
    sandshark: ["DUNESHARK at mach speed.", "land-shark, meet your CV.", "outspeeds your CI."],
    shadefrog: ["SHADEFROG vanishes…", "ninja-merged that PR.", "water-shuriken your bugs."],
    ribbonfay: ["RIBBONFAY says hi 🎀", "fairy-type charm offensive.", "tied your loose ends in ribbons."],
    ragghost: ["RAGGHOST just wants a friend.", "don't look under the cloth.", "cosplaying as your favorite."],
    blazebun: ["PYREHARE is warming up.", "blaze kick on legacy code.", "fast feet, hot takes."],
    leafkit: ["LEAFKIT, freshly sprouted.", "Gen 9 and growing.", "photosynthesizing your data."],
    robot: ["the magic fades — robot again.", "transformation complete: me.", "beep boop — true form restored."]
  };
  var MORPH = 20;
  var curForm = "robot", morphFlash = 0, formCD = 300 + (rand(0, 240) | 0);
  function magic() {
    emit(30, 30);                                   // dense in-canvas sparkle shower
    if (!fxc) return;
    fxBurst(pos.x, pos.y, 24, "#9b6bff");           // screen-space magic burst (violet/cyan/white)
    fxBurst(pos.x, pos.y, 16, "#36c6e0");
    fxBurst(pos.x, pos.y, 10, "#ffffff");
    rings.push({ x: pos.x, y: pos.y, life: 0, max: 30, c: "#9b6bff" });
    rings.push({ x: pos.x, y: pos.y, life: 0, max: 22, c: "#ffffff" });
  }
  function morphTo(f) {
    curForm = f; morphFlash = MORPH; magic();
    if (FORM_LINE[f] && knockT <= 0 && attackT <= 0 && !trend) say(pick(FORM_LINE[f]), 240);
  }

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
  // a spinning Poké-style ball lobbed at the cursor (only thrown while in a critter form)
  function throwBall(tx, ty) {
    var ang = Math.atan2(ty - pos.y, tx - pos.x), sp = 5;
    balls.push({ x: pos.x, y: pos.y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 1.4, spin: 0, dspin: 0.34, life: 0, max: 72 });
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
    trend.y = trend.baseY; trendEl.textContent = trend.label; trendEl.hidden = false;
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
    angryT = Math.min(900, angryT + 240);   // the more you knock it, the angrier — YOU become the target
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

  // shared expressive eyes for the critter forms — same moods as the robot. `ec` = eye color.
  function eyePair(state, blink, lx, rx, y, ec) {
    ec = ec || "#1a1a1a";
    if (state === "knock") {
      pxl(lx, y, 1, 1, col.dizzy); pxl(lx + 1, y - 1, 1, 1, col.dizzy); pxl(lx - 1, y + 1, 1, 1, col.dizzy);
      pxl(rx, y, 1, 1, col.dizzy); pxl(rx + 1, y - 1, 1, 1, col.dizzy); pxl(rx - 1, y + 1, 1, 1, col.dizzy);
    } else if (blink) { pxl(lx, y + 1, 1, 1, ec); pxl(rx, y + 1, 1, 1, ec); }
    else if (state === "mad") { pxl(lx - 1, y, 1, 1, ec); pxl(lx, y + 1, 1, 1, ec); pxl(rx + 1, y, 1, 1, ec); pxl(rx, y + 1, 1, 1, ec); }
    else if (state === "attack" || state === "happy") { pxl(lx, y, 1, 2, ec); pxl(rx, y, 1, 2, ec); }
    else { pxl(lx, y, 1, 1, ec); pxl(rx, y, 1, 1, ec); }
  }

  // ---- pixel critters (original art that merely *evokes* well-known monsters) ----
  // All centered ~grid 8 with the top near y0–2 so the speech-bubble gap still clears them.

  // SPARKY — yellow electric mouse: long black-tipped ears, red cheeks, lightning tail
  function drawSparky(state, blink) {
    var Y = "#f7d51e", K = "#2a2a2a", R = "#e23b2e", BR = "#b07820";
    pxl(11, 6, 1, 2, BR); pxl(12, 4, 2, 2, Y); pxl(13, 2, 1, 2, Y);     // lightning tail
    pxl(5, -1, 1, 4, Y); pxl(10, -1, 1, 4, Y);                          // ears
    pxl(5, -1, 1, 1, K); pxl(10, -1, 1, 1, K);                          // black ear tips
    pxl(4, 3, 8, 8, Y);                                                 // head+body
    pxl(4, 4, 1, 4, BR); pxl(11, 4, 1, 4, BR);                          // back stripes hint
    pxl(4, 6, 1, 1, R); pxl(11, 6, 0, 0, R); pxl(11, 6, 1, 1, R);       // cheeks
    eyePair(state, blink, 6, 9, 5, K);
    pxl(8, 6, 1, 1, K);                                                 // nose
    pxl(5, 11, 2, 1, Y); pxl(9, 11, 2, 1, Y);                           // feet
  }

  // FLAREWING — orange dragon: cream belly, teal wings, flame on the tail
  function drawFlarewing(state, blink) {
    var O = "#ee8a2e", O2 = "#c96a16", CR = "#f5dd9b", W = "#3fa08e", FL = "#ff5a1f", FY = "#ffd23b";
    pxl(2, 3, 3, 4, W); pxl(11, 3, 3, 4, W);                            // wings
    pxl(2, 3, 1, 4, O2); pxl(13, 3, 1, 4, O2);                          // wing edges
    pxl(5, 2, 6, 9, O);                                                 // body
    pxl(6, 6, 3, 4, CR);                                                // belly
    pxl(4, 3, 1, 3, O); pxl(5, 1, 1, 1, CR); pxl(9, 1, 1, 1, CR);       // snout + horns
    eyePair(state, blink, 6, 8, 3, "#1a1a1a");
    pxl(5, 11, 2, 1, O); pxl(9, 11, 2, 1, O);                           // legs
    pxl(11, 9, 2, 1, O2);                                               // tail base
    pxl(13, 7, 1, 2, FL); pxl(13, 6, 1, 1, FY);                         // tail flame
  }

  // SEEDLING — teal quadruped with a green bulb on its back + red eyes
  function drawSeedling(state, blink) {
    var T = "#56b89e", T2 = "#2f8f80", G = "#6cbf3f", G2 = "#3f8f2f";
    pxl(5, 2, 6, 3, G);                                                 // bulb
    pxl(6, 2, 1, 1, G2); pxl(9, 3, 1, 1, G2);                           // bulb spots
    pxl(4, 5, 8, 6, T);                                                 // body+head
    pxl(8, 7, 1, 1, T2); pxl(10, 8, 1, 1, T2);                          // body spots
    eyePair(state, blink, 5, 8, 6, "#d23b2e");                          // red eyes
    pxl(6, 9, 1, 1, T2);                                                // mouth
    pxl(4, 10, 2, 1, T); pxl(9, 10, 2, 1, T);                           // legs
  }

  // SHELLBACK — light-blue turtle with a brown shell
  function drawShellback(state, blink) {
    var B = "#5bb4e0", B2 = "#2f7fb5", SH = "#b5773a", RM = "#ecd9b0", CR = "#f7ead0";
    pxl(4, 3, 5, 5, B);                                                 // head
    eyePair(state, blink, 5, 7, 4, "#1a1a1a");
    pxl(5, 7, 1, 1, B2);                                                // mouth
    pxl(7, 4, 6, 7, SH);                                                // shell
    pxl(7, 4, 6, 1, RM); pxl(7, 10, 6, 1, RM);                          // shell rim
    pxl(9, 6, 1, 1, CR); pxl(11, 8, 1, 1, CR);                          // shell pattern
    pxl(5, 8, 2, 1, B); pxl(6, 11, 2, 1, B); pxl(9, 11, 2, 1, B);       // arm + feet
    pxl(13, 9, 1, 1, B);                                                // tail
  }

  // PUFFBALL — round pink balloon: big eyes, curl of hair, tiny ears
  function drawPuffball(state, blink) {
    var P = "#f3a7c4", P2 = "#e07ba0", WH = "#ffffff", EB = "#2f5fa0", M = "#d23b2e";
    pxl(4, 4, 8, 7, P); pxl(5, 3, 6, 1, P); pxl(5, 11, 6, 1, P);        // round body
    pxl(3, 6, 1, 3, P); pxl(12, 6, 1, 3, P);                            // sides
    pxl(5, 2, 2, 1, P); pxl(5, 1, 1, 1, P);                             // hair curl
    pxl(4, 4, 1, 1, P2); pxl(11, 4, 1, 1, P2);                          // ear hints
    if (state === "knock") { eyePair(state, blink, 6, 9, 5, EB); }
    else if (blink) { pxl(5, 7, 2, 1, EB); pxl(9, 7, 2, 1, EB); }
    else {                                                              // big signature eyes
      pxl(5, 5, 2, 3, WH); pxl(9, 5, 2, 3, WH);
      pxl(5, 6, 1, 1, EB); pxl(9, 6, 1, 1, EB);
    }
    pxl(7, 9, 2, 1, M);                                                 // mouth
  }

  // SHADOWFANG — spiky purple ghost with red eyes and a toothy grin
  function drawShadowfang(state, blink) {
    var G = "#6b4fa3", G2 = "#4a3576", WH = "#ffffff";
    pxl(5, 1, 1, 2, G); pxl(7, 0, 1, 2, G); pxl(9, 1, 1, 2, G); pxl(11, 2, 1, 2, G);  // head spikes
    pxl(4, 3, 8, 8, G); pxl(5, 2, 6, 1, G);                             // body
    pxl(3, 5, 1, 2, G); pxl(12, 5, 1, 2, G);                            // side nubs
    pxl(4, 11, 1, 2, G); pxl(11, 11, 1, 2, G);                          // back spikes
    eyePair(state, blink, 5, 9, 4, "#e23b2e");                          // red eyes
    pxl(4, 8, 8, 1, WH);                                                // grin
    pxl(5, 8, 1, 1, G2); pxl(7, 8, 1, 1, G2); pxl(9, 8, 1, 1, G2); pxl(11, 8, 1, 1, G2);  // teeth gaps
    pxl(5, 11, 2, 1, G); pxl(9, 11, 2, 1, G);                           // feet
  }

  // EMBERLING — small orange fire lizard (no wings), cream belly, flame tail
  function drawEmberling(state, blink) {
    var O = "#ef8b3a", O2 = "#c96a16", CR = "#f7e3b0", FL = "#ff5a1f", FY = "#ffd23b";
    pxl(5, 2, 6, 9, O);                                                // head + body
    pxl(6, 7, 3, 3, CR);                                               // belly
    pxl(4, 7, 1, 2, O); pxl(11, 7, 1, 2, O);                          // little arms
    eyePair(state, blink, 6, 9, 4, "#1a1a1a");
    pxl(5, 11, 2, 1, O); pxl(9, 11, 2, 1, O);                         // feet
    pxl(11, 9, 2, 1, O2);                                             // tail base
    pxl(13, 7, 1, 2, FL); pxl(13, 6, 1, 1, FY);                       // tail flame
  }

  // FENNEC — brown fox: big ears, fluffy cream ruff + tail
  function drawFennec(state, blink) {
    var BR = "#b07a3a", BR2 = "#8a5d28", CR = "#f0e0bf";
    pxl(4, 0, 2, 4, BR); pxl(10, 0, 2, 4, BR);                        // big ears
    pxl(4, 1, 1, 2, BR2); pxl(11, 1, 1, 2, BR2);                      // inner ears
    pxl(5, 4, 6, 6, BR);                                              // head + body
    pxl(4, 8, 8, 2, CR);                                             // fluffy ruff
    pxl(11, 5, 2, 3, BR); pxl(12, 5, 1, 2, CR);                       // bushy tail
    eyePair(state, blink, 6, 9, 6, "#2a1a0a");
    pxl(8, 8, 1, 1, BR2);                                            // nose
    pxl(5, 11, 2, 1, BR); pxl(9, 11, 2, 1, BR);                       // legs
  }

  // SLUMBERLUMP — big sleepy bluish body with a cream belly/face
  function drawSlumberlump(state, blink) {
    var DB = "#3a5d78", DB2 = "#2a4660", CR = "#e9dcc0", K = "#1a1a1a";
    pxl(3, 3, 2, 2, DB); pxl(11, 3, 2, 2, DB);                        // ears
    pxl(2, 4, 12, 8, DB);                                             // big body
    pxl(5, 6, 6, 5, CR);                                             // cream face/belly
    if (state === "knock") { eyePair(state, blink, 6, 9, 7, K); }
    else if (state === "mad" || state === "attack") { eyePair(state, blink, 6, 9, 6, K); }
    else { pxl(5, 7, 2, 1, K); pxl(9, 7, 2, 1, K); }                  // sleepy closed eyes
    pxl(7, 9, 2, 1, DB2);                                            // mouth
    pxl(3, 11, 2, 1, CR); pxl(9, 11, 2, 1, CR);                       // clawed feet
  }

  // DAZEDUCK — yellow duck: bill, three hair strands, hands up by the head, vacant eyes
  function drawDazeduck(state, blink) {
    var Y = "#f4d23b", Y2 = "#d9b21f", BILL = "#e89a32", K = "#1a1a1a";
    pxl(6, 0, 1, 2, K); pxl(8, -1, 1, 2, K); pxl(10, 0, 1, 2, K);     // three hairs
    pxl(4, 2, 8, 8, Y);                                               // head + body
    pxl(3, 3, 1, 3, Y); pxl(12, 3, 1, 3, Y);                          // hands up by head
    eyePair(state, blink, 6, 9, 4, K);                               // vacant dot eyes
    pxl(6, 7, 4, 2, BILL); pxl(6, 8, 4, 1, Y2);                       // bill
    pxl(5, 11, 2, 1, BILL); pxl(9, 11, 2, 1, BILL);                   // webbed feet
  }

  // COINCAT — cream cat with a gold charm on its forehead, pointy ears, whiskers
  function drawCoincat(state, blink) {
    var CR = "#ecd9a8", CR2 = "#c9b27a", GOLD = "#f2c63a", GOLD2 = "#d8a21f", K = "#1a1a1a", N = "#d23b6e";
    pxl(4, 1, 2, 2, CR); pxl(10, 1, 2, 2, CR);                        // pointy ears
    pxl(4, 1, 1, 1, CR2); pxl(11, 1, 1, 1, CR2);                      // ear tips
    pxl(4, 3, 8, 8, CR);                                              // head + body
    pxl(7, 2, 2, 2, GOLD); pxl(7, 3, 2, 1, GOLD2);                    // gold charm (koban)
    eyePair(state, blink, 5, 9, 5, K);
    pxl(3, 7, 1, 1, CR2); pxl(12, 7, 1, 1, CR2);                      // whiskers
    pxl(7, 7, 2, 1, N);                                              // nose/mouth
    pxl(5, 11, 2, 1, CR); pxl(9, 11, 2, 1, CR);                       // paws
  }

  // ---- newer-generation critters (Gen 2–9) ----

  // EMBERSPINE — cream fire-mouse with a row of flames along its back (Gen 2)
  function drawFlamequill(state, blink) {
    var CR = "#e8d8a8", CR2 = "#caa86a", NV = "#2f4a6e", FL = "#ff5a1f", FY = "#ffd23b";
    pxl(5, 2, 1, 2, FL); pxl(7, 1, 1, 3, FL); pxl(7, 1, 1, 1, FY); pxl(9, 2, 1, 2, FL);   // back flames
    pxl(4, 4, 8, 2, NV);                                               // dark back
    pxl(4, 5, 8, 6, CR);                                              // cream body
    eyePair(state, blink, 6, 9, 6, "#1a1a1a");
    pxl(4, 7, 1, 1, NV);                                             // nose
    pxl(5, 11, 2, 1, CR2); pxl(9, 11, 2, 1, CR2);                     // feet
  }

  // MUDFIN — light-blue mud fish: top fin, orange cheek fins, tail fin (Gen 3)
  function drawMudfin(state, blink) {
    var B = "#5fb0e0", B2 = "#3a6e9e", O = "#ef8b3a";
    pxl(7, 1, 2, 3, B2);                                              // dorsal head fin
    pxl(4, 4, 8, 7, B);                                              // body
    pxl(3, 6, 1, 2, O); pxl(12, 6, 1, 2, O);                         // orange cheek fins
    eyePair(state, blink, 5, 9, 5, "#1a1a1a");
    pxl(7, 8, 2, 1, B2);                                            // mouth
    pxl(11, 9, 2, 2, B2);                                           // tail fin
    pxl(5, 11, 2, 1, B); pxl(9, 11, 2, 1, B);                        // feet
  }

  // AURAWOLF — blue/black jackal: ears, black mask, yellow chest, red eyes (Gen 4)
  function drawAurapup(state, blink) {
    var BL = "#3a6ec0", K = "#1a1f2e", Y = "#f4d23b", SP = "#cdddec";
    pxl(4, 1, 1, 3, BL); pxl(11, 1, 1, 3, BL);                        // ears
    pxl(4, 1, 1, 1, K); pxl(11, 1, 1, 1, K);                          // ear tips
    pxl(4, 3, 8, 8, BL);                                            // body
    pxl(4, 3, 8, 2, K);                                             // face mask
    pxl(5, 6, 6, 3, K);                                             // black torso
    pxl(6, 8, 4, 2, Y);                                             // yellow chest
    eyePair(state, blink, 6, 9, 4, "#e23b2e");
    pxl(8, 7, 1, 1, SP); pxl(3, 7, 1, 1, SP); pxl(12, 7, 1, 1, SP);   // aura spikes
    pxl(5, 11, 2, 1, BL); pxl(9, 11, 2, 1, BL);                       // feet
  }

  // TUXFLIPPER — blue penguin: white belly/face, yellow beak + feet (Gen 4)
  function drawFlipperkin(state, blink) {
    var B = "#2f6eb0", WH = "#f5f9fd", Y = "#f4c63a";
    pxl(4, 3, 8, 8, B);                                              // body
    pxl(5, 5, 6, 5, WH);                                            // white face + belly
    pxl(3, 6, 1, 3, B); pxl(12, 6, 1, 3, B);                          // flippers
    eyePair(state, blink, 5, 9, 5, "#1a1a1a");
    pxl(7, 6, 2, 1, Y);                                             // beak
    pxl(6, 9, 1, 1, Y); pxl(9, 9, 1, 1, Y);                          // collar buttons
    pxl(5, 11, 2, 1, Y); pxl(9, 11, 2, 1, Y);                        // feet
  }

  // DUNESHARK — blue land-shark: wide head fins, red belly, yellow eyes (Gen 4)
  function drawSandshark(state, blink) {
    var B = "#3a5a8e", B2 = "#2a4468", R = "#d23b2e", WH = "#f5f9fd";
    pxl(2, 3, 2, 2, B); pxl(12, 3, 2, 2, B);                          // head fins
    pxl(4, 3, 8, 8, B);                                             // body
    pxl(6, 6, 4, 4, R);                                             // red belly
    eyePair(state, blink, 5, 9, 4, "#f4d23b");
    pxl(6, 8, 4, 1, WH);                                            // teeth
    pxl(3, 7, 1, 2, B2); pxl(12, 7, 1, 2, B2);                        // arm fins
    pxl(5, 11, 2, 1, B); pxl(9, 11, 2, 1, B);                        // feet
  }

  // SHADEFROG — dark-blue frog ninja with a pink tongue-scarf, yellow eyes (Gen 6)
  function drawShadefrog(state, blink) {
    var DB = "#2f4a8e", LB = "#5a7ec8", PK = "#e89ab0";
    pxl(4, 3, 8, 8, DB);                                             // body
    pxl(5, 4, 6, 3, LB);                                            // lighter face
    eyePair(state, blink, 6, 9, 5, "#f4d23b");
    pxl(4, 8, 8, 1, PK); pxl(7, 9, 2, 2, PK);                        // tongue scarf
    pxl(3, 6, 1, 2, DB); pxl(12, 6, 1, 2, DB);                        // hands
    pxl(5, 11, 2, 1, DB); pxl(9, 11, 2, 1, DB);                       // feet
  }

  // RIBBONFAY — cream fairy: pink ears/feet, ribbon feelers, blue eyes (Gen 6)
  function drawRibbonfay(state, blink) {
    var CR = "#f3ead8", PK = "#f0a8c0", BL = "#5a9ed8";
    pxl(4, 1, 2, 3, PK); pxl(10, 1, 2, 3, PK);                        // pink ears
    pxl(4, 4, 8, 7, CR);                                            // body
    pxl(4, 4, 2, 2, PK);                                            // pink face accent
    pxl(2, 5, 2, 1, CR); pxl(1, 6, 1, 1, BL);                         // left ribbon feeler
    pxl(12, 8, 2, 1, CR); pxl(13, 9, 1, 1, BL);                       // right ribbon feeler
    eyePair(state, blink, 6, 9, 6, "#3a8ed8");
    pxl(5, 11, 2, 1, PK); pxl(9, 11, 2, 1, PK);                       // feet
  }

  // RAGGHOST — yellow ragged-cloth disguise: crooked ears, scribble face, stick tail (Gen 7)
  function drawRagghost(state, blink) {
    var Y = "#f7d51e", K = "#1a1a1a", R = "#e23b2e", ST = "#6b5a3a";
    pxl(5, 0, 1, 3, Y); pxl(5, 0, 1, 1, K);                           // left ear (tall)
    pxl(10, 1, 1, 2, Y); pxl(10, 1, 1, 1, K);                         // right ear (crooked, short)
    pxl(4, 3, 8, 8, Y);                                             // cloth body
    pxl(4, 11, 2, 1, Y); pxl(8, 11, 2, 1, Y);                         // ragged hem
    pxl(4, 6, 1, 1, R); pxl(11, 6, 1, 1, R);                          // drawn-on cheeks
    eyePair(state, blink, 6, 9, 5, K);                               // scribble eyes
    pxl(6, 7, 1, 1, K); pxl(7, 8, 1, 1, K); pxl(8, 7, 1, 1, K); pxl(9, 8, 1, 1, K);  // zigzag mouth
    pxl(12, 8, 2, 1, ST); pxl(13, 7, 1, 1, K);                        // stick tail + rag scribble
  }

  // PYREHARE — white rabbit: big red-lined ears, red nose/feet, yellow band (Gen 8)
  function drawBlazebun(state, blink) {
    var WH = "#f5f9fd", R = "#e23b2e", Y = "#f4d23b";
    pxl(4, 0, 2, 4, WH); pxl(10, 0, 2, 4, WH);                        // big ears
    pxl(5, 1, 1, 2, R); pxl(10, 1, 1, 2, R);                          // red inner ears
    pxl(4, 4, 8, 7, WH);                                            // body
    pxl(7, 6, 2, 1, R);                                             // red nose patch
    pxl(5, 8, 6, 1, Y);                                             // yellow chest band
    eyePair(state, blink, 5, 9, 5, "#1a1a1a");
    pxl(5, 11, 2, 1, R); pxl(9, 11, 2, 1, R);                        // red feet
  }

  // LEAFKIT — green grass-cat: pointy ears, cream muzzle, leaf sprout (Gen 9)
  function drawLeafkit(state, blink) {
    var G = "#6cbf5a", G2 = "#3f8f2f", CR = "#eef0c0";
    pxl(4, 1, 2, 2, G); pxl(10, 1, 2, 2, G);                          // pointy ears
    pxl(8, 0, 1, 2, G2);                                            // leaf sprout
    pxl(4, 3, 8, 8, G);                                             // body
    pxl(4, 4, 1, 2, G2); pxl(11, 4, 1, 2, G2);                        // darker stripes
    pxl(5, 5, 6, 3, CR);                                            // cream muzzle
    eyePair(state, blink, 5, 9, 5, "#1a1a1a");
    pxl(7, 7, 2, 1, G2);                                            // nose/mouth
    pxl(5, 11, 2, 1, G); pxl(9, 11, 2, 1, G);                        // feet
  }

  function drawForm(form, state, blink, moving) {
    if (form === "sparky") return drawSparky(state, blink);
    if (form === "flarewing") return drawFlarewing(state, blink);
    if (form === "emberling") return drawEmberling(state, blink);
    if (form === "seedling") return drawSeedling(state, blink);
    if (form === "shellback") return drawShellback(state, blink);
    if (form === "puffball") return drawPuffball(state, blink);
    if (form === "shadowfang") return drawShadowfang(state, blink);
    if (form === "fennec") return drawFennec(state, blink);
    if (form === "slumberlump") return drawSlumberlump(state, blink);
    if (form === "dazeduck") return drawDazeduck(state, blink);
    if (form === "coincat") return drawCoincat(state, blink);
    if (form === "flamequill") return drawFlamequill(state, blink);
    if (form === "mudfin") return drawMudfin(state, blink);
    if (form === "aurapup") return drawAurapup(state, blink);
    if (form === "flipperkin") return drawFlipperkin(state, blink);
    if (form === "sandshark") return drawSandshark(state, blink);
    if (form === "shadefrog") return drawShadefrog(state, blink);
    if (form === "ribbonfay") return drawRibbonfay(state, blink);
    if (form === "ragghost") return drawRagghost(state, blink);
    if (form === "blazebun") return drawBlazebun(state, blink);
    if (form === "leafkit") return drawLeafkit(state, blink);
    return drawRobot(state, blink, moving);
  }

  function loop() {
    t++;
    if (hitCD > 0) hitCD--;
    if (angryT > 0) angryT--;
    var recent = (t - lastMove) < 90;

    // trends spawn reliably on a timer
    if (--trendCD <= 0 && !trend && knockT <= 0 && angryT <= 0) spawnTrend();   // no trends while angry — it's after YOU
    if (trend) {
      trend.tt++; trend.x += trend.vx; trend.y = trend.baseY + Math.sin(trend.tt * 0.04) * 32;
      trendEl.style.transform = "translate(" + trend.x + "px," + trend.y + "px)";
      if (trend.x < -150 || trend.x > W + 150) clearTrend();
    }

    // schedule an attack RUN — it only comes at you when you're active; it never just trails the cursor
    if (knockT <= 0 && (!trend || angryT > 0) && recent && attackT <= 0 && beamAt <= 0) {
      if (attackCD > 0) attackCD--;
      else {
        attackT = 1; atkPhase = "approach"; atkTimer = 0; fired = false; var rk = Math.random();
        if (curForm !== "robot") attackKind = rk < 0.4 ? "ball" : (rk < 0.62 ? "bullets" : (rk < 0.82 ? "beam" : "melee"));
        else attackKind = rk < 0.45 ? "bullets" : (rk < 0.78 ? "beam" : "melee");
      }
    }

    // mode + target
    var mode, lerp = 0.05;
    if (knockT > 0) mode = "knock";
    else if (trend && angryT <= 0) {                   // chase from BEHIND (ignored while angry — you're the target)
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
            if (attackKind === "ball" && curForm !== "robot") throwBall(mouseX, mouseY);
            else if (attackKind === "bullets" || attackKind === "ball") fireBullets(mouseX, mouseY, 3);
            else { lockX = mouseX; lockY = mouseY; beamAt = t + 9; }
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
    if (trend && angryT <= 0) {
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
    // magic transformation cycle: robot is the true form. Morph into a random critter, hold it a
    // while, then magic returns it to the robot, rest, and later morph again. Robot ↔ critter only.
    formCD--;
    if (formCD <= 0 && knockT <= 0) {
      if (curForm === "robot") {
        var nf; do { nf = pick(CRITTERS); } while (nf === curForm);
        morphTo(nf); formCD = 420 + (rand(0, 360) | 0);      // stay a critter ~7–13s
      } else {
        morphTo("robot"); formCD = 540 + (rand(0, 600) | 0); // rest as robot ~9–19s
      }
    }
    if (morphFlash > 0) morphFlash--;
    var mp = 1 - morphFlash / MORPH;                                                // 0→1 over the morph
    var pop = morphFlash > 0 ? 0.5 + 0.5 * mp + 0.14 * Math.sin(mp * Math.PI) : 1;   // poof: grow-in + bulge
    ctx.save();
    ctx.translate(CX, CY + bob); ctx.rotate(lean + krot); ctx.scale(dir * scale * DS * pop, scale * DS * pop); ctx.translate(-24, -24);
    var st = mode === "knock" ? "knock" : (angryT > 0 ? "mad" : (mode === "attack" || beamAt > 0 ? "attack" : (mode === "chase" || /studio/i.test((document.querySelector(".railnav a.active") || {}).textContent || "") ? "happy" : "idle")));
    drawForm(curForm, st, (t % 200 < 7), spd > 1 && mode !== "knock");
    ctx.restore();

    // local sparkles
    for (var i = sparks.length - 1; i >= 0; i--) { var p = sparks[i]; p.life++; p.x += p.vx; p.y += p.vy; p.vy += 0.015; if (p.life >= p.max) { sparks.splice(i, 1); continue; } ctx.globalAlpha = 1 - p.life / p.max; ctx.fillStyle = p.c; var s2 = p.life > p.max * 0.6 ? 1 : 2; ctx.fillRect(Math.round(p.x), Math.round(p.y), s2, s2); }
    ctx.globalAlpha = 1;

    // fx layer: lasers, bursts, bullets (screen space)
    if (fxc) {
      var anyFx = beams.length || fxp.length || bullets.length || balls.length || debris.length || rings.length || popups.length;
      if (anyFx || fxActive) fxc.clearRect(0, 0, W, H);
      fxActive = !!anyFx;
      for (var b = beams.length - 1; b >= 0; b--) { var bm = beams[b]; bm.life++; if (bm.life >= bm.max) { beams.splice(b, 1); continue; } var al = 1 - bm.life / bm.max; fxc.strokeStyle = bm.c; fxc.globalAlpha = al; fxc.lineWidth = 3; fxc.beginPath(); fxc.moveTo(bm.x1, bm.y1); fxc.lineTo(bm.x2, bm.y2); fxc.stroke(); fxc.globalAlpha = al * 0.5; fxc.lineWidth = 1; fxc.stroke(); }
      fxc.globalAlpha = 1;
      for (var m = 0; m < bullets.length; m++) { var bb = bullets[m]; fxc.fillStyle = "#ff5a1f"; fxc.fillRect(Math.round(bb.x) - 2, Math.round(bb.y) - 2, 4, 4); fxc.globalAlpha = 0.4; fxc.fillStyle = "#ffd9c7"; fxc.fillRect(Math.round(bb.x - bb.vx) - 1, Math.round(bb.y - bb.vy) - 1, 2, 2); fxc.globalAlpha = 1; }
      // thrown Poké-balls: arc under gravity, spin, "catch" the cursor on contact
      for (var z = balls.length - 1; z >= 0; z--) {
        var ba = balls[z]; ba.vy += 0.12; ba.x += ba.vx; ba.y += ba.vy; ba.spin += ba.dspin; ba.life++;
        if (recent && Math.hypot(ba.x - mouseX, ba.y - mouseY) < 42) { cursorHit(mouseX, mouseY, "GOTCHA!"); fxBurst(ba.x, ba.y, 18, "#ffffff"); balls.splice(z, 1); continue; }
        if (ba.life > ba.max || ba.x < -28 || ba.x > W + 28 || ba.y > H + 28) { fxBurst(ba.x, ba.y, 6, "#e23b2e"); balls.splice(z, 1); continue; }
        fxc.save(); fxc.translate(Math.round(ba.x), Math.round(ba.y)); fxc.rotate(ba.spin);
        var R = 16;
        fxc.fillStyle = "#e23b2e"; fxc.beginPath(); fxc.arc(0, 0, R, 0, Math.PI * 2); fxc.fill();   // red shell
        fxc.fillStyle = "#f5f5f5"; fxc.beginPath(); fxc.arc(0, 0, R, 0, Math.PI); fxc.fill();        // white bottom half
        fxc.fillStyle = "#1a1a1a"; fxc.fillRect(-R, -3, R * 2, 6);                                   // black band
        fxc.beginPath(); fxc.arc(0, 0, 6, 0, Math.PI * 2); fxc.fill();                               // button ring
        fxc.fillStyle = "#f5f5f5"; fxc.beginPath(); fxc.arc(0, 0, 3, 0, Math.PI * 2); fxc.fill();    // button center
        fxc.restore();
      }
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
