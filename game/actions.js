/* game/actions.js — akcije: everything the robot/you DO.
   - attacks: fireBullets, throwBall, scheduleAttack, runAttack, resolveBeam, updateBullets
   - trends: spawnTrend, clearTrend, humanGrab, updateTrendMotion, chaseTarget, shootAndCatch
   - input: bindInput, tryTapHit, knockRobot, cursorHit, idleTarget, segDist
   Every function takes the game instance `g`. Effects come from Robot.effects; lines from Robot.text. */
(function () {
  "use strict";
  var Robot = (window.Robot = window.Robot || {});
  var FX = Robot.effects, T = Robot.text, rand = Robot.rand, pick = Robot.pick;

  function segDist(px, py, ax, ay, bx, by) { var dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy; var tt = l2 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0; tt = Math.max(0, Math.min(1, tt)); return Math.hypot(px - (ax + tt * dx), py - (ay + tt * dy)); }

  // ---- attacks ----
  function fireBullets(g, txx, tyy, n) {
    var ang = Math.atan2(tyy - g.pos.y, txx - g.pos.x);
    for (var i = 0; i < n; i++) { var a = ang + (i - (n - 1) / 2) * 0.14;
      g.bullets.push({ x: g.pos.x, y: g.pos.y, vx: Math.cos(a) * 4.4, vy: Math.sin(a) * 4.4, life: 0, max: 80 }); }
  }
  // a spinning Poké-style ball lobbed at the cursor (only thrown while in a critter form)
  function throwBall(g, tx, ty) {
    var ang = Math.atan2(ty - g.pos.y, tx - g.pos.x), sp = 5;
    g.balls.push({ x: g.pos.x, y: g.pos.y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 1.4, spin: 0, dspin: 0.34, life: 0, max: 72 });
  }
  // schedule an attack RUN — only comes at you when you're active; never just trails the cursor
  function scheduleAttack(g, recent) {
    if (g.knockT <= 0 && (!g.trend || g.angryT > 0) && recent && g.attackT <= 0 && g.beamAt <= 0) {
      if (g.attackCD > 0) g.attackCD--;
      else {
        g.attackT = 1; g.atkPhase = "approach"; g.atkTimer = 0; g.fired = false; var rk = Math.random();
        if (g.curForm !== "robot") g.attackKind = rk < 0.4 ? "ball" : (rk < 0.62 ? "bullets" : (rk < 0.82 ? "beam" : "melee"));
        else g.attackKind = rk < 0.45 ? "bullets" : (rk < 0.78 ? "beam" : "melee");
      }
    }
  }
  // approach the cursor → fire → return home (the FSM body for mode === "attack"). Returns lerp.
  function runAttack(g, recent) {
    g.atkTimer++;
    var lerp;
    if (g.atkPhase === "approach") {
      g.tgt.x = g.mouseX; g.tgt.y = g.mouseY; lerp = g.attackKind === "melee" ? 0.1 : 0.07;
      var dM = Math.hypot(g.pos.x - g.mouseX, g.pos.y - g.mouseY);
      if (!g.fired) {
        if (g.attackKind === "melee") {                       // fly in and strike
          if (dM < 40 || g.atkTimer > 110) { if (dM < 48 && recent) cursorHit(g, g.mouseX, g.mouseY, "BONK!"); else if (Math.random() < 0.5) g.say(pick(T.missLines), 170); g.fired = true; g.atkPhase = "return"; }
        } else if (dM < 150 || g.atkTimer > 90) {             // shoot from range
          if (g.attackKind === "ball" && g.curForm !== "robot") throwBall(g, g.mouseX, g.mouseY);
          else if (g.attackKind === "bullets" || g.attackKind === "ball") fireBullets(g, g.mouseX, g.mouseY, 3);
          else { g.lockX = g.mouseX; g.lockY = g.mouseY; g.beamAt = g.t + 9; }
          g.fired = true; g.atkPhase = "return";
        }
      }
    } else {
      g.tgt.x = g.W * 0.80; g.tgt.y = g.H * 0.5; lerp = 0.05;
      if (Math.hypot(g.pos.x - g.tgt.x, g.pos.y - g.tgt.y) < 36 || g.atkTimer > 280) { g.attackT = 0; g.attackCD = (g.angryT > 0 ? 80 : 300) + (rand(0, g.angryT > 0 ? 80 : 260) | 0); }
    }
    return lerp;
  }
  // laser fires shortly after locking (gives a dodge window)
  function resolveBeam(g, recent) {
    if (g.beamAt > 0 && g.t >= g.beamAt) {
      FX.fireBeam(g, g.pos.x, g.pos.y, g.lockX, g.lockY, "#ff5a1f"); FX.fxBurst(g, g.lockX, g.lockY, 12, "#ff5a1f");
      if (Math.hypot(g.mouseX - g.lockX, g.mouseY - g.lockY) < 46 && recent) { cursorHit(g, g.mouseX, g.mouseY); }
      else if (Math.random() < 0.5) g.say(pick(T.missLines), 170);
      g.beamAt = 0;
    }
  }
  // bullets fly + score on the cursor
  function updateBullets(g, recent) {
    for (var k = g.bullets.length - 1; k >= 0; k--) {
      var bu = g.bullets[k]; bu.x += bu.vx; bu.y += bu.vy; bu.life++;
      var hit = recent && Math.hypot(bu.x - g.mouseX, bu.y - g.mouseY) < 24;
      if (hit) { cursorHit(g, g.mouseX, g.mouseY); g.bullets.splice(k, 1); continue; }
      if (bu.life > bu.max || bu.x < -20 || bu.x > g.W + 20 || bu.y < -20 || bu.y > g.H + 20) g.bullets.splice(k, 1);
    }
  }

  // ---- trends (the flying AI-trend tags) ----
  function spawnTrend(g) {
    var fromLeft = Math.random() < 0.5;
    g.trend = { x: fromLeft ? -90 : g.W + 90, baseY: rand(110, Math.max(150, g.H - 200)), y: 0, vx: (fromLeft ? 1 : -1) * rand(1.2, 1.7), tt: 0, label: pick(T.trends) };
    g.trend.hits = 0;
    g.trend.y = g.trend.baseY; g.trendEl.textContent = g.trend.label; g.trendEl.hidden = false;
  }
  function clearTrend(g) { g.trend = null; g.trendEl.hidden = true; g.trendCD = 520 + (rand(0, 420) | 0); }
  function humanGrab(g) {
    if (!g.trend) return;
    var tx = g.trend.x, ty = g.trend.y;
    g.say(pick(T.stealLines));
    FX.explode(g, tx, ty); FX.fxBurst(g, tx, ty, 18, "#ffffff");        // debris + bright flash
    FX.feedback(g, tx, ty, "DESTROYED", "#0b6bcb");                     // human-blue impact label
    clearTrend(g); g.angryT = 260;
  }
  function updateTrendMotion(g) {
    if (g.trend) {
      g.trend.tt++; g.trend.x += g.trend.vx; g.trend.y = g.trend.baseY + Math.sin(g.trend.tt * 0.04) * 32;
      g.trendEl.style.transform = "translate(" + g.trend.x + "px," + g.trend.y + "px)";
      if (g.trend.x < -150 || g.trend.x > g.W + 150) clearTrend(g);
    }
  }
  // chase from BEHIND (ignored while angry — you're the target). Sets tgt, resets attack, returns lerp.
  function chaseTarget(g) {
    g.attackT = 0; g.beamAt = 0;
    var tw = g.trendEl.offsetWidth || 90;
    var behindX = g.trend.vx > 0 ? (g.trend.x - 100) : (g.trend.x + tw + 60);
    g.tgt.x = Math.max(40, Math.min(g.W - 40, behindX));
    g.tgt.y = Math.max(60, Math.min(g.H - 60, g.trend.y + 6));
    return 0.08;
  }
  function shootAndCatch(g) {
    if (g.trend && g.angryT <= 0) {
      var central = g.trend.x > 70 && g.trend.x < g.W - 70;            // engage as soon as it's on screen
      var dT = Math.hypot(g.pos.x - g.trend.x, g.pos.y - g.trend.y);
      if (g.fireCD > 0) g.fireCD--;
      if (central && dT < 320 && g.fireCD <= 0) { FX.fireBeam(g, g.pos.x, g.pos.y - 6, g.trend.x, g.trend.y, "#36c6e0"); FX.fxBurst(g, g.trend.x, g.trend.y, 5, "#36c6e0"); g.fireCD = 18; g.trend.hits++; }
      if (g.trend.tt > 280 && g.trend.hits >= 2) {                     // lets it fly ~4.5s, then catches with a laser from behind
        var cx2 = g.trend.x, cy2 = g.trend.y;
        g.say(pick(T.caughtTpl) + g.trend.label + " trend!"); FX.fireBeam(g, g.pos.x, g.pos.y - 6, cx2, cy2, "#ff5a1f"); FX.feedback(g, cx2, cy2, "CAUGHT!", "#ff5a1f"); FX.emit(g, 10, 12); clearTrend(g);
      }
    }
  }

  // ---- input + hit reactions ----
  // AI lands a hit on your cursor → clear feedback ringed around the cursor
  function cursorHit(g, x, y, text) {
    g.say(pick(T.hitLines));
    FX.feedback(g, x, y, text || "HIT!", "#ff5a1f");
  }
  function knockRobot(g, dirx) {
    g.knockT = 120; g.hitCD = 70; g.attackT = 0; g.beamAt = 0;
    g.kvx = Math.max(-7, Math.min(7, dirx)); g.kvy = -4; g.krot = 0;
    g.angryT = Math.min(900, g.angryT + 240);   // the more you knock it, the angrier — YOU become the target
    FX.emit(g, 16, 16); g.say(pick(T.knockLines)); FX.feedback(g, g.pos.x, g.pos.y, "POW!", "#0b6bcb");
    // 3 quick knocks (each within ~5s of the last) → peak fury → whole-screen orange rage flash.
    // (gated on a knock streak, not angryT, which decays too fast between knockdowns to ever peak)
    g.knockStreak = (g.t - g.lastKnock < 300) ? g.knockStreak + 1 : 1;
    g.lastKnock = g.t;
    if (g.knockStreak >= 3) { g.rage(); g.knockStreak = 0; }
  }
  // idle wandering target. Returns lerp.
  function idleTarget(g) {
    if (!g.homeTgt || --g.homeHold <= 0) { g.homeTgt = { x: g.W * 0.80 + rand(-g.W * 0.05, g.W * 0.05), y: g.H * 0.48 + rand(-g.H * 0.1, g.H * 0.1) }; g.homeHold = 220 + (rand(0, 260) | 0); }
    g.tgt.x = g.homeTgt.x; g.tgt.y = g.homeTgt.y;
    return 0.03;
  }
  // tap / click on the trend → destroy it; on the robot → knock it down (works for mouse + touch)
  function tryTapHit(g, x, y, e) {
    if (g.trend && !g.trendEl.hidden) {
      var r = g.trendEl.getBoundingClientRect(), pad = g.coarse ? 16 : 12;
      if (x >= r.left - pad && x <= r.right + pad && y >= r.top - pad && y <= r.bottom + pad) {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        g.mouseX = x; g.mouseY = y; g.lastMove = g.t; humanGrab(g); return true;
      }
    }
    if (g.knockT <= 0 && g.hitCD <= 0 && Math.hypot(x - g.pos.x, y - g.pos.y) < 30 * g.scale * g.DS + g.tapPad) {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      g.mouseX = x; g.mouseY = y; g.lastMove = g.t; knockRobot(g, (Math.random() - 0.5) * 9); return true;
    }
    return false;
  }
  function bindInput(g) {
    addEventListener("mousemove", function (e) {
      var cx = e.clientX, cy = e.clientY;
      if (g.pmX > -900) {
        var sp = Math.hypot(cx - g.pmX, cy - g.pmY);
        if (sp > 26) {
          // fast swipe through the robot → knock it down
          if (g.knockT <= 0 && g.hitCD <= 0 && segDist(g.pos.x, g.pos.y, g.pmX, g.pmY, cx, cy) < (36 + 18 * g.scale) * g.DS) {
            g.mouseX = cx; g.mouseY = cy; g.lastMove = g.t; knockRobot(g, (cx - g.pmX) * 0.45);
          }
          // fast swipe through the trend → destroy it
          else if (g.trend && !g.trendEl.hidden) {
            var r = g.trendEl.getBoundingClientRect();
            if (segDist(r.left + r.width / 2, r.top + r.height / 2, g.pmX, g.pmY, cx, cy) < Math.max(r.width, r.height) / 2 + 14) {
              g.mouseX = cx; g.mouseY = cy; g.lastMove = g.t; humanGrab(g);
            }
          }
        }
      }
      g.pmX = cx; g.pmY = cy; g.mouseX = cx; g.mouseY = cy; g.lastMove = g.t;
    }, { passive: true });
    addEventListener("mouseout", function (e) { if (!e.relatedTarget) g.lastMove = -999; }, { passive: true });
    addEventListener("click", function (e) { tryTapHit(g, e.clientX, e.clientY, e); }, true);
    // touch: a tap on the robot/trend hits it; we only swallow the event when it actually lands,
    // so taps elsewhere still scroll/click the page normally
    addEventListener("touchstart", function (e) {
      if (!e.touches || !e.touches.length) return;
      var tch = e.touches[0];
      tryTapHit(g, tch.clientX, tch.clientY, e);
    }, { passive: false });
  }

  Robot.actions = {
    fireBullets: fireBullets, throwBall: throwBall, scheduleAttack: scheduleAttack, runAttack: runAttack,
    resolveBeam: resolveBeam, updateBullets: updateBullets,
    spawnTrend: spawnTrend, clearTrend: clearTrend, humanGrab: humanGrab, updateTrendMotion: updateTrendMotion,
    chaseTarget: chaseTarget, shootAndCatch: shootAndCatch,
    cursorHit: cursorHit, knockRobot: knockRobot, idleTarget: idleTarget, tryTapHit: tryTapHit,
    bindInput: bindInput, segDist: segDist
  };
})();
