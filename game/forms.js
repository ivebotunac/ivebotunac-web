/* game/forms.js — likovi: pure pixel-art draw recipes for the robot + 21 critters.
   No game state: the dispatcher receives a bound `pxl`, the colour palette `col`, and the
   frame counter `t` (used for leg-walk + antenna blink), sets them for the closure, then draws.
   Robot.forms.draw(pxl, col, t, form, state, blink, moving) */
(function () {
  "use strict";
  var Robot = (window.Robot = window.Robot || {});

  // set per-draw by Robot.forms.draw — keeps every draw recipe below dead-simple & verbatim
  var pxl, col, t;

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

  Robot.forms = {
    draw: function (pxl_, col_, t_, form, state, blink, moving) {
      pxl = pxl_; col = col_; t = t_;
      drawForm(form, state, blink, moving);
    }
  };
})();
