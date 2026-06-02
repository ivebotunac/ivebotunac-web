/* game/effects.js — efekti: particle factories + the per-frame fx/sparkle render passes.
   Every function takes the game instance `g` and reads/mutates its particle arrays + canvases.
   Robot.effects = { emit, fireBeam, fxBurst, feedback, explode, magic, renderSparks, renderFx } */
(function () {
  "use strict";
  var Robot = (window.Robot = window.Robot || {});
  var cfg = Robot.config;

  function emit(g, n, spread) {
    if (g.sparks.length > 120) return;
    var CX = cfg.CX, CY = cfg.CY, spark = cfg.col.spark;
    for (var i = 0; i < n; i++) { var a = Math.random() * Math.PI * 2, s = 0.3 + Math.random() * 1.2;
      g.sparks.push({ x: CX + (Math.random() - 0.5) * spread, y: CY + (Math.random() - 0.5) * spread, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 0.3, life: 0, max: 22 + Math.random() * 20, c: Robot.pick(spark) }); }
  }
  function fireBeam(g, x1, y1, x2, y2, c) { if (g.fxc) g.beams.push({ x1: x1, y1: y1, x2: x2, y2: y2, life: 0, max: 10, c: c || "#ff5a1f" }); }
  function fxBurst(g, x, y, n, c) { if (!g.fxc) return; for (var i = 0; i < n; i++) { var a = Math.random() * Math.PI * 2, s = 1 + Math.random() * 3; g.fxp.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0, max: 20 + Math.random() * 20, c: c || Robot.pick(cfg.col.spark) }); } }
  // unified impact feedback: flash + shockwave ring + floating label (used by every hit/destroy)
  function feedback(g, x, y, text, c) { fxBurst(g, x, y, 14, c); g.rings.push({ x: x, y: y, life: 0, max: 24, c: c }); g.popups.push({ x: x, y: y, text: text, life: 0, max: 60, c: c }); }
  function explode(g, x, y) {
    if (!g.fxc) return;
    var cs = ["#0c2236", "#36c6e0", "#ff5a1f", "#f5f9fd", "#3b7cc0"];
    for (var i = 0; i < 40; i++) {
      var a = Math.random() * Math.PI * 2, sp = 2 + Math.random() * 7;
      g.debris.push({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 3, sz: 2 + (Math.random() * 5 | 0), c: cs[(Math.random() * cs.length) | 0], life: 0, max: 240 + (Math.random() * 160 | 0), landed: false });
    }
  }
  function magic(g) {
    emit(g, 30, 30);                                   // dense in-canvas sparkle shower
    if (!g.fxc) return;
    fxBurst(g, g.pos.x, g.pos.y, 24, "#9b6bff");        // screen-space magic burst (violet/cyan/white)
    fxBurst(g, g.pos.x, g.pos.y, 16, "#36c6e0");
    fxBurst(g, g.pos.x, g.pos.y, 10, "#ffffff");
    g.rings.push({ x: g.pos.x, y: g.pos.y, life: 0, max: 30, c: "#9b6bff" });
    g.rings.push({ x: g.pos.x, y: g.pos.y, life: 0, max: 22, c: "#ffffff" });
  }

  // in-canvas sparkles (drawn on the main ctx, not the fx layer)
  function renderSparks(g) {
    var ctx = g.ctx;
    for (var i = g.sparks.length - 1; i >= 0; i--) { var p = g.sparks[i]; p.life++; p.x += p.vx; p.y += p.vy; p.vy += 0.015; if (p.life >= p.max) { g.sparks.splice(i, 1); continue; } ctx.globalAlpha = 1 - p.life / p.max; ctx.fillStyle = p.c; var s2 = p.life > p.max * 0.6 ? 1 : 2; ctx.fillRect(Math.round(p.x), Math.round(p.y), s2, s2); }
    ctx.globalAlpha = 1;
  }

  // fx layer: lasers, bursts, bullets, Poké-balls, debris, rings, popups (screen space)
  function renderFx(g, recent) {
    var fxc = g.fxc; if (!fxc) return;
    var W = g.W, H = g.H;
    var anyFx = g.beams.length || g.fxp.length || g.bullets.length || g.balls.length || g.debris.length || g.rings.length || g.popups.length;
    if (anyFx || g.fxActive) fxc.clearRect(0, 0, W, H);
    g.fxActive = !!anyFx;
    for (var b = g.beams.length - 1; b >= 0; b--) { var bm = g.beams[b]; bm.life++; if (bm.life >= bm.max) { g.beams.splice(b, 1); continue; } var al = 1 - bm.life / bm.max; fxc.strokeStyle = bm.c; fxc.globalAlpha = al; fxc.lineWidth = 3; fxc.beginPath(); fxc.moveTo(bm.x1, bm.y1); fxc.lineTo(bm.x2, bm.y2); fxc.stroke(); fxc.globalAlpha = al * 0.5; fxc.lineWidth = 1; fxc.stroke(); }
    fxc.globalAlpha = 1;
    for (var m = 0; m < g.bullets.length; m++) { var bb = g.bullets[m]; fxc.fillStyle = "#ff5a1f"; fxc.fillRect(Math.round(bb.x) - 2, Math.round(bb.y) - 2, 4, 4); fxc.globalAlpha = 0.4; fxc.fillStyle = "#ffd9c7"; fxc.fillRect(Math.round(bb.x - bb.vx) - 1, Math.round(bb.y - bb.vy) - 1, 2, 2); fxc.globalAlpha = 1; }
    // thrown Poké-balls: arc under gravity, spin, "catch" the cursor on contact
    for (var z = g.balls.length - 1; z >= 0; z--) {
      var ba = g.balls[z]; ba.vy += 0.12; ba.x += ba.vx; ba.y += ba.vy; ba.spin += ba.dspin; ba.life++;
      if (recent && Math.hypot(ba.x - g.mouseX, ba.y - g.mouseY) < 42) { Robot.actions.cursorHit(g, g.mouseX, g.mouseY, "GOTCHA!"); fxBurst(g, ba.x, ba.y, 18, "#ffffff"); g.balls.splice(z, 1); continue; }
      if (ba.life > ba.max || ba.x < -28 || ba.x > W + 28 || ba.y > H + 28) { fxBurst(g, ba.x, ba.y, 6, "#e23b2e"); g.balls.splice(z, 1); continue; }
      fxc.save(); fxc.translate(Math.round(ba.x), Math.round(ba.y)); fxc.rotate(ba.spin);
      var R = 16;
      fxc.fillStyle = "#e23b2e"; fxc.beginPath(); fxc.arc(0, 0, R, 0, Math.PI * 2); fxc.fill();   // red shell
      fxc.fillStyle = "#f5f5f5"; fxc.beginPath(); fxc.arc(0, 0, R, 0, Math.PI); fxc.fill();        // white bottom half
      fxc.fillStyle = "#1a1a1a"; fxc.fillRect(-R, -3, R * 2, 6);                                   // black band
      fxc.beginPath(); fxc.arc(0, 0, 6, 0, Math.PI * 2); fxc.fill();                               // button ring
      fxc.fillStyle = "#f5f5f5"; fxc.beginPath(); fxc.arc(0, 0, 3, 0, Math.PI * 2); fxc.fill();    // button center
      fxc.restore();
    }
    for (var f = g.fxp.length - 1; f >= 0; f--) { var q = g.fxp[f]; q.life++; q.x += q.vx; q.y += q.vy; q.vy += 0.04; if (q.life >= q.max) { g.fxp.splice(f, 1); continue; } fxc.globalAlpha = 1 - q.life / q.max; fxc.fillStyle = q.c; var qs = q.life > q.max * 0.6 ? 2 : 3; fxc.fillRect(Math.round(q.x), Math.round(q.y), qs, qs); }
    // debris: explode outward, fall under gravity, pile at the bottom, then fade
    for (var d = g.debris.length - 1; d >= 0; d--) {
      var dd = g.debris[d]; dd.life++;
      if (!dd.landed) { dd.vy += 0.35; dd.x += dd.vx; dd.y += dd.vy;
        if (dd.y >= H - dd.sz) { dd.y = H - dd.sz; dd.vy *= -0.32; dd.vx *= 0.6; if (Math.abs(dd.vy) < 1.1) { dd.landed = true; dd.vy = 0; dd.vx = 0; } } }
      if (dd.life >= dd.max) { g.debris.splice(d, 1); continue; }
      fxc.globalAlpha = dd.life > dd.max - 45 ? (dd.max - dd.life) / 45 : 1;
      fxc.fillStyle = dd.c; fxc.fillRect(Math.round(dd.x), Math.round(dd.y), dd.sz, dd.sz);
    }
    // shockwave rings (human-blue)
    for (var gg = g.rings.length - 1; gg >= 0; gg--) {
      var rg = g.rings[gg]; rg.life++;
      if (rg.life >= rg.max) { g.rings.splice(gg, 1); continue; }
      fxc.globalAlpha = (1 - rg.life / rg.max) * 0.85; fxc.strokeStyle = rg.c || "#0b6bcb"; fxc.lineWidth = 2;
      fxc.beginPath(); fxc.arc(rg.x, rg.y, 8 + rg.life * 2.4, 0, Math.PI * 2); fxc.stroke();
    }
    // floating "DESTROYED" popups
    fxc.textAlign = "center"; fxc.font = "700 15px ui-monospace, SFMono-Regular, Menlo, monospace";
    for (var u = g.popups.length - 1; u >= 0; u--) {
      var pu = g.popups[u]; pu.life++; pu.y -= 0.8;
      if (pu.life >= pu.max) { g.popups.splice(u, 1); continue; }
      fxc.globalAlpha = pu.life > pu.max - 26 ? (pu.max - pu.life) / 26 : 1;
      fxc.fillStyle = pu.c || "#0b6bcb"; fxc.fillText(pu.text, pu.x, pu.y);
    }
    fxc.globalAlpha = 1;
  }

  Robot.effects = { emit: emit, fireBeam: fireBeam, fxBurst: fxBurst, feedback: feedback, explode: explode, magic: magic, renderSparks: renderSparks, renderFx: renderFx };
})();
