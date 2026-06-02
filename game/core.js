/* game/core.js — the orchestrator. One Game instance owns all state + DOM refs; loop() runs the
   per-frame sequence, delegating to Robot.forms / Robot.effects / Robot.actions. Boots at the
   bottom. Loads LAST. Honours prefers-reduced-motion (builds nothing) and print (CSS hides it). */
(function () {
  "use strict";
  var Robot = (window.Robot = window.Robot || {});
  var cfg = Robot.config, FX = Robot.effects, A = Robot.actions, T = Robot.text;

  function Game() {
    var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    var pet = document.getElementById("pet");
    if (!pet || reduce) { this.ok = false; return; }
    var canvas = pet.querySelector(".pet__canvas");
    if (!canvas || !canvas.getContext) { this.ok = false; return; }
    this.ok = true;

    // DOM refs
    this.pet = pet;
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.bubble = pet.querySelector(".pet__bubble");
    this.trendEl = document.getElementById("trend");
    this.fx = document.getElementById("fx");
    this.fxc = (this.fx && this.fx.getContext) ? this.fx.getContext("2d") : null;
    this.rageEl = document.getElementById("rage");   // full-screen orange flash at peak anger
    this._rageTO = 0;

    // a pxl bound to THIS ctx (handed to the pure forms each frame)
    var ctx = this.ctx, U = cfg.U;
    this.pxl = function (x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(Math.round(x * U), Math.round(y * U), Math.ceil(w * U), Math.ceil(h * U)); };

    // viewport
    this.W = innerWidth; this.H = innerHeight;
    this.DS = cfg.dispScale(this.W);
    this.coarse = !!(window.matchMedia && matchMedia("(pointer: coarse)").matches);  // touch → bigger tap targets
    this.tapPad = this.coarse ? 18 : 8;
    var self = this;
    this.sizeFx = function () { if (self.fx) { self.fx.width = self.W; self.fx.height = self.H; } };
    addEventListener("resize", function () { self.W = innerWidth; self.H = innerHeight; self.DS = cfg.dispScale(self.W); self.sizeFx(); }, { passive: true });
    this.sizeFx();

    // motion
    this.pos = { x: this.W * 0.8, y: this.H * 0.48 }; this.tgt = { x: this.pos.x, y: this.pos.y };
    this.prevX = this.pos.x; this.prevY = this.pos.y; this.dir = 1;
    this.mouseX = -999; this.mouseY = -999; this.lastMove = -999; this.pmX = -999; this.pmY = -999;
    this.t = 0;
    // particles + flags
    this.sparks = []; this.beams = []; this.fxp = []; this.bullets = []; this.balls = []; this.debris = []; this.rings = []; this.popups = []; this.fxActive = false; this.fireCD = 0;
    // bubble / quips
    this.bubbleUntil = 0; this.nextQuip = 240; this.lastQuip = -1;
    // home / trend / size
    this.homeTgt = null; this.homeHold = 0;
    this.trend = null; this.trendCD = 220;
    this.scale = 1; this.scaleTarget = 1; this.sizeCD = 120;
    // attack
    this.attackT = 0; this.attackCD = 200; this.attackKind = "bullets"; this.beamAt = 0; this.lockX = 0; this.lockY = 0;
    this.atkPhase = "approach"; this.atkTimer = 0; this.fired = false;
    // knock / anger
    this.krot = 0; this.kvx = 0; this.kvy = 0; this.knockT = 0; this.hitCD = 0; this.angryT = 0;
    this.knockStreak = 0; this.lastKnock = -999;   // rapid-knock counter → peak-rage flash
    // form cycle (robot is the TRUE form; magic morphs robot ↔ critter)
    this.curForm = "robot"; this.morphFlash = 0; this.formCD = 300 + (Robot.rand(0, 240) | 0);
  }

  // peak-anger screen flash: orange tint + faint blur over the whole viewport for ~1.6s
  Game.prototype.rage = function () {
    var el = this.rageEl; if (!el) return;
    el.classList.remove("rage--on");
    void el.offsetWidth;             // reflow → restart the animation if re-triggered
    el.classList.add("rage--on");
    var self = this;
    clearTimeout(this._rageTO);
    this._rageTO = setTimeout(function () { el.classList.remove("rage--on"); }, 2600);
  };

  Game.prototype.say = function (txt, dur) {
    this.bubble.textContent = txt; this.bubble.hidden = false;
    this.bubbleUntil = this.t + (dur || 280); this.nextQuip = this.bubbleUntil + 260 + (Robot.rand(0, 360) | 0);
  };

  // a puff of magic → become form f, hold it, then later morph back (see loop's morph cycle)
  Game.prototype.morphTo = function (f) {
    this.curForm = f; this.morphFlash = cfg.MORPH; FX.magic(this);
    if (T.FORM_LINE[f] && this.knockT <= 0 && this.attackT <= 0 && !this.trend) this.say(Robot.pick(T.FORM_LINE[f]), 240);
  };

  Game.prototype.loop = function () {
    var g = this, col = cfg.col;
    g.t++;
    if (g.hitCD > 0) g.hitCD--;
    if (g.angryT > 0) g.angryT--;
    var recent = (g.t - g.lastMove) < 90;

    // trends spawn reliably on a timer (no trends while angry — it's after YOU)
    if (--g.trendCD <= 0 && !g.trend && g.knockT <= 0 && g.angryT <= 0) A.spawnTrend(g);
    A.updateTrendMotion(g);

    // schedule an attack run
    A.scheduleAttack(g, recent);

    // mode + target
    var mode, lerp = 0.05;
    if (g.knockT > 0) mode = "knock";
    else if (g.trend && g.angryT <= 0) { mode = "chase"; lerp = A.chaseTarget(g); }   // chase ignored while angry
    else if (g.attackT > 0) { mode = "attack"; lerp = A.runAttack(g, recent); }
    else { mode = "idle"; lerp = A.idleTarget(g); }

    // movement
    if (mode === "knock") {
      g.kvy += 0.45; g.pos.x += g.kvx; g.pos.y += g.kvy; g.kvx *= 0.97;
      var gnd = g.H - 30; if (g.pos.y > gnd) { g.pos.y = gnd; g.kvy = (g.kvy > 1.6) ? g.kvy * -0.32 : 0; g.kvx *= 0.6; }
      g.pos.x = Math.max(24, Math.min(g.W - 24, g.pos.x));
      g.krot += (g.knockT > 72 ? 0.3 : (Math.PI / 2 - g.krot) * 0.12);
      if (--g.knockT === 0) { FX.emit(g, 14, 14); g.say(Robot.pick(T.recoverLines), 200); g.kvy = -2.4; }
    } else {
      g.pos.x += (g.tgt.x - g.pos.x) * lerp; g.pos.y += (g.tgt.y - g.pos.y) * lerp;
      if (g.krot !== 0) { g.krot *= 0.7; if (Math.abs(g.krot) < 0.02) g.krot = 0; }
    }
    var dx = g.pos.x - g.prevX, dy = g.pos.y - g.prevY; g.prevX = g.pos.x; g.prevY = g.pos.y;
    var spd = Math.sqrt(dx * dx + dy * dy);
    if (mode === "attack" || mode === "follow") g.dir = (g.mouseX < g.pos.x ? -1 : 1);
    else if (mode === "chase") g.dir = (g.trend.x < g.pos.x ? -1 : 1);
    else if (dx < -0.4) g.dir = -1; else if (dx > 0.4) g.dir = 1;

    A.resolveBeam(g, recent);    // laser fires shortly after locking
    A.updateBullets(g, recent);  // bullets fly + score
    A.shootAndCatch(g);          // trend: shoot + catch (flavor)

    // slow grow / shrink, held for a while — not a pulse
    if (--g.sizeCD <= 0) {
      var r = Math.random();
      g.scaleTarget = r < 0.45 ? 1 : (r < 0.68 ? 1.5 : (r < 0.86 ? 2 : (r < 0.96 ? 2.5 : 0.75)));
      g.sizeCD = 200 + (Robot.rand(0, 320) | 0);
    }
    var eff = g.scaleTarget + ((mode === "attack" && g.atkPhase === "approach" && !g.fired) ? 0.28 : 0);   // charge-up while closing in
    g.scale += (eff - g.scale) * 0.06;
    if (g.scale > 2.5) g.scale = 2.5;   // hard cap at 250%

    if (spd > 2.4 && g.t % 5 === 0) FX.emit(g, 1, 6);

    g.pet.style.transform = "translate(" + (g.pos.x - cfg.HALF) + "px," + (g.pos.y - cfg.HALF) + "px)";  // position only — size is drawn in-canvas
    // keep the bubble a fixed gap above the robot's actual top (scaled) so it never overlaps
    g.bubble.style.bottom = (132 + 24 * g.scale * g.DS) + "px";

    // draw — growth baked into the canvas (ctx.scale) so it never blurs
    g.ctx.clearRect(0, 0, 220, 220);
    var bob = mode === "knock" ? 0 : Math.sin(g.t * 0.05) * (spd > 1 ? 1.1 : 2);
    var lean = mode === "knock" ? 0 : Math.max(-0.18, Math.min(0.18, dx * 0.02));
    // magic transformation cycle: robot ↔ critter only. Morph into a random critter, hold it a
    // while, then magic returns it to the robot, rest, and later morph again.
    g.formCD--;
    if (g.formCD <= 0 && g.knockT <= 0) {
      if (g.curForm === "robot") {
        var nf; do { nf = Robot.pick(cfg.CRITTERS); } while (nf === g.curForm);
        g.morphTo(nf); g.formCD = 420 + (Robot.rand(0, 360) | 0);      // stay a critter ~7–13s
      } else {
        g.morphTo("robot"); g.formCD = 540 + (Robot.rand(0, 600) | 0); // rest as robot ~9–19s
      }
    }
    if (g.morphFlash > 0) g.morphFlash--;
    var mp = 1 - g.morphFlash / cfg.MORPH;                                            // 0→1 over the morph
    var pop = g.morphFlash > 0 ? 0.5 + 0.5 * mp + 0.14 * Math.sin(mp * Math.PI) : 1;   // poof: grow-in + bulge
    g.ctx.save();
    g.ctx.translate(cfg.CX, cfg.CY + bob); g.ctx.rotate(lean + g.krot); g.ctx.scale(g.dir * g.scale * g.DS * pop, g.scale * g.DS * pop); g.ctx.translate(-24, -24);
    var st = mode === "knock" ? "knock" : (g.angryT > 0 ? "mad" : (mode === "attack" || g.beamAt > 0 ? "attack" : (mode === "chase" || /studio/i.test((document.querySelector(".railnav a.active") || {}).textContent || "") ? "happy" : "idle")));
    Robot.forms.draw(g.pxl, col, g.t, g.curForm, st, (g.t % 200 < 7), spd > 1 && mode !== "knock");
    g.ctx.restore();

    FX.renderSparks(g);          // in-canvas sparkles
    FX.renderFx(g, recent);      // fx layer (lasers, bursts, bullets, balls, debris, rings, popups)

    // quips (calm states only)
    if (mode !== "knock" && mode !== "attack" && !g.trend && g.t > g.nextQuip && g.bubble.hidden) {
      var j; do { j = (Math.random() * T.quips.length) | 0; } while (j === g.lastQuip && T.quips.length > 1);
      g.lastQuip = j; g.say(T.quips[j]);
    }
    if (!g.bubble.hidden && g.t > g.bubbleUntil) g.bubble.hidden = true;

    requestAnimationFrame(function () { g.loop(); });
  };

  Robot.Game = Game;

  // boot
  var game = new Game();
  if (game.ok) {
    A.bindInput(game);
    requestAnimationFrame(function () { game.loop(); });
  }
})();
